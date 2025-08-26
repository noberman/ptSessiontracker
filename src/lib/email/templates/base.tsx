import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Html as EmailHtml,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface BaseEmailTemplateProps {
  preview: string
  children: React.ReactNode
  footerText?: string
}

export const BaseEmailTemplate: React.FC<BaseEmailTemplateProps> = ({
  preview,
  children,
  footerText = 'PT Session Tracker',
}) => {
  return (
    <EmailHtml>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerText}>PT Session Tracker</Text>
          </Section>
          
          <Section style={content}>
            {children}
          </Section>
          
          <Section style={footer}>
            <Text style={footerTextStyle}>
              {footerText}
            </Text>
            <Text style={footerSubtext}>
              © {new Date().getFullYear()} PT Session Tracker. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </EmailHtml>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const header = {
  padding: '24px 24px 0',
  borderBottom: '1px solid #e6ebf1',
}

const headerText = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#1a1a1a',
  margin: '0 0 20px',
}

const content = {
  padding: '24px',
}

const footer = {
  padding: '24px',
  borderTop: '1px solid #e6ebf1',
}

const footerTextStyle = {
  fontSize: '14px',
  color: '#697386',
  margin: '0 0 4px',
}

const footerSubtext = {
  fontSize: '12px',
  color: '#8898aa',
  margin: '0',
}

export default BaseEmailTemplate