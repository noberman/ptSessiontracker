import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
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
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('🔐 AUTH: Authorize function called')
        console.log('📧 AUTH: Email provided:', credentials?.email)
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ AUTH: Missing credentials')
          return null
        }

        console.log('🔍 AUTH: Looking up user in database...')
        let user
        try {
          user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
            include: {
              location: true,
            },
          })
        } catch (dbError) {
          console.error('❌ AUTH: Database error:', dbError)
          return null
        }

        console.log('👤 AUTH: User found:', user ? 'Yes' : 'No')
        if (user) {
          console.log('📋 AUTH: User details:', {
            email: user.email,
            name: user.name,
            role: user.role,
            active: user.active,
            hasPassword: !!user.password,
            passwordLength: user.password?.length
          })
        }

        if (!user || !user.active) {
          console.log('❌ AUTH: User not found or inactive')
          return null
        }

        console.log('🔑 AUTH: Comparing passwords...')
        const isPasswordValid = await compare(
          credentials.password,
          user.password
        )

        console.log('🔐 AUTH: Password valid:', isPasswordValid)

        if (!isPasswordValid) {
          console.log('❌ AUTH: Invalid password')
          return null
        }

        console.log('✅ AUTH: Authentication successful!')
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          locationId: user.locationId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      console.log('🎫 JWT Callback called')
      console.log('🎫 JWT: Has user?', !!user)
      
      if (user) {
        console.log('🎫 JWT: Creating token for user:', user.email)
        return {
          ...token,
          id: user.id,
          role: (user as any).role,
          locationId: (user as any).locationId,
        }
      }
      console.log('🎫 JWT: Returning existing token')
      return token
    },
    async session({ session, token }) {
      console.log('📊 Session Callback called')
      console.log('📊 Session: Token ID:', token.id)
      
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          locationId: token.locationId as string | null,
        },
      }
    },
  },
}