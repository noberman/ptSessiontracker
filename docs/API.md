# API Documentation

## Overview
This document outlines the API specifications for the PT Session Tracker system, including email service integration, data import/export endpoints, and third-party service configurations.

## Email Service Integration

### Provider: SendGrid/Resend
The system uses either SendGrid or Resend for transactional emails. Configure via environment variables.

### Email API Configuration
```typescript
// Email Service Configuration
interface EmailConfig {
  provider: 'sendgrid' | 'resend'
  apiKey: string
  fromAddress: string
  replyTo: string
  sandboxMode: boolean // For development
}
```

### Email Endpoints

#### Send Validation Email
```
POST /api/email/validation
Content-Type: application/json

{
  "sessionId": "string",
  "clientEmail": "string",
  "clientName": "string",
  "trainerName": "string",
  "sessionDate": "ISO 8601",
  "sessionTime": "string",
  "location": "string",
  "sessionValue": number,
  "validationToken": "string"
}
```

#### Send Reminder Email
```
POST /api/email/reminder
Content-Type: application/json

{
  "sessionId": "string",
  "clientEmail": "string",
  "reminderType": "first" | "final",
  "daysUntilExpiry": number
}
```

### Email Templates

#### Session Validation Email
- **Subject**: "Please confirm your training session with {trainerName}"
- **Priority**: High
- **Retry**: 3 attempts with exponential backoff

#### Reminder Email
- **Subject**: "Reminder: Please confirm your training session"
- **Priority**: Normal
- **Schedule**: 24 hours and 7 days after session

## Session Validation API

### Validate Session
```
GET /api/sessions/validate/{token}
Response: HTML validation page

POST /api/sessions/validate/{token}
Response: 
{
  "success": boolean,
  "message": "string",
  "sessionId": "string"
}
```

### Validation Rules
- Token expires after 30 days
- One-time use only
- No authentication required
- Rate limited to 10 attempts per IP per hour

## Glofox Data Reconciliation

### Import Format (CSV)
Manual import only in MVP - no direct API integration.

```csv
client_name,client_email,package_name,sessions_remaining,package_value
John Doe,john@example.com,12 Session Pack,8,1200.00
```

### Import Endpoint
```
POST /api/import/glofox
Content-Type: multipart/form-data

file: CSV file
dryRun: boolean (optional, default false)
```

### Import Response
```json
{
  "success": boolean,
  "imported": number,
  "failed": number,
  "errors": [
    {
      "row": number,
      "error": "string"
    }
  ]
}
```

## Core API Endpoints

### Authentication
```
POST /api/auth/signin
POST /api/auth/signout
GET /api/auth/session
```

### Users
```
GET    /api/users           # List users (paginated)
GET    /api/users/{id}      # Get user details
POST   /api/users           # Create user
PUT    /api/users/{id}      # Update user
DELETE /api/users/{id}      # Soft delete user
```

### Clients
```
GET    /api/clients         # List clients (paginated)
GET    /api/clients/{id}    # Get client details
POST   /api/clients         # Create client
PUT    /api/clients/{id}    # Update client
DELETE /api/clients/{id}    # Soft delete client
POST   /api/clients/import  # Bulk import
```

### Sessions
```
GET    /api/sessions        # List sessions (filtered)
GET    /api/sessions/{id}   # Get session details
POST   /api/sessions        # Create session
PUT    /api/sessions/{id}   # Update session
DELETE /api/sessions/{id}   # Cancel session
GET    /api/sessions/stats  # Session statistics
```

### Packages
```
GET    /api/packages        # List packages
GET    /api/packages/{id}   # Get package details
POST   /api/packages        # Create package
PUT    /api/packages/{id}   # Update package
DELETE /api/packages/{id}   # Soft delete package
```

### Locations
```
GET    /api/locations       # List locations
GET    /api/locations/{id}  # Get location details
POST   /api/locations       # Create location
PUT    /api/locations/{id}  # Update location
DELETE /api/locations/{id}  # Soft delete location
```

### Commission & Reports
```
GET  /api/commission/summary          # Monthly summary
GET  /api/commission/trainer/{id}     # Trainer details
GET  /api/reports/payroll            # Payroll report
POST /api/reports/export              # Export data
```

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Rate Limiting

### Default Limits
- Authentication: 5 requests per minute
- API endpoints: 100 requests per minute
- Email sending: 10 per minute
- Data exports: 5 per hour

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Error Codes

| Code | Description |
|------|-------------|
| AUTH_REQUIRED | Authentication required |
| INVALID_TOKEN | Invalid or expired token |
| PERMISSION_DENIED | Insufficient permissions |
| VALIDATION_FAILED | Request validation failed |
| RESOURCE_NOT_FOUND | Resource not found |
| DUPLICATE_ENTRY | Duplicate resource exists |
| RATE_LIMITED | Too many requests |
| EMAIL_FAILED | Email delivery failed |
| IMPORT_ERROR | Data import failed |

## Webhook Events (Future)

### Session Events
- `session.created`
- `session.validated`
- `session.cancelled`

### Email Events
- `email.delivered`
- `email.bounced`
- `email.failed`

## Environment Variables

```env
# Email Service
EMAIL_SERVICE=resend
EMAIL_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@pttracker.com
EMAIL_REPLY_TO=support@pttracker.com

# API Configuration
API_RATE_LIMIT=100
API_TIMEOUT=30000
SESSION_SECRET=xxxxxxxxxxxx

# External Services
GLOFOX_IMPORT_ENABLED=false
WEBHOOK_SECRET=xxxxxxxxxxxx
```

## Security Considerations

1. **Authentication**: All API endpoints except validation require authentication
2. **HTTPS**: All requests must use HTTPS in production
3. **CORS**: Configure allowed origins appropriately
4. **Input Validation**: All inputs validated and sanitized
5. **SQL Injection**: Use parameterized queries via Prisma
6. **Rate Limiting**: Implement per-endpoint rate limits
7. **Audit Logging**: Log all data modifications
8. **Token Security**: Store hashed tokens, not plain text