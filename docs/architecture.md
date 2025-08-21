# Architecture Documentation

## Overview
This document outlines the technical architecture, page structure, routing patterns, and system design for the PT Session Tracker application.

## Technology Stack

### Core Technologies
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Deployment**: Railway

### Supporting Libraries
- **Email**: SendGrid/Resend
- **Validation**: Zod
- **Date Handling**: date-fns
- **Excel Export**: ExcelJS
- **CSV**: Papa Parse
- **Password Hashing**: bcryptjs

## Application Structure

```
PTSessionSolution/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes
│   │   ├── (auth)/             # Auth group routes
│   │   ├── (dashboard)/        # Dashboard routes
│   │   └── (public)/           # Public routes
│   ├── components/             # React components
│   │   ├── ui/                 # Base UI components
│   │   ├── forms/              # Form components
│   │   └── layouts/            # Layout components
│   ├── lib/                    # Utility functions
│   │   ├── auth/               # Auth utilities
│   │   ├── db/                 # Database utilities
│   │   ├── email/              # Email services
│   │   └── validators/         # Validation schemas
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # TypeScript types
│   └── styles/                 # Global styles
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── seed.ts                 # Seed data
│   └── migrations/             # Database migrations
├── public/                     # Static assets
├── docs/                       # Documentation
└── tasks/                      # Development tasks
```

## Page Structure & Routing

### Public Routes (No Auth Required)
```
/                               # Landing page
/login                          # Login page
/validate/[token]               # Session validation page
```

### Authenticated Routes

#### Dashboard Routes
```
/dashboard                      # Role-based dashboard
/dashboard/trainer              # Trainer-specific view
/dashboard/manager              # Manager-specific view
/dashboard/admin                # Admin-specific view
```

#### User Management
```
/users                          # User list
/users/new                      # Create user
/users/[id]                     # View user
/users/[id]/edit                # Edit user
```

#### Client Management
```
/clients                        # Client list
/clients/new                    # Create client
/clients/[id]                   # View client
/clients/[id]/edit              # Edit client
/clients/import                 # Bulk import
```

#### Session Management
```
/sessions                       # Session list
/sessions/new                   # Create session
/sessions/[id]                  # View session
/sessions/[id]/edit             # Edit session
```

#### Package Management
```
/packages                       # Package list
/packages/new                   # Create package
/packages/[id]                  # View package
/packages/[id]/edit             # Edit package
```

#### Location Management
```
/locations                      # Location list
/locations/new                  # Create location
/locations/[id]                 # View location
/locations/[id]/edit            # Edit location
```

#### Reports & Analytics
```
/reports                        # Reports dashboard
/reports/payroll                # Payroll report
/reports/commission             # Commission summary
/reports/export                 # Data export
```

#### Admin Routes
```
/admin                          # Admin dashboard
/admin/settings                 # System settings
/admin/audit                    # Audit logs
/admin/maintenance              # Maintenance mode
```

## API Route Structure

### RESTful Endpoints
```
/api/auth/[...nextauth]         # NextAuth endpoints
/api/users                      # User CRUD
/api/clients                    # Client CRUD
/api/sessions                   # Session CRUD
/api/packages                   # Package CRUD
/api/locations                  # Location CRUD
/api/commission                 # Commission calculations
/api/reports                    # Report generation
/api/email                      # Email operations
/api/import                     # Data import
/api/export                     # Data export
```

### API Naming Conventions
- Use plural nouns for resources
- Use kebab-case for multi-word paths
- Version via headers, not URLs
- Return consistent response formats

## Component Architecture

### Component Hierarchy
```
App Layout
├── Navigation
│   ├── TopBar
│   ├── SideBar
│   └── MobileMenu
├── Page Container
│   ├── Page Header
│   ├── Page Content
│   │   ├── Data Tables
│   │   ├── Forms
│   │   └── Cards
│   └── Page Footer
└── Modals/Dialogs
```

### Component Organization
```
components/
├── ui/                         # Base components (shadcn/ui)
│   ├── button.tsx
│   ├── input.tsx
│   └── table.tsx
├── forms/                      # Form components
│   ├── SessionForm.tsx
│   ├── ClientForm.tsx
│   └── UserForm.tsx
├── tables/                     # Data tables
│   ├── SessionTable.tsx
│   ├── ClientTable.tsx
│   └── UserTable.tsx
├── layouts/                    # Layout components
│   ├── DashboardLayout.tsx
│   ├── AuthLayout.tsx
│   └── PublicLayout.tsx
└── shared/                     # Shared components
    ├── LoadingSpinner.tsx
    ├── ErrorBoundary.tsx
    └── ConfirmDialog.tsx
```

## Data Flow Architecture

### Request Flow
```
Client Request
    ↓
Next.js Middleware (Auth Check)
    ↓
Route Handler / Page Component
    ↓
Server Actions / API Routes
    ↓
Prisma ORM
    ↓
PostgreSQL Database
    ↓
Response
```

### State Management
- **Server State**: React Server Components
- **Client State**: React Hooks (useState, useContext)
- **Form State**: React Hook Form
- **Cache**: Next.js built-in caching

## Authentication & Authorization

### Authentication Flow
```
1. User enters credentials
2. Validate against database
3. Generate JWT token
4. Store in secure cookie
5. Include user/role in session
```

### Authorization Layers
1. **Middleware Level**: Route protection
2. **API Level**: Endpoint authorization
3. **Component Level**: UI element visibility
4. **Database Level**: Row-level security

### Permission Matrix
```typescript
const permissions = {
  TRAINER: ['sessions.create', 'sessions.view.own'],
  CLUB_MANAGER: ['sessions.view.club', 'users.view.club'],
  PT_MANAGER: ['sessions.view.all', 'users.view.all'],
  ADMIN: ['*']
}
```

## Database Architecture

### Connection Pooling
```typescript
// Singleton pattern for Prisma client
const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}
```

### Query Optimization
- Use includes for related data
- Implement pagination
- Create appropriate indexes
- Use select for specific fields

## Email Architecture

### Email Queue System
```
Session Created
    ↓
Queue Validation Email
    ↓
Email Service (SendGrid/Resend)
    ↓
Track Delivery Status
    ↓
Handle Failures (Retry)
```

### Template Structure
```
templates/
├── base.html                   # Base template
├── session-validation.html     # Validation email
├── reminder.html               # Reminder email
└── report-ready.html           # Report notification
```

## Security Architecture

### Security Layers
1. **Network**: HTTPS only
2. **Application**: CSRF protection
3. **API**: Rate limiting
4. **Database**: Parameterized queries
5. **Authentication**: Bcrypt hashing
6. **Session**: Secure cookies

### Security Headers
```typescript
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'"
}
```

## Performance Optimization

### Caching Strategy
- **Static Pages**: ISR (Incremental Static Regeneration)
- **API Responses**: Cache headers
- **Database Queries**: Query result caching
- **Session Data**: In-memory cache

### Loading Strategies
- **Code Splitting**: Automatic via Next.js
- **Lazy Loading**: Components and images
- **Prefetching**: Next.js Link prefetch
- **Streaming**: React Server Components

## Deployment Architecture

### Environment Setup
```
Development → Staging → Production
   Local        Railway    Railway
```

### Environment Variables
```env
# Development
DATABASE_URL=postgresql://local
NEXTAUTH_URL=http://localhost:3000

# Production
DATABASE_URL=postgresql://railway
NEXTAUTH_URL=https://pttracker.com
```

### CI/CD Pipeline
1. Push to GitHub
2. Run tests
3. Build application
4. Deploy to Railway
5. Run migrations
6. Health check

## Monitoring & Logging

### Logging Levels
- **ERROR**: System errors
- **WARN**: Potential issues
- **INFO**: General information
- **DEBUG**: Detailed debugging

### Metrics to Track
- Response times
- Error rates
- Session validation rates
- Email delivery rates
- Database query performance

## Scalability Considerations

### Horizontal Scaling
- Stateless application design
- Database connection pooling
- Session storage in database
- CDN for static assets

### Vertical Scaling
- Optimize database queries
- Implement caching layers
- Use background jobs
- Archive old data

## Error Handling

### Error Boundary Structure
```typescript
try {
  // Operation
} catch (error) {
  // Log error
  // Send to monitoring
  // Return user-friendly message
  // Fallback UI
}
```

### Error Response Format
```json
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "The requested session could not be found",
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "abc123"
  }
}
```

## Development Workflow

### Branch Strategy
```
main
├── develop
│   ├── feature/task-01-foundation
│   ├── feature/task-02-auth
│   └── feature/task-03-users
└── hotfix/critical-bug
```

### Code Review Process
1. Create feature branch
2. Implement changes
3. Run tests locally
4. Create pull request
5. Code review
6. Merge to develop
7. Deploy to staging
8. Merge to main

## Future Architecture Considerations

### Potential Enhancements
1. **Microservices**: Split email service
2. **Message Queue**: Redis/RabbitMQ
3. **Search**: Elasticsearch integration
4. **Real-time**: WebSocket for live updates
5. **Mobile App**: React Native client
6. **Analytics**: Data warehouse integration