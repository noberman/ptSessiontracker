import * as React from 'react'
import {
  Button,
  Column,
  Heading,
  Hr,
  Row,
  Section,
  Text,
} from '@react-email/components'
import { BaseEmailTemplate } from './base'
import type { SessionValidationEmailData } from '../types'

export const SessionValidationEmail: React.FC<SessionValidationEmailData> = ({
  clientName,
  trainerName,
  sessionDate,
  location,
  sessionValue,
  validationUrl,
  expiryDays,
}) => {
  const formattedDate = new Date(sessionDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const formattedTime = new Date(sessionDate).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <BaseEmailTemplate
      preview={`Please confirm your training session with ${trainerName}`}
    >
      <Heading style={heading}>
        Hi {clientName}! 👋
      </Heading>
      
      <Text style={paragraph}>
        Please confirm your training session:
      </Text>

      <Section style={sessionBox}>
        <Row style={sessionRow}>
          <Column style={sessionLabel}>📅 Date:</Column>
          <Column style={sessionValue}>{formattedDate}</Column>
        </Row>
        <Row style={sessionRow}>
          <Column style={sessionLabel}>⏰ Time:</Column>
          <Column style={sessionValue}>{formattedTime}</Column>
        </Row>
        <Row style={sessionRow}>
          <Column style={sessionLabel}>👤 Trainer:</Column>
          <Column style={sessionValue}>{trainerName}</Column>
        </Row>
        <Row style={sessionRow}>
          <Column style={sessionLabel}>📍 Location:</Column>
          <Column style={sessionValue}>{location}</Column>
        </Row>
        <Row style={sessionRow}>
          <Column style={sessionLabel}>💰 Session Value:</Column>
          <Column style={sessionValue}>${sessionValue.toFixed(2)}</Column>
        </Row>
      </Section>

      <Section style={buttonContainer}>
        <Button
          style={button}
          href={validationUrl}
        >
          Confirm Session
        </Button>
      </Section>

      <Text style={expiry}>
        ⚠️ This link expires in {expiryDays} days
      </Text>

      <Hr style={hr} />

      <Text style={footer}>
        If you didn't attend this session or have any questions, 
        please contact your trainer or gym management.
      </Text>
    </BaseEmailTemplate>
  )
}

// Styles
const heading = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#1a1a1a',
  margin: '0 0 20px',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#333',
  margin: '0 0 20px',
}

const sessionBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
}

const sessionRow = {
  marginBottom: '12px',
}

const sessionLabel = {
  fontSize: '14px',
  color: '#697386',
  width: '120px',
  fontWeight: '500',
}

const sessionValue = {
  fontSize: '14px',
  color: '#1a1a1a',
  fontWeight: '600',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#5469d4',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}

const expiry = {
  fontSize: '14px',
  color: '#ff9800',
  textAlign: 'center' as const,
  margin: '20px 0',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '24px 0',
}

const footer = {
  fontSize: '14px',
  color: '#697386',
  lineHeight: '24px',
}

export default SessionValidationEmail