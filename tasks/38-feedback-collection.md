# Task 38: Feedback Collection System

**Complexity: 6/10**  
**Priority: HIGH (Critical for beta testing and product improvement)**  
**Status: Not Started**  
**Dependencies: User authentication, Email system**  
**Estimated Time: 8-10 hours**

## Objective
Implement a dual-system feedback collection approach: private bug reporting for individual issue resolution and public feature discussion forum for community-driven product development.

## Two Distinct Systems

### System 1: Bug Reporting (Private/Support)
- **Privacy**: Individual, confidential bug reports
- **Audience**: 1-to-1 between user and support team
- **Purpose**: Quick issue resolution without exposing user data
- **Sensitive Data**: May contain screenshots, error logs, user info

### System 2: Feature Discussion (Public/Community)
- **Visibility**: Public forum visible to all users
- **Audience**: Community-wide discussion and voting
- **Purpose**: Transparent product development, community engagement
- **Social Proof**: Shows demand through voting and comments

## User Journey

### Entry Point: Feedback Widget
**Location: Bottom-right corner of all authenticated pages**

```typescript
// Floating button that expands to modal
User clicks feedback button → Modal opens:

"How can we help?"
┌─────────────────────────┐
│ 🐛 Report a Bug        │ → Private ticket
├─────────────────────────┤
│ 💡 Request Feature     │ → Public forum
├─────────────────────────┤
│ 💬 General Feedback    │ → Private message
├─────────────────────────┤
│ 📊 View Roadmap        │ → Public roadmap
└─────────────────────────┘
```

## System 1: Bug Reporting (Private)

### User Flow
```
Submit Bug → Private Ticket → Admin Response → Resolution
```

### Bug Report Form
```typescript
interface BugReport {
  // User provides
  title: string
  description: string
  severity: "Critical" | "Major" | "Minor" | "Cosmetic"
  steps?: string // Steps to reproduce
  expected?: string // Expected behavior
  actual?: string // Actual behavior
  screenshot?: File // Optional screenshot
  
  // Auto-captured (not shown to user)
  userId: string
  organizationId: string
  url: string
  browser: string
  screenResolution: string
  timestamp: Date
  
  // Private ticket fields
  ticketNumber: string // e.g., "BUG-2024-001"
  status: "New" | "In Progress" | "Fixed" | "Won't Fix"
  assignedTo?: string // Internal assignment
  internalNotes?: string // Team-only notes
  resolution?: string // Fix description
}
```

### Bug Submission Experience
```
1. User fills form (private)
2. Gets ticket number: "BUG-2024-001"
3. Receives email confirmation
4. Can view status at /feedback/my-tickets
5. Gets email when resolved
```

### My Tickets Page (`/feedback/my-tickets`)
```
My Support Tickets (Private)

┌─────────────────────────────────────────┐
│ #BUG-001 - Login button not working     │
│ Status: 🔧 In Progress                  │
│ Submitted: 2 days ago                   │
│                                         │
│ Latest update from support:             │
│ "We've identified the issue and are    │
│ working on a fix."                     │
├─────────────────────────────────────────┤
│ #BUG-002 - Session not saving          │
│ Status: ✅ Fixed                        │
│ Submitted: 1 week ago                   │
│ Resolution: "Fixed in v1.2.3"          │
└─────────────────────────────────────────┘
```

## System 2: Feature Requests (Public Forum)

### User Flow
```
Submit Feature → Public Post → Community Votes → Roadmap
```

### Feature Request Structure
```typescript
interface FeatureRequest {
  // User provides
  title: string
  description: string
  useCase: string // "How would this help you?"
  
  // Public interaction
  votes: number
  voters: string[] // For preventing duplicate votes
  comments: Comment[]
  subscribers: string[] // Get notified of updates
  
  // Status (set by admin)
  status: "Under Review" | "Planned" | "In Progress" | "Shipped" | "Won't Do"
  targetQuarter?: string // e.g., "Q1 2025"
  adminResponse?: string // Official response
}

interface Comment {
  id: string
  userId: string
  userName: string // Display name
  message: string
  timestamp: Date
  isAdmin: boolean // Highlight admin responses
}
```

### Public Feature Forum (`/features`)
```
Feature Requests

[+ Request Feature]    Sort by: [Most Voted ▼]

┌─────────────────────────────────────────────────────┐
│ Bulk session import from Excel                      │
│ 👍 47 votes · 12 comments                          │
│ Status: 🎯 Planned for Q1 2025                     │
│                                                     │
│ "Need to import 100+ sessions from old system..."   │
│                                                     │
│ Latest: "This would save 2 hrs/week!" - Sarah      │
│ [View Discussion]                                   │
├─────────────────────────────────────────────────────┤
│ Mobile app for trainers                            │
│ 👍 31 votes · 8 comments                           │
│ Status: 🤔 Under Review                            │
│ [View Discussion]                                  │
└─────────────────────────────────────────────────────┘
```

### Individual Feature Page (`/features/[id]`)
```
Bulk session import from Excel
───────────────────────────────
[👍 Vote] 47 votes    [🔔 Subscribe]

Status: 🎯 Planned for Q1 2025

Description:
"I need to import 100+ sessions at once from our 
old Excel system. Currently doing this manually 
takes hours every week..."

How this would help:
"Save 2+ hours per week on data entry"

Admin Response:
"Great suggestion! We're planning this for Q1 2025.
We'll support CSV and Excel formats with automatic
client matching."

Comments:
┌─────────────────────────────────────────────┐
│ Sarah: This would be a game changer!        │
│ ├─ Admin: What columns does your Excel have?│
│ └─ Sarah: Date, Client, Package, Duration   │
│                                             │
│ Mike: +1, same need here                    │
│                                             │
│ Tom: Could this also handle packages?       │
│ └─ Admin: Yes, planning that too!          │
└─────────────────────────────────────────────┘

[Add Comment]
```

## Public Roadmap (`/roadmap`)

```
🚀 Product Roadmap

In Progress (December 2024)
├── ✅ Multi-tenant support
└── 🔨 Organization settings

Next Up (Q1 2025)
├── 📋 Bulk session import (47 votes)
├── 📋 Advanced reporting (31 votes)
└── 📋 Commission customization (28 votes)

Under Consideration
├── 💭 Mobile app
├── 💭 AI training programs
└── 💭 Client portal

Recently Shipped
├── ✅ Email validation (Nov 2024)
├── ✅ Commission tiers (Nov 2024)
└── ✅ Multi-location support (Oct 2024)

[View Changelog]
```

## Database Schema

```prisma
// Private bug reports
model BugReport {
  id             String         @id @default(cuid())
  ticketNumber   String         @unique // BUG-2024-001
  title          String
  description    String         @db.Text
  severity       Severity
  status         BugStatus      @default(NEW)
  
  // User data
  userId         String
  organizationId String
  
  // Technical context
  metadata       Json           // URL, browser, etc.
  screenshot     String?        // S3 URL
  
  // Support fields
  assignedTo     String?
  internalNotes  String?        @db.Text
  resolution     String?        @db.Text
  
  // Timestamps
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  resolvedAt     DateTime?
  
  // Relations
  user           User           @relation(fields: [userId], references: [id])
  organization   Organization   @relation(fields: [organizationId], references: [id])
  responses      BugResponse[]  // Support responses
  
  @@index([userId])
  @@index([status])
  @@map("bug_reports")
}

model BugResponse {
  id          String    @id @default(cuid())
  bugReportId String
  userId      String    // Support agent
  message     String    @db.Text
  isInternal  Boolean   @default(false) // Team-only notes
  createdAt   DateTime  @default(now())
  
  bugReport   BugReport @relation(fields: [bugReportId], references: [id])
  user        User      @relation(fields: [userId], references: [id])
  
  @@map("bug_responses")
}

// Public feature requests
model FeatureRequest {
  id             String         @id @default(cuid())
  title          String
  description    String         @db.Text
  useCase        String         @db.Text
  status         FeatureStatus  @default(UNDER_REVIEW)
  targetQuarter  String?
  adminResponse  String?        @db.Text
  
  // User data
  userId         String
  organizationId String
  
  // Voting
  voteCount      Int            @default(0)
  
  // Timestamps
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  shippedAt      DateTime?
  
  // Relations
  user           User           @relation(fields: [userId], references: [id])
  organization   Organization   @relation(fields: [organizationId], references: [id])
  votes          FeatureVote[]
  comments       FeatureComment[]
  subscribers    FeatureSubscriber[]
  
  @@index([status])
  @@index([voteCount])
  @@map("feature_requests")
}

model FeatureVote {
  id              String         @id @default(cuid())
  featureId       String
  userId          String
  createdAt       DateTime       @default(now())
  
  feature         FeatureRequest @relation(fields: [featureId], references: [id])
  user            User          @relation(fields: [userId], references: [id])
  
  @@unique([featureId, userId]) // One vote per user per feature
  @@map("feature_votes")
}

model FeatureComment {
  id              String         @id @default(cuid())
  featureId       String
  userId          String
  message         String         @db.Text
  isAdminResponse Boolean        @default(false)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  
  feature         FeatureRequest @relation(fields: [featureId], references: [id])
  user            User          @relation(fields: [userId], references: [id])
  
  @@map("feature_comments")
}

model FeatureSubscriber {
  id              String         @id @default(cuid())
  featureId       String
  userId          String
  createdAt       DateTime       @default(now())
  
  feature         FeatureRequest @relation(fields: [featureId], references: [id])
  user            User          @relation(fields: [userId], references: [id])
  
  @@unique([featureId, userId])
  @@map("feature_subscribers")
}

// Enums
enum Severity {
  CRITICAL
  MAJOR
  MINOR
  COSMETIC
}

enum BugStatus {
  NEW
  IN_PROGRESS
  FIXED
  WONT_FIX
}

enum FeatureStatus {
  UNDER_REVIEW
  PLANNED
  IN_PROGRESS
  SHIPPED
  WONT_DO
}
```

## Admin Dashboard

### Bug Management (`/admin/bugs`)
```
Bug Reports (Private Support Queue)

Filters: [All Severities ▼] [All Status ▼]

┌─────────────────────────────────────────┐
│ 🚨 #BUG-001 - Login fails on Safari    │
│ User: jane@snapfitness.com             │
│ Severity: CRITICAL | Status: NEW       │
│ [View] [Assign] [Respond]              │
├─────────────────────────────────────────┤
│ ⚠️ #BUG-002 - Export formatting issue  │
│ User: mike@fitcore.com                 │
│ Severity: MAJOR | Status: IN_PROGRESS  │
│ Assigned to: Dev Team                  │
│ [View] [Update] [Respond]              │
└─────────────────────────────────────────┘
```

### Feature Management (`/admin/features`)
```
Feature Requests (Public Forum)

Sort by: [Most Voted ▼]

┌─────────────────────────────────────────┐
│ Bulk import (47 votes)                 │
│ Status: UNDER_REVIEW                   │
│ [Change Status] [Add Admin Response]   │
├─────────────────────────────────────────┤
│ Mobile app (31 votes)                  │
│ Status: PLANNED - Q2 2025              │
│ [Update Timeline] [Comment]            │
└─────────────────────────────────────────┘
```

## Notification System

### Bug Reports (Private)
```typescript
// Immediate Slack notification for bugs
async function notifyBugReport(bug: BugReport) {
  if (bug.severity === 'CRITICAL') {
    // Urgent channel + email
    await sendToSlack('#urgent-bugs', formatBug(bug))
    await sendEmail(ADMIN_EMAIL, 'Critical Bug', bug)
  } else {
    // Regular bug channel
    await sendToSlack('#bugs', formatBug(bug))
  }
}

// Email user when bug is resolved
async function notifyBugResolved(bug: BugReport) {
  await sendEmail(bug.user.email, 
    `Bug #${bug.ticketNumber} has been resolved`,
    { resolution: bug.resolution }
  )
}
```

### Feature Requests (Public)
```typescript
// Weekly digest of top features
async function weeklyFeatureDigest() {
  const topFeatures = await getTopVotedFeatures(10)
  await sendToSlack('#product', formatDigest(topFeatures))
}

// Notify subscribers of status changes
async function notifyFeatureUpdate(feature: FeatureRequest) {
  const subscribers = await getSubscribers(feature.id)
  for (const sub of subscribers) {
    await sendEmail(sub.email, 
      `Update: ${feature.title}`,
      { status: feature.status, adminResponse: feature.adminResponse }
    )
  }
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (3 hours)
- [ ] Feedback widget component
- [ ] Database schema migration
- [ ] Basic API endpoints

### Phase 2: Bug Reporting System (2 hours)
- [ ] Bug submission form
- [ ] Ticket generation system
- [ ] My tickets page
- [ ] Admin bug queue

### Phase 3: Feature Forum (3 hours)
- [ ] Feature submission form
- [ ] Public forum page
- [ ] Voting system
- [ ] Comment threads
- [ ] Admin moderation

### Phase 4: Notifications & Roadmap (2 hours)
- [ ] Slack/Discord webhooks
- [ ] Email notifications
- [ ] Public roadmap page
- [ ] Status update flows

## Success Metrics

### Bug Reporting
- [ ] Average first response < 2 hours
- [ ] Critical bug resolution < 24 hours
- [ ] User satisfaction > 4/5 stars

### Feature Forum
- [ ] > 20% of users vote on features
- [ ] > 10% submit feature requests
- [ ] Average 5+ comments per feature

### Overall
- [ ] > 15% of active users engage with feedback system
- [ ] < 5% duplicate bug reports
- [ ] > 50% beta tester participation

## Key Design Decisions

1. **Separate Systems**: Bugs are private (sensitive data), features are public (community engagement)
2. **Ticket Numbers**: Give bugs formal tracking numbers for professional support feel
3. **Voting System**: One vote per user per feature, no downvoting
4. **Comment Threading**: Flat comments (no nested replies) for simplicity
5. **Email Notifications**: Configurable per user (instant, daily digest, or none)
6. **Admin Responses**: Highlighted differently in public forum for official communication

## Security Considerations

1. **Bug Reports**: May contain sensitive screenshots - store securely, never make public
2. **Rate Limiting**: Prevent spam submissions (max 10 per user per day)
3. **Voting**: Enforce one vote per user, prevent gaming the system
4. **Moderation**: Admin ability to hide inappropriate comments/features
5. **Data Privacy**: Don't expose user emails in public forum (use display names)

## Next Steps
- Task 39: Analytics Dashboard (track feedback metrics)
- Task 40: Public Changelog (announce shipped features)
- Task 41: In-app Help Documentation