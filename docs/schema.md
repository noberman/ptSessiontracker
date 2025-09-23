# Database Schema Documentation

## Overview
This document provides comprehensive documentation of the Prisma schema for the PT Session Tracker system. It includes all models, relationships, indexes, and business rules.

## Database Configuration

### Provider
- **Database**: PostgreSQL
- **Provider**: Railway (Production)
- **ORM**: Prisma
- **Connection Pooling**: Enabled via PgBouncer

## Schema Models

### Organization
Represents a fitness organization/company that can have multiple locations and users.

```prisma
model Organization {
  id                   String             @id @default(cuid())
  name                 String
  email                String             @unique
  phone                String?
  subscriptionTier     SubscriptionTier   @default(FREE)
  subscriptionStatus   SubscriptionStatus @default(ACTIVE)
  stripeCustomerId     String?            @unique
  stripeSubscriptionId String?
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  
  // Relations
  locations            Location[]
  users                User[]
  commissionTiers      CommissionTier[]
  packageTemplates     PackageTemplate[]

  @@map("organizations")
}
```

**Business Rules:**
- Email must be unique across organizations
- Each organization has one subscription
- Stripe IDs are populated when subscription is activated
- Organizations can have multiple locations (branches)

### User
Represents system users including trainers, managers, and administrators.

```prisma
model User {
  id               String    @id @default(cuid())
  email            String    @unique
  password         String    // Hashed with bcrypt
  name             String
  role             Role      @default(TRAINER)
  locationId       String?
  organizationId   String?   // Multi-tenant field
  active           Boolean   @default(true)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  // Relations
  organization     Organization? @relation(fields: [organizationId], references: [id])
  location         Location? @relation(fields: [locationId], references: [id])
  sessions         Session[]
  assignedClients  Client[]  @relation("ClientPrimaryTrainer")

  @@map("users")
}
```

**Business Rules:**
- Email must be unique across the system
- Password must be hashed before storage
- Location is optional for PT_MANAGER and ADMIN roles
- Soft delete via `active` flag

### Client
Represents gym members who receive training sessions.

```prisma
model Client {
  id               String    @id @default(cuid())
  name             String
  email            String    @unique
  phone            String?
  locationId       String
  primaryTrainerId String?   // Added for primary trainer tracking
  active           Boolean   @default(true)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  // Relations
  location         Location  @relation(fields: [locationId], references: [id])
  primaryTrainer   User?     @relation("ClientPrimaryTrainer", fields: [primaryTrainerId], references: [id])
  packages         Package[]
  sessions         Session[]

  @@map("clients")
}
```

**Business Rules:**
- Email must be unique
- Must be assigned to a location
- Can have one primary trainer (nullable for flexibility)
- Can have multiple packages
- Soft delete preserves session history

### Location
Represents physical gym locations/clubs.

```prisma
model Location {
  id             String   @id @default(cuid())
  name           String   @unique
  active         Boolean  @default(true)
  organizationId String?  // Multi-tenant field
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  organization   Organization? @relation(fields: [organizationId], references: [id])
  users          User[]
  clients        Client[]
  sessions       Session[]

  @@map("locations")
}
```

**Business Rules:**
- Name should be unique (enforce in application)
- Cannot be deleted if has active users/clients
- Address is optional but recommended

### Package
Represents training packages purchased by clients.

```prisma
model Package {
  id            String   @id @default(cuid())
  clientId      String
  name          String
  totalValue    Float
  totalSessions Int
  sessionValue  Float    // Calculated: totalValue / totalSessions
  active        Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  client        Client    @relation(fields: [clientId], references: [id])
  sessions      Session[]

  @@map("packages")
}
```

**Business Rules:**
- sessionValue = totalValue ÷ totalSessions
- Multiple packages allowed per client
- Sessions not blocked if package exceeded
- Active flag for current vs historical packages

### Session
Core model representing individual training sessions.

```prisma
model Session {
  id               String    @id @default(cuid())
  trainerId        String
  clientId         String
  packageId        String?
  locationId       String
  sessionDate      DateTime
  sessionValue     Float
  validatedAt      DateTime?
  validationToken  String?   @unique
  validationExpiry DateTime?
  notes            String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  // Relations
  trainer          User      @relation(fields: [trainerId], references: [id])
  client           Client    @relation(fields: [clientId], references: [id])
  package          Package?  @relation(fields: [packageId], references: [id])
  location         Location  @relation(fields: [locationId], references: [id])

  @@index([trainerId, sessionDate])
  @@index([validationToken])
  @@map("sessions")
}
```

**Business Rules:**
- Any trainer can log sessions for any client (substitute support)
- Validation token must be unique and secure
- Validation expires after 30 days
- Only validated sessions count for commission
- Session value typically from package but can be overridden
- Cannot modify after validation (except by admin)

### CommissionTier
Defines commission percentage tiers based on session count.

```prisma
model CommissionTier {
  id          String   @id @default(cuid())
  minSessions Int
  maxSessions Int?     // NULL for highest tier
  percentage  Float    // Stored as decimal (0.25 for 25%)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("commission_tiers")
}
```

**Commission System:**
See `/docs/COMMISSION_SYSTEM_DESIGN.md` for complete commission system architecture including:
- Multiple calculation methods (Progressive, Graduated, Package-Based, Target-Based, Hybrid)
- Organization-specific configuration
- Detailed calculation examples
- Migration strategy for multi-tenant

### PackageType
Defines package types available for an organization (e.g., "12 Prime PT Sessions", "3 Session Intro Pack").

```prisma
model PackageType {
  id              String        @id @default(cuid())
  organizationId  String
  name            String        // User-friendly name like "Elite 12 Sessions"
  defaultSessions Int?          // Default session count for this type
  defaultPrice    Float?        // Default price for this type
  isActive        Boolean       @default(true)
  sortOrder       Int           @default(0)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  // Relations
  organization    Organization  @relation(fields: [organizationId], references: [id])
  packages        Package[]     // Packages using this type
  
  @@unique([organizationId, name])
  @@index([organizationId])
  @@map("package_types")
}
```

**Business Rules:**
- Each organization defines their own package types
- Name is user-friendly and fully editable (no internal/display split)
- Used to categorize packages and set defaults
- Required organizationId (multi-tenant)


### Invitation
Manages team member invitations via email.

```prisma
model Invitation {
  id             String           @id @default(cuid())
  email          String
  role           Role             @default(TRAINER)
  organizationId String
  invitedById    String
  status         InvitationStatus @default(PENDING)
  token          String           @unique @default(cuid())
  expiresAt      DateTime
  acceptedAt     DateTime?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  
  organization   Organization @relation(fields: [organizationId], references: [id])
  invitedBy      User        @relation("UserInvitations", fields: [invitedById], references: [id])
  
  @@unique([email, organizationId])
  @@index([token])
  @@index([status])
  @@map("invitations")
}
```

**Business Rules:**
- Secure token generated for each invitation
- Expires after 7 days by default
- Cannot have duplicate pending invitations for same email/org
- Status transitions: PENDING -> ACCEPTED/EXPIRED/CANCELLED
- Resend has 5-minute cooldown period
- Only admins and PT managers can send invitations
- Email sent via Resend API with retry logic

### EmailLog
Tracks all email communications for audit trail.

```prisma
model EmailLog {
  id         String   @id @default(cuid())
  to         String
  subject    String
  template   String
  status     String   // 'sent' | 'failed'
  sentAt     DateTime
  metadata   Json?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@map("email_logs")
}
```

**Business Rules:**
- Records all email attempts (success and failure)
- Stores template type for analytics
- Metadata includes relevant IDs and error messages
- Used for debugging delivery issues

### AuditLog
Tracks all data modifications for compliance and debugging.

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  userId     String?
  action     String
  entityType String
  entityId   String
  oldValue   Json?
  newValue   Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([userId])
  @@index([entityType, entityId])
  @@map("audit_logs")
}
```

**Business Rules:**
- Never deleted, only archived
- Stores complete before/after state
- Required for all data modifications
- Retained for minimum 13 months

## Enums

### Role
Defines user permission levels.

```prisma
enum Role {
  TRAINER       // Can manage own sessions
  CLUB_MANAGER  // Can manage single location
  PT_MANAGER    // Can manage multiple locations
  ADMIN         // Full system access
}
```

### SubscriptionTier
Defines organization subscription levels.

```prisma
enum SubscriptionTier {
  FREE    // Basic features (10 trainers, 50 clients)
  GROWTH  // Mid-tier (25 trainers, 250 clients)
  SCALE   // Enterprise (unlimited)
}
```

### SubscriptionStatus
Defines organization subscription status.

```prisma
enum SubscriptionStatus {
  ACTIVE    // Subscription is active
  CANCELED  // Subscription cancelled
  PAST_DUE  // Payment overdue
}
```

### InvitationStatus
Defines invitation states.

```prisma
enum InvitationStatus {
  PENDING    // Invitation sent, awaiting response
  ACCEPTED   // Invitation accepted by user
  EXPIRED    // Invitation expired (7 days)
  CANCELLED  // Manually cancelled by sender
}
```

## Relationships

### Primary Relationships
1. **User → Location** (Many-to-One)
   - Users assigned to one location
   - Optional for managers

2. **Client → Location** (Many-to-One)
   - Clients must belong to one location
   - Cannot be null

3. **Client → User** (Many-to-One)
   - Primary trainer relationship
   - Optional, supports reassignment

4. **Session → All Entities** (Many-to-One)
   - Links trainer, client, package, location
   - Central fact table for reporting

### Cascade Rules
- **User Deletion**: Soft delete, preserve sessions
- **Client Deletion**: Soft delete, preserve sessions
- **Package Deletion**: Soft delete, preserve sessions
- **Location Deletion**: Prevent if has users/clients
- **Session Deletion**: Soft delete only

## Indexes

### Performance Indexes
```prisma
// User
@@unique([email])

// Client  
@@unique([email])

// Session
@@index([trainerId, sessionDate])  // Dashboard queries
@@index([validationToken])          // Validation lookups
@@unique([validationToken])

// AuditLog
@@index([userId])                    // User activity queries
@@index([entityType, entityId])     // Entity history queries
```

## Migration Strategy

### Adding Fields
1. Add nullable field
2. Backfill data
3. Make required if needed

### Removing Fields
1. Stop using in code
2. Mark deprecated
3. Remove in next major version

### Renaming Fields
1. Add new field
2. Copy data
3. Update code
4. Remove old field

## Data Validation Rules

### Email Validation
- Must be valid email format
- Must be unique in system
- Case-insensitive comparison

### Date Validation
- Session dates cannot be more than 7 days in future
- Session dates cannot be more than 30 days in past
- All dates stored in UTC

### Financial Validation
- All monetary values in cents (multiply by 100)
- Session value must be positive
- Package value must be positive

## Future Considerations

### Potential Schema Additions
1. **SessionType** enum (Regular, Trial, Makeup)
2. **PaymentStatus** for packages
3. **ClientNotes** for trainer observations
4. **ScheduledSession** for future bookings
5. **TrainerAvailability** for scheduling

### Performance Optimizations
1. Materialized views for reports
2. Partitioning for session table
3. Read replicas for analytics
4. Archive old sessions

## Schema Versioning

Current Version: **2.0.0**

### Version History
- 2.0.0: Simplified package system - removed PackageTemplate, consolidated PackageType with single name field
- 1.0.0: Initial schema with primary trainer support

### Breaking Changes Policy
- Major version for breaking changes
- Minor version for additions
- Patch version for fixes