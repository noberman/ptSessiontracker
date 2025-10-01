import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      locationId: string | null
      organizationId: string | null
      organizationName?: string | null
      onboardingCompletedAt?: Date | null
      organizationOnboardingCompletedAt?: Date | null
      isImpersonating?: boolean
      impersonatedBy?: string
      tempToken?: string
      availableOrgs?: Array<{
        orgId: string
        userId: string
        orgName: string
        role: string
      }>
    } & DefaultSession['user']
  }

  interface User {
    role: string
    locationId: string | null
    organizationId: string | null
    organizationName?: string | null
    onboardingCompletedAt?: Date | null
    organizationOnboardingCompletedAt?: Date | null
    isImpersonating?: boolean
    impersonatedBy?: string
    tempToken?: string
    availableOrgs?: Array<{
      orgId: string
      userId: string
      orgName: string
      role: string
    }>
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    locationId: string | null
    organizationId: string | null
    organizationName?: string | null
    onboardingCompletedAt?: Date | null
    organizationOnboardingCompletedAt?: Date | null
    isImpersonating?: boolean
    impersonatedBy?: string
    tempToken?: string
    lastOrganizationId?: string
    availableOrgs?: Array<{
      orgId: string
      userId: string
      orgName: string
      role: string
    }>
  }
}