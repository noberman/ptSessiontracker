import * as React from 'react'
import {
  Column,
  Heading,
  Hr,
  Row,
  Section,
  Text,
} from '@react-email/components'
import { BaseEmailTemplate } from './base'
import type { AppointmentReminderEmailData } from '../types'
import type { CSSProperties } from 'react'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export const AppointmentReminderEmail: React.FC<AppointmentReminderEmailData> = ({
  recipientName,
  appointmentType,
  scheduledAt,
  duration,
  trainerName,
  locationName,
  orgTimezone,
}) => {
  const zonedDate = toZonedTime(scheduledAt, orgTimezone)
  const formattedDate = format(zonedDate, 'EEEE, MMMM d, yyyy')
  const formattedTime = format(zonedDate, 'h:mm a')
  const typeLabel = appointmentType === 'FITNESS_ASSESSMENT' ? 'Fitness Assessment' : 'Session'

  return (
    <BaseEmailTemplate
      preview={`Reminder: Your ${typeLabel.toLowerCase()} with ${trainerName} is tomorrow`}
    >
      <Heading style={heading}>
        Reminder: You have an appointment tomorrow
      </Heading>

      <Text style={paragraph}>
        Hi {recipientName}, this is a reminder about your upcoming appointment:
      </Text>

      <Section style={detailBox}>
        <Row style={detailRow}>
          <Column style={detailLabel}>Type:</Column>
          <Column style={detailValue}>{typeLabel}</Column>
        </Row>
        <Row style={detailRow}>
          <Column style={detailLabel}>Date:</Column>
          <Column style={detailValue}>{formattedDate}</Column>
        </Row>
        <Row style={detailRow}>
          <Column style={detailLabel}>Time:</Column>
          <Column style={detailValue}>{formattedTime}</Column>
        </Row>
        <Row style={detailRow}>
          <Column style={detailLabel}>Duration:</Column>
          <Column style={detailValue}>{duration} minutes</Column>
        </Row>
        <Row style={detailRow}>
          <Column style={detailLabel}>Trainer:</Column>
          <Column style={detailValue}>{trainerName}</Column>
        </Row>
        <Row style={detailRow}>
          <Column style={detailLabel}>Location:</Column>
          <Column style={detailValue}>{locationName}</Column>
        </Row>
      </Section>

      <Hr style={hr} />

      <Text style={footer}>
        If you need to reschedule, please contact your trainer or gym management.
      </Text>
    </BaseEmailTemplate>
  )
}

const heading: CSSProperties = {
  fontSize: '24px',
  fontWeight: 600,
  color: '#1a1a1a',
  margin: '0 0 20px',
}

const paragraph: CSSProperties = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#333',
  margin: '0 0 20px',
}

const detailBox: CSSProperties = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
}

const detailRow: CSSProperties = {
  marginBottom: '12px',
}

const detailLabel: CSSProperties = {
  fontSize: '14px',
  color: '#697386',
  width: '120px',
  fontWeight: 500,
}

const detailValue: CSSProperties = {
  fontSize: '14px',
  color: '#1a1a1a',
  fontWeight: 600,
}

const hr: CSSProperties = {
  borderColor: '#e6ebf1',
  margin: '24px 0',
}

const footer: CSSProperties = {
  fontSize: '14px',
  color: '#697386',
  lineHeight: '24px',
}

export default AppointmentReminderEmail
