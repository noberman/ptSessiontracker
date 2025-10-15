import { NextAuthOptions } from 'next-auth'
import { JWT } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { validateTempToken } from '@/lib/auth/super-admin'

export const authOptions: NextAuthOptions = {
  // Note: PrismaAdapter is not used with JWT strategy
  // adapter: PrismaAdapter(prisma) as any,
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
        console.log('🔐 Credentials login attempt for:', credentials?.email)
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials')
          return null
        }

        try {
          // Find ALL users with this email (could be in multiple orgs)
          const users = await prisma.user.findMany({
            where: {
              email: credentials.email,
              active: true, // Only check active accounts
            },
            include: {
              organization: true,
            },
          })

          console.log(`👤 Found ${users.length} user(s) with email:`, credentials.email)

          if (users.length === 0) {
            console.log('❌ No active users found with this email')
            return null
          }

          // Try to find users whose password matches
          const validUsers = []
          for (const user of users) {
            console.log(`🔐 Checking password for user in org: ${user.organization?.name || 'No org'}`)
            
            const isPasswordValid = await compare(
              credentials.password,
              user.password
            )

            if (isPasswordValid) {
              console.log('✅ Password valid for org:', user.organization?.name)
              validUsers.push(user)
            }
          }

          if (validUsers.length > 0) {
            const user = validUsers[0] // Use first valid user as primary
            console.log('✅ Login successful for:', user.email, 'Role:', user.role, 'Org:', user.organization?.name)
            
            // IMPORTANT: Only include organizations where the password matched
            // This prevents unauthorized access to orgs with different passwords
            const availableOrgs = validUsers
              .filter(u => u.organizationId !== null) // Filter out any without org ID
              .map(u => ({
                orgId: u.organizationId!,
                userId: u.id,
                orgName: u.organization?.name || 'Unknown',
                role: u.role as string
              }))
              
            console.log('🔐 Credentials Provider - Returning user data:', {
              id: user.id,
              email: user.email,
              organizationId: user.organizationId,
              organizationName: user.organization?.name,
              availableOrgsCount: availableOrgs.length,
              availableOrgs: availableOrgs
            })
            
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              organizationId: user.organizationId,
              availableOrgs, // Include all available orgs for switching
            }
          }

          // If we get here, no passwords matched
          console.log('❌ Invalid password for all accounts with this email')
          return null
        } catch (error) {
          console.error('❌ Auth error:', error)
          throw error
        }
      },
    }),
    // Temporary token provider for super admin Login As feature
    CredentialsProvider({
      id: 'temp-token',
      name: 'temp-token',
      credentials: {
        token: { label: 'Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.token) {
          return null
        }

        try {
          const { user, admin, metadata } = await validateTempToken(credentials.token)
          
          // Return user data for temporary login
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
          } as any
        } catch (error) {
          console.error('Temp token validation error:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger }): Promise<JWT> {
      // Commented out verbose logging - uncomment for debugging
      // console.log('🔐 JWT Callback:', {
      //   trigger,
      //   hasUser: !!user,
      //   hasToken: !!token,
      //   provider: account?.provider,
      //   tokenEmail: token.email,
      //   isImpersonating: token.isImpersonating,
      //   impersonatedBy: token.impersonatedBy
      // })
      
      // Always refresh user data when needed
      if (trigger === 'update' || (token && token.email)) {
        // Commented out verbose logging
        // console.log('🔍 JWT Callback - Token refresh triggered:', {
        //   trigger,
        //   hasEmail: !!token.email,
        //   hasAvailableOrgs: !!(token.availableOrgs && token.availableOrgs.length > 0),
        //   availableOrgsCount: token.availableOrgs?.length || 0,
        //   hasOrganizationId: !!token.organizationId,
        //   organizationId: token.organizationId,
        //   organizationName: token.organizationName
        // })
        
        // Check if there's a pending org switch FIRST (from cookies)
        let pendingOrgSwitch: string | undefined
        try {
          const { cookies } = await import('next/headers')
          const cookieStore = await cookies()
          pendingOrgSwitch = cookieStore.get('pending-org-switch')?.value
          if (pendingOrgSwitch) {
            console.log('🚀 Found pending org switch to:', pendingOrgSwitch)
          }
        } catch (e) {
          // Cookies might not be available in all contexts
          console.log('⚠️ Could not check for pending org switch cookie:', e instanceof Error ? e.message : 'Unknown error')
        }
        
        // Check if we need to refresh the available orgs
        // Refresh if: pending org switch, no availableOrgs, or refresh parameter in trigger
        const shouldRefresh = pendingOrgSwitch || 
                             !token.availableOrgs || 
                             token.availableOrgs.length === 0 ||
                             trigger === 'update'
        
        if (!shouldRefresh) {
          // console.log('📌 No refresh needed, keeping existing multi-org data')
          // Ensure token has all required JWT fields
          return {
            ...token,
            id: token.id || '',
            role: token.role || 'pending',
            organizationId: token.organizationId || null,
          }
        }
        
        // console.log('🔄 Fetching fresh user data from database (org switch or missing data)')
        // Fetch ALL users with this email to build availableOrgs
        const dbUsers = await prisma.user.findMany({
          where: { email: token.email as string, active: true },
          include: { organization: true }
        })
        
        // console.log('🔍 Database query result:', {
        //   foundCount: dbUsers.length,
        //   email: token.email,
        //   organizations: dbUsers.map(u => u.organization?.name)
        // })
        
        if (dbUsers.length > 0) {
          // Use pending org switch if available, otherwise current org from token, or default to first
          const targetOrgId = pendingOrgSwitch || token.organizationId
          
          // Clear the cookie if it was used
          if (pendingOrgSwitch) {
            try {
              const { cookies } = await import('next/headers')
              const cookieStore = await cookies()
              cookieStore.delete('pending-org-switch')
              console.log('✅ Cleared pending org switch cookie')
            } catch (e) {
              console.log('⚠️ Could not clear cookie:', e instanceof Error ? e.message : 'Unknown error')
            }
          }
          
          console.log('🔄 Finding user for orgId:', targetOrgId)
          const currentUser = dbUsers.find(u => u.organizationId === targetOrgId) || dbUsers[0]
          console.log('🔄 Selected user:', {
            id: currentUser.id,
            org: currentUser.organization?.name,
            orgId: currentUser.organizationId,
            role: currentUser.role
          })
          
          // Build list of available organizations
          const availableOrgs = dbUsers
            .filter(u => u.organizationId !== null)
            .map(u => ({
              orgId: u.organizationId!,
              userId: u.id,
              orgName: u.organization?.name || 'Unknown',
              role: u.role as string
            }))
          
          console.log('🔄 Refreshing token with multi-org data:', {
            email: currentUser.email,
            currentOrg: currentUser.organization?.name,
            availableOrgsCount: availableOrgs.length
          })
          
          return {
            ...token,
            id: currentUser.id,
            role: currentUser.role,
            organizationId: currentUser.organizationId,
            organizationName: currentUser.organization?.name || null,
            onboardingCompletedAt: currentUser.onboardingCompletedAt,
            organizationOnboardingCompletedAt: currentUser.organization?.onboardingCompletedAt,
            availableOrgs // Include all available orgs
          }
        } else {
          console.log('⚠️ No user found in database for email:', token.email)
          console.log('⚠️ Returning token without organization data')
          // Ensure token has all required JWT fields even when no user found
          return {
            ...token,
            id: token.id || '',
            role: token.role || 'pending',
            organizationId: token.organizationId || null,
          }
        }
      }
      
      if (user) {
        // For Google OAuth, we need to check if user exists in DB
        if (account?.provider === 'google') {
          // Find ALL users with this email across organizations
          const dbUsers = await prisma.user.findMany({
            where: { email: user.email!, active: true },
            include: { organization: true }
          })
          
          if (dbUsers.length > 0) {
            console.log(`✅ Google user found in ${dbUsers.length} organization(s):`, user.email)
            
            // Get last selected org from the token (passed from client)
            // or default to first organization
            const lastOrgId = token.lastOrganizationId
            const selectedUser = lastOrgId 
              ? dbUsers.find(u => u.organizationId === lastOrgId) || dbUsers[0]
              : dbUsers[0]
            
            // Build list of available organizations
            const availableOrgs = dbUsers
              .filter(u => u.organizationId !== null)
              .map(u => ({
                orgId: u.organizationId!,
                userId: u.id,
                orgName: u.organization?.name || 'Unknown',
                role: u.role as string
              }))
            
            console.log('🏢 Selected org:', selectedUser.organization?.name, 'Available:', availableOrgs.length)
            
            return {
              ...token,
              id: selectedUser.id,
              email: user.email,
              name: user.name || selectedUser.name,
              role: selectedUser.role,
              organizationId: selectedUser.organizationId,
              organizationName: selectedUser.organization?.name || null,
              onboardingCompletedAt: selectedUser.onboardingCompletedAt,
              organizationOnboardingCompletedAt: selectedUser.organization?.onboardingCompletedAt,
              availableOrgs, // Store all available organizations
            }
          } else {
            console.log('🆕 New Google user:', user.email)
            // New user - they'll need to complete signup
            return {
              ...token,
              id: user.id || token.id || '',
              email: user.email,
              name: user.name,
              role: token.role || 'pending',
                organizationId: token.organizationId || null,
              needsOnboarding: true,
            }
          }
        } else {
          // Credentials login - fetch full user data
          // console.log('🔑 JWT Callback - Processing credentials login for user.id:', user.id)
          // console.log('🔑 JWT Callback - User object from credentials:', {
          //   hasId: !!user.id,
          //   hasRole: !!(user as any).role,
          //   hasOrganizationId: !!(user as any).organizationId,
          //   organizationId: (user as any).organizationId,
          //   availableOrgsCount: (user as any).availableOrgs?.length || 0,
          //   provider: account?.provider
          // })
          
          // For temp-token (super admin Login As), fetch organization directly
          // since there might not be a User record in that org
          let organizationData = null
          if (account?.provider === 'temp-token' && (user as any).organizationId) {
            organizationData = await prisma.organization.findUnique({
              where: { id: (user as any).organizationId }
            })
            console.log('🔑 Temp token login - fetched org directly:', {
              orgId: organizationData?.id,
              orgName: organizationData?.name,
              orgOnboardingCompleted: organizationData?.onboardingCompletedAt
            })
          }
          
          const dbUser = await prisma.user.findFirst({
            where: { id: user.id },
            include: { organization: true }
          })
          
          console.log('📧 Credentials login for:', dbUser?.email || (user as any).email, {
            userOnboardingCompletedAt: dbUser?.onboardingCompletedAt,
            orgOnboardingCompletedAt: dbUser?.organization?.onboardingCompletedAt || organizationData?.onboardingCompletedAt,
            dbOrganizationId: dbUser?.organizationId || (user as any).organizationId,
            dbOrganizationName: dbUser?.organization?.name || organizationData?.name
          })
          
          const tokenData = {
            ...token,
            id: user.id,
            role: (user as any).role,
            organizationId: (user as any).organizationId,
            organizationName: dbUser?.organization?.name || organizationData?.name || null,
            onboardingCompletedAt: dbUser?.onboardingCompletedAt || null,
            organizationOnboardingCompletedAt: dbUser?.organization?.onboardingCompletedAt || organizationData?.onboardingCompletedAt || null,
            availableOrgs: (user as any).availableOrgs || [], // Pass through available orgs
          }
          
          console.log('🎫 JWT Callback - Returning token data:', {
            id: tokenData.id,
            organizationId: tokenData.organizationId,
            organizationName: tokenData.organizationName,
            availableOrgsCount: tokenData.availableOrgs.length
          })
          
          return tokenData
        }
      }
      // Ensure token has all required JWT fields
      return {
        ...token,
        id: token.id || '',
        role: token.role || 'pending',
        locationId: token.locationId || null,
        organizationId: token.organizationId || null,
      }
    },
    async session({ session, token }) {
      // Commented out verbose logging
      // console.log('🎯 Session Callback - Token data:', {
      //   hasId: !!token.id,
      //   hasRole: !!token.role,
      //   hasOrganizationId: !!token.organizationId,
      //   organizationId: token.organizationId,
      //   organizationName: token.organizationName,
      //   availableOrgsCount: (token.availableOrgs as any)?.length || 0,
      //   availableOrgs: token.availableOrgs
      // })
      
      const enrichedSession = {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          organizationId: token.organizationId as string | null,
          organizationName: token.organizationName as string | null | undefined,
          onboardingCompletedAt: token.onboardingCompletedAt as Date | null | undefined,
          organizationOnboardingCompletedAt: token.organizationOnboardingCompletedAt as Date | null | undefined,
          needsOnboarding: token.needsOnboarding as boolean | undefined,
          availableOrgs: token.availableOrgs as Array<{
            orgId: string
            userId: string
            orgName: string
            role: string
          }> | undefined,
        },
      }
      
      // Commented out verbose session logging to reduce clutter
      // console.log('📋 Session Callback:', {
      //   email: enrichedSession.user.email,
      //   role: enrichedSession.user.role,
      //   onboardingCompletedAt: enrichedSession.user.onboardingCompletedAt,
      //   organizationId: enrichedSession.user.organizationId
      // })
      
      return enrichedSession
    },
  },
}