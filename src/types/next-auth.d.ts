import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      locationId: string | null
    } & DefaultSession['user']
  }

  interface User {
    role: string
    locationId: string | null
  }
}