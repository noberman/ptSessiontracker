import { resend, emailConfig } from './client'
import { prisma } from '@/lib/prisma'
import type { EmailOptions, EmailLog } from './types'

export class EmailService {
  /**
   * Send an email with automatic logging and error handling
   */
  static async send(options: EmailOptions): Promise<{ success: boolean; data?: any; error?: string }> {
    const startTime = Date.now()
    
    try {
      // Override recipient in development if configured
      const to = emailConfig.devEmailOverride || options.to
      
      // Prepare email data
      const emailData = {
        from: `${emailConfig.from.name} <${emailConfig.from.email}>`,
        to: Array.isArray(to) ? to : [to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo || emailConfig.replyTo,
      }

      // Log email attempt
      const emailLog = await this.logEmail({
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        status: 'pending',
        template: options.template,
        metadata: options.metadata,
      })

      // In development without API key, just log the email
      if (emailConfig.isDevelopment) {
        console.log('📧 Email (Dev Mode - Not Sent):', {
          to: emailData.to,
          subject: emailData.subject,
          template: options.template,
        })
        
        // Update log as success in dev
        await this.updateEmailLog(emailLog.id, {
          status: 'success',
          sentAt: new Date(),
          responseTime: Date.now() - startTime,
          messageId: 'dev-mode-' + Date.now(),
        })

        return { success: true, data: { id: 'dev-mode' } }
      }

      // Send email via Resend
      const response = await resend.emails.send(emailData)

      // Update log with success
      await this.updateEmailLog(emailLog.id, {
        status: 'success',
        sentAt: new Date(),
        responseTime: Date.now() - startTime,
        messageId: response.id,
      })

      return { success: true, data: response }
    } catch (error: any) {
      console.error('Email send error:', error)
      
      // Log the error
      if (options.metadata?.emailLogId) {
        await this.updateEmailLog(options.metadata.emailLogId, {
          status: 'failed',
          error: error.message,
          responseTime: Date.now() - startTime,
        })
      }

      return { 
        success: false, 
        error: error.message || 'Failed to send email' 
      }
    }
  }

  /**
   * Send email with retry logic
   */
  static async sendWithRetry(
    options: EmailOptions, 
    maxRetries: number = 3
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    let lastError: string = ''
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.send(options)
      
      if (result.success) {
        return result
      }
      
      lastError = result.error || 'Unknown error'
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    return { success: false, error: lastError }
  }

  /**
   * Log email to database
   */
  private static async logEmail(data: {
    to: string
    subject: string
    status: string
    template?: string
    metadata?: any
  }): Promise<EmailLog> {
    const emailLog = await prisma.emailLog.create({
      data: {
        to: data.to,
        subject: data.subject,
        status: data.status,
        template: data.template,
        metadata: data.metadata,
      },
    })
    
    return emailLog as EmailLog
  }

  /**
   * Update email log
   */
  private static async updateEmailLog(
    id: string,
    data: {
      status?: string
      sentAt?: Date
      responseTime?: number
      messageId?: string
      error?: string
    }
  ): Promise<void> {
    await prisma.emailLog.update({
      where: { id },
      data: {
        status: data.status,
        sentAt: data.sentAt,
        responseTime: data.responseTime,
        messageId: data.messageId,
        error: data.error,
      },
    })
  }

  /**
   * Send a test email to verify configuration
   */
  static async sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
    return this.send({
      to,
      subject: 'PT Session Tracker - Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Test Email Successful! ✅</h2>
          <p>Your email configuration is working correctly.</p>
          <p style="color: #666; font-size: 14px;">
            Sent from: ${emailConfig.from.email}<br>
            Environment: ${process.env.NODE_ENV || 'development'}<br>
            Timestamp: ${new Date().toISOString()}
          </p>
        </div>
      `,
      text: 'Test Email Successful! Your email configuration is working correctly.',
      template: 'test',
    })
  }
}