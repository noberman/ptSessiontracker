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
    async jwt({ token, user, account }) {
      if (user) {
        // For Google OAuth, we need to check if user exists in DB
        if (account?.provider === 'google') {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            include: { organization: true }
          })
          
          if (dbUser) {
            // Existing user logging in with Google
            return {
              ...token,
              id: dbUser.id,
              role: dbUser.role,
              locationId: dbUser.locationId,
              organizationId: dbUser.organizationId,
            }
          } else {
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
          // Credentials login
          return {
            ...token,
            id: user.id,
            role: (user as any).role,
            locationId: (user as any).locationId,
            organizationId: (user as any).organizationId,
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          locationId: token.locationId as string | null,
          organizationId: token.organizationId as string | null,
          needsOnboarding: token.needsOnboarding as boolean | undefined,
        },
      }
    },
  },
}