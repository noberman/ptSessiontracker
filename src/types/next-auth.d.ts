import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      locationId: string | null
      organizationId: string | null
    } & DefaultSession['user']
  }

  interface User {
    role: string
    locationId: string | null
    organizationId: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    locationId: string | null
    organizationId: string | null
  }
}