export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  template?: string
  metadata?: Record<string, any>
}

export interface EmailLog {
  id: string
  to: string
  subject: string
  status: 'pending' | 'success' | 'failed'
  template?: string | null
  metadata?: any
  sentAt?: Date | null
  messageId?: string | null
  error?: string | null
  responseTime?: number | null
  createdAt: Date
  updatedAt?: Date
}

export interface SessionValidationEmailData {
  clientName: string
  trainerName: string
  sessionDate: Date
  createdAt: Date
  location: string
  sessionValue: number
  validationUrl: string
  expiryDays: number
  orgTimezone: string
}

export interface ReminderEmailData {
  clientName: string
  sessionsCount: number
  validationUrls: string[]
  daysUntilExpiry: number
}