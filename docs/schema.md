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
  id                    String             @id @default(cuid())
  name                  String
  email                 String             @unique
  phone                 String?
  subscriptionStatus    SubscriptionStatus @default(ACTIVE)
  stripeCustomerId      String?            @unique
  stripeSubscriptionId  String?
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt
  commissionMethod      String             @default("PROGRESSIVE")
  adminNotes            String?
  clonedAt              DateTime?
  clonedFrom            String?
  isClone               Boolean            @default(false)
  lastIssue             String?
  lastIssueDate         DateTime?
  onboardingCompletedAt DateTime?
  subscriptionTier      SubscriptionTier?
  timezone              String             @default("Asia/Singapore")

  // Calendar settings
  calendarEnabled       Boolean            @default(false)
  availabilityEditableBy String            @default("MANAGER_ONLY") // "MANAGER_ONLY" or "MANAGER_AND_TRAINER"

  // Commission settings
  commissionIncludesNoShows Boolean        @default(false)

  // Beta Access
  betaAccess            Boolean?           @default(false)
  betaExpiresAt         DateTime?          @db.Timestamptz(6)
  betaPreviousTier      SubscriptionTier?

  // Relations
  clients               Client[]
  commissionTiers       CommissionTier[]        // Commission v1 (legacy)
  commissionProfiles    CommissionProfile[]     // Commission v2
  commissionCalculations CommissionCalculation[]
  invitations           Invitation[]
  locations             Location[]
  packageTypes          PackageType[]
  packages              Package[]
  sessions              Session[]
  users                 User[]
  trainerAvailability   TrainerAvailability[]
  appointments          Appointment[]

  @@index([betaAccess, betaExpiresAt], map: "idx_organizations_beta")
  @@map("organizations")
}
```

**Business Rules:**
- Email must be unique across organizations
- Each organization has one subscription
- Stripe IDs are populated when subscription is activated
- Organizations can have multiple locations (branches)
- onboardingCompletedAt is set when first admin completes onboarding wizard
- Subsequent admins skip onboarding if organization already completed it
- timezone defaults to "Asia/Singapore" for date-based calculations
- `calendarEnabled` feature flag controls access to calendar/scheduling features
- `availabilityEditableBy` controls who can set trainer availability: "MANAGER_ONLY" or "MANAGER_AND_TRAINER"
- `commissionIncludesNoShows` when true, no-show sessions (cancelled with NO_SHOW appointment status) are included in commission calculations

### CommissionProfile
Defines a commission profile with a calculation method and trigger type. Organizations can have multiple profiles and assign them to individual users.

```prisma
model CommissionProfile {
  id                String            @id @default(cuid())
  organizationId    String
  name              String
  isDefault         Boolean           @default(false)
  isActive          Boolean           @default(true)
  calculationMethod CalculationMethod @default(PROGRESSIVE)
  triggerType       TriggerType       @default(SESSION_COUNT)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  // Relations
  organization      Organization       @relation(fields: [organizationId], references: [id])
  tiers             CommissionTierV2[]
  users             User[]             @relation("UserCommissionProfile")
  calculations      CommissionCalculation[]

  @@unique([organizationId, name])
  @@index([organizationId])
  @@map("commission_profiles")
}
```

**Business Rules:**
- Each profile belongs to one organization (multi-tenant)
- Profile name must be unique within an organization
- One profile can be marked as default per organization
- Users are assigned to profiles via the User.commissionProfileId field

### CommissionTierV2
Defines tier thresholds and reward structures within a commission profile.

```prisma
model CommissionTierV2 {
  id                       String   @id @default(cuid())
  profileId                String
  tierLevel                Int

  // Thresholds (which ones apply depends on profile's triggerType)
  sessionThreshold         Int?
  salesThreshold           Float?

  // Rewards (all optional - use what you need)
  sessionCommissionPercent Float?   // % of session value
  sessionFlatFee           Float?   // Fixed $ per session
  salesCommissionPercent   Float?   // % of package sales
  salesFlatFee             Float?   // Fixed $ per package sold
  tierBonus                Float?   // One-time bonus for reaching tier

  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  // Relations
  profile                  CommissionProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@unique([profileId, tierLevel])
  @@index([profileId])
  @@map("commission_tiers_v2")
}
```

**Business Rules:**
- Tiers are ordered by tierLevel within a profile
- Threshold fields used depend on the parent profile's triggerType
- Reward fields are all optional to support flexible commission structures
- Cascade delete: removing a profile removes all its tiers

### CommissionCalculation
Stores computed commission results for a user over a specific period.

```prisma
model CommissionCalculation {
  id                String            @id @default(cuid())
  organizationId    String
  userId            String
  profileId         String?
  periodStart       DateTime
  periodEnd         DateTime

  // Calculation method used
  calculationMethod CalculationMethod

  // Summary data
  totalSessions     Int
  totalPackagesSold Int?

  // Commission breakdown
  sessionCommission Float
  salesCommission   Float?
  tierBonus         Float?
  totalCommission   Float

  // Tier information
  tierReached       Int?

  // Snapshot of calculation details
  calculationSnapshot Json?

  // Metadata
  calculatedAt      DateTime @default(now())

  // Relations
  organization      Organization       @relation(fields: [organizationId], references: [id])
  user              User               @relation(fields: [userId], references: [id])
  profile           CommissionProfile? @relation(fields: [profileId], references: [id])

  @@index([userId, periodEnd])
  @@index([organizationId, periodEnd])
  @@map("commission_calculations")
}
```

**Business Rules:**
- Stores a snapshot of the calculation for auditing
- Links to the profile used at calculation time (nullable for legacy calculations)
- periodStart/periodEnd define the commission window (typically monthly)

### Location
Represents physical gym locations/clubs.

```prisma
model Location {
  id             String         @id @default(cuid())
  name           String         @unique
  active         Boolean        @default(true)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  organizationId String?
  archivedAt     DateTime?
  archivedBy     String?

  // Relations
  clients        Client[]
  organization   Organization?  @relation(fields: [organizationId], references: [id])
  sessions       Session[]
  userAccess     UserLocation[]
  appointments   Appointment[]

  @@index([active])
  @@index([archivedAt])
  @@map("locations")
}
```

**Business Rules:**
- Name must be unique
- Cannot be deleted if has active users/clients
- User access is managed through the UserLocation junction table (many-to-many)
- archivedAt/archivedBy support soft-archiving locations

### User
Represents system users including trainers, managers, and administrators.

```prisma
model User {
  id                    String          @id @default(cuid())
  email                 String
  password              String          // Hashed with bcrypt
  name                  String
  role                  Role            @default(TRAINER)
  active                Boolean         @default(true)
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt
  organizationId        String?
  onboardingCompletedAt DateTime?       @map("onboarding_completed_at")

  // Commission v2 fields
  commissionProfileId   String?
  commissionProfile     CommissionProfile? @relation("UserCommissionProfile", fields: [commissionProfileId], references: [id])
  commissionCalculations CommissionCalculation[]

  // Relations
  adminAuditLogs        AdminAuditLog[] @relation("AdminAuditLogs")
  assignedClients       Client[]        @relation("ClientPrimaryTrainer")
  sentInvitations       Invitation[]    @relation("UserInvitations")
  sessions              Session[]
  createdTokens         TempAuthToken[] @relation("TokenAdmin")
  usedTokens            TempAuthToken[] @relation("TokenUser")
  locations             UserLocation[]
  createdPayments       Payment[]       @relation("PaymentCreatedBy")
  salesAttributedPayments  Payment[]    @relation("SalesAttributedTo")
  salesAttributedPayments2 Payment[]    @relation("SalesAttributedTo2")
  organization          Organization?   @relation(fields: [organizationId], references: [id])
  trainerAvailability   TrainerAvailability[]
  trainerAppointments   Appointment[]   @relation("TrainerAppointments")
  bookedAppointments    Appointment[]   @relation("BookedByAppointments")

  @@unique([email, organizationId])
  @@map("users")
}
```

**Business Rules:**
- Email must be unique per organization (composite unique constraint on email + organizationId)
- Password must be hashed before storage
- Soft delete via `active` flag
- User-Location relationship is many-to-many via UserLocation junction table
- onboardingCompletedAt tracks when user completed onboarding
- commissionProfileId links to the commission profile assigned to this user

### Client
Represents gym members who receive training sessions.

```prisma
model Client {
  id               String        @id @default(cuid())
  name             String
  email            String
  phone            String?
  locationId       String
  primaryTrainerId String?
  status           ClientStatus  @default(ACTIVE)
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  organizationId   String?
  isDemo           Boolean       @default(false)

  // Relations
  location         Location      @relation(fields: [locationId], references: [id])
  organization     Organization? @relation(fields: [organizationId], references: [id])
  primaryTrainer   User?         @relation("ClientPrimaryTrainer", fields: [primaryTrainerId], references: [id])
  packages         Package[]
  sessions         Session[]
  appointments     Appointment[]

  @@unique([email, organizationId])
  @@index([organizationId])
  @@map("clients")
}
```

**Business Rules:**
- Email must be unique per organization (composite unique constraint)
- Must be assigned to a location
- Can have one primary trainer (nullable for flexibility)
- Can have multiple packages
- `status` field tracks client lifecycle: `ACTIVE` (default), `ARCHIVED` (deactivated)
- "Lead" is a computed state (client with zero packages), not a DB status
- Clients auto-created from fitness assessment bookings are `ACTIVE` and show as "Lead" (computed) until a package is assigned
- isDemo flag marks demo/sample data

### Package
Represents training packages purchased by clients.

```prisma
model Package {
  id                 String        @id @default(cuid())
  clientId           String
  packageType        String        @default("Custom")
  name               String
  totalValue         Float
  totalSessions      Int
  remainingSessions  Int           @default(0)
  sessionValue       Float         // Calculated: totalValue / totalSessions
  startDate          DateTime?
  expiresAt          DateTime?
  active             Boolean       @default(true)
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
  packageTypeId      String?
  organizationId     String?
  isDemo             Boolean       @default(false)
  effectiveStartDate DateTime?

  // Relations
  client             Client        @relation(fields: [clientId], references: [id])
  organization       Organization? @relation(fields: [organizationId], references: [id])
  packageTypeModel   PackageType?  @relation(fields: [packageTypeId], references: [id])
  sessions           Session[]
  payments           Payment[]
  appointments       Appointment[]

  @@index([organizationId])
  @@map("packages")
}
```

**Business Rules:**
- sessionValue = totalValue / totalSessions
- Multiple packages allowed per client
- Active flag for current vs historical packages
- `packageType` is a string label (defaults to "Custom")
- `packageTypeId` links to the PackageType model for structured type data
- `effectiveStartDate`: set on creation for DATE_OF_PURCHASE trigger, set on first session for FIRST_SESSION trigger. Null means "Not Started."
- When expired (`expiresAt < now`), no new sessions can be created (hard lock)
- `remainingSessions` tracks how many sessions are left
- isDemo flag marks demo/sample data

### Payment
Tracks individual payment transactions against packages. Supports split payments (multiple installments per package) and explicit sales commission attribution.

```prisma
model Payment {
  id                   String         @id @default(cuid())
  packageId            String
  amount               Float
  paymentDate          DateTime
  paymentMethod        PaymentMethod  @default(CARD)
  notes                String?
  createdAt            DateTime       @default(now())
  createdById          String?
  salesAttributedToId  String?
  salesAttributedTo2Id String?

  // Relations
  package              Package  @relation(fields: [packageId], references: [id], onDelete: Cascade)
  createdBy            User?    @relation("PaymentCreatedBy", fields: [createdById], references: [id])
  salesAttributedTo    User?    @relation("SalesAttributedTo", fields: [salesAttributedToId], references: [id])
  salesAttributedTo2   User?    @relation("SalesAttributedTo2", fields: [salesAttributedTo2Id], references: [id])

  @@index([packageId])
  @@index([paymentDate])
  @@index([salesAttributedToId])
  @@index([salesAttributedTo2Id])
  @@map("payments")
}
```

**Business Rules:**
- Each payment is linked to a package (no standalone transactions)
- `salesAttributedToId` / `salesAttributedTo2Id`: explicit sales commission attribution
  - 1 person: 100% sales commission credit
  - 2 people: 50/50 split
  - Both null: no sales commission for this payment (no fallback to primaryTrainer)
- `paymentMethod`: CARD, BANK_TRANSFER, or OTHER
- Payments unlock sessions proportionally
- Cannot delete a payment if it would lock sessions already used
- Cascade delete from Package: if a package is deleted, its payments are removed

### Session
Core model representing individual training sessions.

```prisma
model Session {
  id               String        @id @default(cuid())
  trainerId        String
  clientId         String
  packageId        String?
  locationId       String
  sessionDate      DateTime
  sessionValue     Float
  validated        Boolean       @default(false)
  validatedAt      DateTime?
  validationToken  String?       @unique
  validationExpiry DateTime?
  notes            String?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  cancelled        Boolean       @default(false)
  cancelledAt      DateTime?
  organizationId   String?
  isDemo           Boolean       @default(false)

  // Relations
  client           Client        @relation(fields: [clientId], references: [id])
  location         Location      @relation(fields: [locationId], references: [id])
  organization     Organization? @relation(fields: [organizationId], references: [id])
  package          Package?      @relation(fields: [packageId], references: [id])
  trainer          User          @relation(fields: [trainerId], references: [id])
  appointment      Appointment?
  feedback         SessionFeedback?

  @@index([trainerId, sessionDate])
  @@index([validationToken])
  @@index([organizationId])
  @@index([organizationId, sessionDate])
  @@map("sessions")
}
```

**Business Rules:**
- Any trainer can log sessions for any client (substitute support)
- Validation token must be unique and secure
- Validation expires after 30 days
- `validated` boolean tracks whether the session has been validated
- Only validated sessions count for commission
- Session value typically from package but can be overridden
- Cannot modify after validation (except by admin)
- `cancelled` / `cancelledAt` support session cancellation without deletion
- isDemo flag marks demo/sample data

### CommissionTier (Legacy v1)
Defines commission percentage tiers based on session count. This is the legacy commission system; new implementations should use CommissionProfile and CommissionTierV2.

```prisma
model CommissionTier {
  id             String        @id @default(cuid())
  minSessions    Int
  maxSessions    Int?          // NULL for highest tier
  percentage     Float         // Stored as decimal (0.25 for 25%)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  organizationId String?

  // Relations
  organization   Organization? @relation(fields: [organizationId], references: [id])

  @@map("commission_tiers")
}
```

### PackageType
Defines package types available for an organization (e.g., "12 Prime PT Sessions", "3 Session Intro Pack").

```prisma
model PackageType {
  id                  String        @id @default(cuid())
  organizationId      String
  name                String
  defaultSessions     Int?
  defaultPrice        Float?
  isActive            Boolean       @default(true)
  sortOrder           Int           @default(0)
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
  startTrigger        StartTrigger  @default(DATE_OF_PURCHASE)
  expiryDurationValue Int?          // e.g. 3, 6, 90 -- null means no auto-expiry
  expiryDurationUnit  DurationUnit? // e.g. MONTHS, WEEKS, DAYS

  // Relations
  organization        Organization  @relation(fields: [organizationId], references: [id])
  packages            Package[]

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
  locationIds    String[]         @default([])

  // Relations
  invitedBy      User             @relation("UserInvitations", fields: [invitedById], references: [id])
  organization   Organization     @relation(fields: [organizationId], references: [id])

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
- locationIds stores which locations the invited user should have access to

### EmailLog
Tracks all email communications for audit trail.

```prisma
model EmailLog {
  id           String    @id @default(cuid())
  to           String
  subject      String
  template     String?
  status       String    @default("pending")
  messageId    String?
  sentAt       DateTime?
  error        String?
  metadata     Json?
  responseTime Int?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([status])
  @@index([createdAt])
  @@index([messageId])
  @@map("email_logs")
}
```

**Business Rules:**
- Records all email attempts (success and failure)
- Stores template type for analytics
- `messageId` stores the provider's message ID for tracking
- `error` captures failure details
- `responseTime` records delivery latency in milliseconds
- Metadata includes relevant IDs and additional context
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

### AdminAuditLog
Tracks all super admin actions for security and debugging.

```prisma
model AdminAuditLog {
  id           String   @id @default(cuid())
  adminId      String
  action       String   // LOGIN_AS, EXPORT_DATA, DELETE_CLONES, etc.
  targetUserId String?
  targetOrgId  String?
  metadata     Json?
  createdAt    DateTime @default(now())

  // Relations
  admin        User     @relation("AdminAuditLogs", fields: [adminId], references: [id])

  @@map("admin_audit_logs")
}
```

**Business Rules:**
- Created for every super admin action
- Never deleted (permanent audit trail)
- Includes LOGIN_AS start/end tracking
- Stores reason and context in metadata

### TempAuthToken
Temporary authentication tokens for super admin "Login As" feature.

```prisma
model TempAuthToken {
  id        String    @id @default(cuid())
  token     String    @unique @default(cuid())
  userId    String    // User being impersonated
  adminId   String    // Super admin who created token
  expiresAt DateTime
  usedAt    DateTime?
  revokedAt DateTime?
  metadata  Json?
  createdAt DateTime  @default(now())

  // Relations
  admin     User      @relation("TokenAdmin", fields: [adminId], references: [id])
  user      User      @relation("TokenUser", fields: [userId], references: [id])

  @@index([token])
  @@index([expiresAt])
  @@map("temp_auth_tokens")
}
```

**Business Rules:**
- Expires after 1 hour maximum
- Single use (tracked via usedAt)
- Can be manually revoked
- Used for debugging beta issues safely

### UserLocation
Junction table for many-to-many relationship between Users and Locations.

```prisma
model UserLocation {
  id         String   @id @default(cuid())
  userId     String
  locationId String
  createdAt  DateTime @default(now())

  // Relations
  location   Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, locationId])
  @@index([userId])
  @@index([locationId])
  @@map("user_locations")
}
```

**Business Rules:**
- Enables many-to-many relationship between Users and Locations
- Cascade delete: removing a User or Location removes the junction records
- A user can have access to multiple locations
- A location can have multiple users

### TrainerAvailability
Defines when trainers are available for appointments. Supports recurring weekly schedules and one-off date overrides.

```prisma
model TrainerAvailability {
  id              String       @id @default(cuid())
  trainerId       String
  organizationId  String

  // Recurring weekly schedule
  dayOfWeek       Int?         // 0=Sunday, 1=Monday, ... 6=Saturday (null for one-off)
  startTime       String       // "09:00" (HH:mm format, 15-min increments)
  endTime         String       // "17:00" (HH:mm format, 15-min increments)

  // One-off override for a specific date
  specificDate    DateTime?    // Set for date-specific overrides, null for recurring
  isAvailable     Boolean      @default(true) // false = blocked off (e.g., day off override)

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  // Relations
  trainer         User         @relation(fields: [trainerId], references: [id])
  organization    Organization @relation(fields: [organizationId], references: [id])

  @@index([trainerId, dayOfWeek])
  @@index([trainerId, specificDate])
  @@map("trainer_availability")
}
```

**Business Rules:**
- Recurring entries: `dayOfWeek` set, `specificDate` null — applies every week
- One-off entries: `specificDate` set, `dayOfWeek` null — applies to that date only
- Day-off override: `specificDate` set, `isAvailable = false` — blocks a recurring day
- Multiple blocks per day supported (e.g., 9:00-12:00 + 13:00-17:00 for lunch break)
- Specific date entries always override recurring entries for that day
- Who can edit is controlled by Organization.availabilityEditableBy setting
- Time values use 15-minute increments (e.g., "09:00", "09:15", "09:30", "09:45")

### Appointment
Represents a scheduled appointment between a trainer and a client (or prospect).

```prisma
model Appointment {
  id              String            @id @default(cuid())
  trainerId       String
  clientId        String?           // Nullable for FITNESS_ASSESSMENT with prospects
  locationId      String
  packageId       String?           // Optional link to package (null for FITNESS_ASSESSMENT)
  organizationId  String

  type            AppointmentType   @default(SESSION)
  scheduledAt     DateTime          // Date and time of appointment
  duration        Int               @default(60) // Duration in minutes

  status          AppointmentStatus @default(SCHEDULED)

  // Prospect info (for FITNESS_ASSESSMENT when client doesn't exist yet)
  prospectName    String?
  prospectEmail   String?

  reminderSentAt  DateTime?
  bookedById      String?           // Who created the appointment (trainer or manager)

  // Links to session when completed (SESSION type only)
  sessionId       String?           @unique

  notes           String?

  // Sale outcome tracking (FITNESS_ASSESSMENT only): "SALE" or "NO_SALE"
  saleOutcome     String?

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  // Relations
  trainer         User              @relation("TrainerAppointments", fields: [trainerId], references: [id])
  client          Client?           @relation(fields: [clientId], references: [id])
  location        Location          @relation(fields: [locationId], references: [id])
  package         Package?          @relation(fields: [packageId], references: [id])
  session         Session?          @relation(fields: [sessionId], references: [id])
  bookedBy        User?             @relation("BookedByAppointments", fields: [bookedById], references: [id])
  organization    Organization      @relation(fields: [organizationId], references: [id])

  @@index([trainerId, scheduledAt])
  @@index([organizationId, scheduledAt])
  @@map("appointments")
}
```

**Business Rules:**
- SESSION type: requires clientId and packageId, deducts a package credit on completion
- FITNESS_ASSESSMENT type: no package link, no credit deduction. Can use prospectName/prospectEmail when clientId is null
- Appointments must fall within trainer's available hours
- Status transitions: SCHEDULED → COMPLETED / NO_SHOW / CANCELLED
- sessionId links to the Session record when a SESSION-type appointment is logged
- bookedById tracks who created the appointment (for audit)
- Booking permissions: Admin, PT Manager, Club Manager can book on behalf of trainers. Trainers book their own.
- `saleOutcome`: tracks whether a FITNESS_ASSESSMENT resulted in a sale. Values: `"SALE"`, `"NO_SALE"`, or `null` (not yet recorded). Only applicable to FITNESS_ASSESSMENT type.

### SessionFeedback
Captures client feedback after a training session. Linked 1:1 with Session.

```prisma
model SessionFeedback {
  id              String   @id @default(cuid())
  sessionId       String   @unique

  sessionRating   Int?     // 1-5 stars
  trainerRating   Int?     // 1-5 stars (collected less frequently)
  energyLevel     Int?     // 1-5
  sorenessLevel   Int?     // 1-5
  comments        String?

  collectedAt     DateTime @default(now())

  // Relations
  session         Session  @relation(fields: [sessionId], references: [id])

  @@map("session_feedback")
}
```

**Business Rules:**
- One feedback record per session (unique sessionId)
- sessionRating collected every session, trainerRating collected less frequently
- All rating fields are optional (client can skip)
- Collected via the validation confirmation page after client validates a session

## Enums

### Role
Defines user permission levels.

```prisma
enum Role {
  TRAINER       // Can manage own sessions
  CLUB_MANAGER  // Can manage single location
  PT_MANAGER    // Can manage multiple locations
  ADMIN         // Full organization access
  SUPER_ADMIN   // Platform-wide admin for beta support
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

### PaymentMethod
Defines how a payment was made.

```prisma
enum PaymentMethod {
  CARD           // Card payment
  BANK_TRANSFER  // Bank transfer
  OTHER          // Other payment method
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

### CalculationMethod
Defines commission calculation approaches.

```prisma
enum CalculationMethod {
  PROGRESSIVE  // Tiered progressive calculation
  GRADUATED    // Graduated tier calculation
  FLAT         // Flat rate calculation
}
```

### TriggerType
Defines what triggers commission tier progression.

```prisma
enum TriggerType {
  NONE           // No trigger (manual)
  SESSION_COUNT  // Based on number of sessions
  SALES_VOLUME   // Based on sales revenue
  EITHER_OR      // Either sessions or sales threshold met
  BOTH_AND       // Both sessions and sales thresholds must be met
}
```

### StartTrigger
Defines when a package's effective start date is set.

```prisma
enum StartTrigger {
  DATE_OF_PURCHASE  // Package starts immediately when assigned
  FIRST_SESSION     // Package starts when first session is logged
}
```

### DurationUnit
Defines time units for package expiry duration.

```prisma
enum DurationUnit {
  DAYS
  WEEKS
  MONTHS
}
```

### AppointmentType
Defines the type of appointment.

```prisma
enum AppointmentType {
  SESSION             // Regular training session — links to package, deducts credit
  FITNESS_ASSESSMENT  // Sales appointment — no package, no credit deduction
}
```

### AppointmentStatus
Defines the lifecycle status of an appointment.

```prisma
enum AppointmentStatus {
  SCHEDULED   // Upcoming appointment
  COMPLETED   // Appointment finished successfully
  NO_SHOW     // Client did not attend
  CANCELLED   // Appointment was cancelled
}
```

### ClientStatus
Defines the lifecycle status of a client.

```prisma
enum ClientStatus {
  ACTIVE    // Regular active client
  ARCHIVED  // Deactivated client (soft delete)
}
```

> **Note:** "Lead" is a computed state (client with zero packages), not a DB status. Clients created from fitness assessment bookings start as `ACTIVE` and naturally display as "Lead" until a package is assigned.

## Relationships

### Primary Relationships
1. **User <-> Location** (Many-to-Many via UserLocation)
   - Users can have access to multiple locations
   - Managed through UserLocation junction table
   - Cascade delete on both sides

2. **Client -> Location** (Many-to-One)
   - Clients must belong to one location
   - Cannot be null

3. **Client -> User** (Many-to-One)
   - Primary trainer relationship
   - Optional, supports reassignment

4. **Session -> All Entities** (Many-to-One)
   - Links trainer, client, package, location, organization
   - Central fact table for reporting

5. **User -> CommissionProfile** (Many-to-One)
   - Each user can be assigned one commission profile
   - Optional (nullable commissionProfileId)

6. **CommissionProfile -> CommissionTierV2** (One-to-Many)
   - Each profile has multiple tiers
   - Cascade delete from profile to tiers

7. **Payment -> Package** (Many-to-One)
   - Each payment belongs to one package
   - Cascade delete from package to payments

8. **Payment -> User** (Many-to-One, multiple relations)
   - createdBy: who created the payment record
   - salesAttributedTo / salesAttributedTo2: sales commission attribution

9. **TrainerAvailability -> User** (Many-to-One)
   - Each availability entry belongs to one trainer
   - A trainer can have multiple availability entries (recurring + overrides)

10. **Appointment -> Multiple Entities** (Many-to-One)
    - Links trainer, client (optional), location, package (optional), session (optional), organization
    - Two User relations: trainer (required) and bookedBy (optional audit trail)
    - Client nullable for fitness assessments with prospects

11. **Session <-> Appointment** (One-to-One, optional)
    - A session can optionally be linked to an appointment
    - Linked when a SESSION-type appointment is logged as a session

12. **Session <-> SessionFeedback** (One-to-One, optional)
    - Each session can have at most one feedback record
    - Feedback collected via validation confirmation page

### Cascade Rules
- **User Deletion**: Soft delete, preserve sessions
- **Client Deletion**: Soft delete, preserve sessions
- **Package Deletion**: Soft delete, preserve sessions. Cascade deletes payments.
- **Location Deletion**: Prevent if has users/clients. Cascade deletes UserLocation records.
- **Session Deletion**: Soft delete only
- **CommissionProfile Deletion**: Cascade deletes CommissionTierV2 records
- **UserLocation Deletion**: Cascade from User or Location deletion

## Indexes

### Performance Indexes
```prisma
// Organization
@@index([betaAccess, betaExpiresAt])  // Beta access lookups

// User
@@unique([email, organizationId])      // Multi-tenant email uniqueness

// Client
@@unique([email, organizationId])      // Multi-tenant email uniqueness
@@index([organizationId])              // Org-scoped queries

// Location
@@index([active])                      // Active location filtering
@@index([archivedAt])                  // Archived location lookups

// Package
@@index([organizationId])              // Org-scoped queries

// Session
@@index([trainerId, sessionDate])      // Dashboard queries
@@index([validationToken])             // Validation lookups
@@index([organizationId])              // Org-scoped queries
@@index([organizationId, sessionDate]) // Org date-range queries
@@unique([validationToken])            // Unique validation tokens

// Payment
@@index([packageId])                   // Package payment lookups
@@index([paymentDate])                 // Date-range queries
@@index([salesAttributedToId])         // Sales attribution queries
@@index([salesAttributedTo2Id])        // Sales attribution queries

// CommissionProfile
@@unique([organizationId, name])       // Unique profile names per org
@@index([organizationId])              // Org-scoped queries

// CommissionTierV2
@@unique([profileId, tierLevel])       // Unique tier levels per profile
@@index([profileId])                   // Profile tier lookups

// CommissionCalculation
@@index([userId, periodEnd])           // User commission history
@@index([organizationId, periodEnd])   // Org commission history

// EmailLog
@@index([status])                      // Status filtering
@@index([createdAt])                   // Time-based queries
@@index([messageId])                   // Provider message lookups

// AuditLog
@@index([userId])                      // User activity queries
@@index([entityType, entityId])        // Entity history queries

// Invitation
@@unique([email, organizationId])      // One invitation per email per org
@@index([token])                       // Token lookups
@@index([status])                      // Status filtering

// TempAuthToken
@@index([token])                       // Token lookups
@@index([expiresAt])                   // Expiry checks

// UserLocation
@@unique([userId, locationId])         // Prevent duplicate assignments
@@index([userId])                      // User location lookups
@@index([locationId])                  // Location user lookups

// PackageType
@@unique([organizationId, name])       // Unique type names per org
@@index([organizationId])              // Org-scoped queries

// TrainerAvailability
@@index([trainerId, dayOfWeek])        // Recurring schedule lookups
@@index([trainerId, specificDate])     // Date-specific override lookups

// Appointment
@@unique([sessionId])                  // One appointment per session
@@index([trainerId, scheduledAt])      // Trainer schedule queries
@@index([organizationId, scheduledAt]) // Org-wide schedule queries

// SessionFeedback
@@unique([sessionId])                  // One feedback per session
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
- Must be unique per organization (composite unique on email + organizationId)
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

Current Version: **4.2.0**

### Version History
- 4.2.0: Added `commissionIncludesNoShows` field to Organization model for optional no-show commission inclusion
- 4.1.0: Added `saleOutcome` field to Appointment model for fitness assessment sale tracking
- 4.0.0: Calendar & scheduling system (TrainerAvailability, Appointment, SessionFeedback), AppointmentType and AppointmentStatus enums, Organization calendar settings (calendarEnabled, availabilityEditableBy)
- 3.0.0: Commission v2 system (CommissionProfile, CommissionTierV2, CommissionCalculation), UserLocation junction table, split payments, organization timezone, session cancellation support, demo data flags
- 2.1.0: Added onboardingCompletedAt to Organization model for wizard completion tracking
- 2.0.0: Simplified package system - removed PackageTemplate, consolidated PackageType with single name field
- 1.0.0: Initial schema with primary trainer support

### Breaking Changes Policy
- Major version for breaking changes
- Minor version for additions
- Patch version for fixes
