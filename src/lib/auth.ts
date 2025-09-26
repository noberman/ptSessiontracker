import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
          include: {
            location: true,
            organization: true,
          },
        })

        if (!user || !user.active) {
          return null
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          locationId: user.locationId,
          organizationId: user.organizationId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      console.log('🔐 JWT Callback:', {
        trigger,
        hasUser: !!user,
        hasToken: !!token,
        provider: account?.provider,
        tokenEmail: token.email
      })
      
      // Always refresh user data when needed
      if (trigger === 'update' || (token && token.email)) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          include: { organization: true }
        })
        
        if (dbUser) {
          console.log('🔄 Refreshing token data for:', dbUser.email, {
            onboardingCompletedAt: dbUser.onboardingCompletedAt
          })
          
          return {
            ...token,
            id: dbUser.id,
            role: dbUser.role,
            locationId: dbUser.locationId,
            organizationId: dbUser.organizationId,
            organizationName: dbUser.organization?.name || null,
            onboardingCompletedAt: dbUser.onboardingCompletedAt,
          }
        }
      }
      
      if (user) {
        // For Google OAuth, we need to check if user exists in DB
        if (account?.provider === 'google') {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            include: { organization: true }
          })
          
          if (dbUser) {
            console.log('✅ Google user found in DB:', dbUser.email)
            // Existing user logging in with Google
            return {
              ...token,
              id: dbUser.id,
              role: dbUser.role,
              locationId: dbUser.locationId,
              organizationId: dbUser.organizationId,
              organizationName: dbUser.organization?.name || null,
              onboardingCompletedAt: dbUser.onboardingCompletedAt,
            }
          } else {
            console.log('🆕 New Google user:', user.email)
            // New user - they'll need to complete signup
            return {
              ...token,
              id: user.id,
              email: user.email,
              name: user.name,
              needsOnboarding: true,
            }
          }
        } else {
          // Credentials login - fetch full user data
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: { organization: true }
          })
          
          console.log('📧 Credentials login for:', dbUser?.email, {
            onboardingCompletedAt: dbUser?.onboardingCompletedAt
          })
          
          return {
            ...token,
            id: user.id,
            role: (user as any).role,
            locationId: (user as any).locationId,
            organizationId: (user as any).organizationId,
            organizationName: dbUser?.organization?.name || null,
            onboardingCompletedAt: dbUser?.onboardingCompletedAt || null,
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      const enrichedSession = {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          locationId: token.locationId as string | null,
          organizationId: token.organizationId as string | null,
          organizationName: token.organizationName as string | null | undefined,
          onboardingCompletedAt: token.onboardingCompletedAt as Date | null | undefined,
          needsOnboarding: token.needsOnboarding as boolean | undefined,
        },
      }
      
      console.log('📋 Session Callback:', {
        email: enrichedSession.user.email,
        role: enrichedSession.user.role,
        onboardingCompletedAt: enrichedSession.user.onboardingCompletedAt,
        organizationId: enrichedSession.user.organizationId
      })
      
      return enrichedSession
    },
  },
}