## Personal Training Session Management System

### 1. Executive Summary

**Product Name:** PT Session Tracker

**Purpose:** Replace the paper-based session tracking system with a digital solution that streamlines session validation, eliminates manual data entry, and automates payroll calculations for personal trainers.

**Key Problem:** Currently, trainers log sessions on paper, manually transfer to Excel with photos, and HR must aggregate all data to calculate monthly execution commissions. This process is time-consuming, error-prone, and difficult to audit.

**Solution:** A web-based, mobile-friendly application that digitally tracks sessions, validates completion via email confirmation, and automatically calculates commission payouts based on tiered percentages and session values.

### 2. Core User Stories & Objectives

**Three Critical User Stories:**

#### A. Commission Calculation (Admin/HR)
**Story:** As an admin, I need to automatically calculate PT commissions based on their validated sessions so that payroll is accurate and timely.
- **Current Pain:** Manual Excel aggregation, error-prone calculations, time-consuming
- **Solution:** Automated tiered commission calculations with real-time visibility
- **Status:** ✅ Implemented (Progressive & Graduated tier systems)

#### B. Program Quality Control (PT Manager)
**Story:** As a PT Manager, I need to review and approve the training programs that PTs create for clients to ensure quality and consistency.
- **Current Pain:** No visibility into training programs, can't ensure quality standards
- **Solution:** Centralized program repository with approval workflow
- **Status:** 🔄 To be implemented

#### C. Frictionless Program Import (Personal Trainers)
**Story:** As a PT, I need to quickly import my existing training programs from PDFs, Excel sheets, or even photos without manual data entry.
- **Current Pain:** Laborious manual program creation, high friction for onboarding
- **Solution:** AI-powered import system that can:
  - Accept screenshots, PDFs, Excel files, or photos
  - Automatically parse exercises, sets, reps, and structure
  - Match to existing exercise database or create new entries
  - Connect programs to correct clients
  - Handle various formats (table, list, handwritten)
- **Status:** 🔄 To be implemented (High Priority)

**Success Metrics:**

- 100% reduction in paper form usage
- 80% reduction in time spent on payroll calculations
- 90%+ session validation rate
- Zero payroll calculation errors
- <5 minutes to import a complete training program
- 95% accuracy in AI program parsing
- 100% of programs reviewed by PT Manager before client use

### 3. User Personas

### 3.1 Personal Trainer

- **Needs:** Easy session logging, view their progress toward commission tiers
- **Pain Points:** Manual Excel entry, keeping track of paper forms
- **Tech Savvy:** Moderate, comfortable with mobile devices

### 3.2 Club Manager

- **Needs:** Oversight of their club's trainers, ensure data accuracy
- **Pain Points:** Reconciling Glofox data with paper records
- **Responsibilities:** 1 club location, 2-3 trainers

### 3.3 PT Manager

- **Needs:** Multi-club visibility, trainer performance tracking
- **Pain Points:** Aggregating data across locations
- **Responsibilities:** Multiple clubs, all trainers

### 3.4 HR/Payroll Admin

- **Needs:** Accurate monthly commission calculations, clear payout reports
- **Pain Points:** Manual aggregation of Excel files, calculation errors
- **Tech Savvy:** Comfortable with Excel exports and reports

### 3.5 Client

- **Needs:** Simple session confirmation process
- **Pain Points:** None currently (just signing paper)
- **Tech Savvy:** Variable, must accommodate all levels

### 4. Functional Requirements

### 4.1 Core Features

### 4.1.1 Session Management

- **Create Session Record**
    - Trainer selects client from their assigned list
    - System auto-populates package type and session value
    - Captures: Date, time, location, trainer, client
    - Session marked as "Pending Validation"
- **Session Validation**
    - Email sent to client immediately after session creation
    - Email contains session details and confirmation link
    - One-click confirmation (no login required)
    - Validation timestamp recorded
    - Sessions without validation are flagged in reports

### 4.1.2 User Management

- **Trainer Profiles**
    - Assigned to one primary location
    - Linked to multiple clients
    - View own sessions and sessions progress
- **Client Profiles**
    - Basic info (name, email)
    - Linked packages with session values
    - Session history
- **Manager Access Levels**
    - Club Manager: Access to one club location
    - PT Manager: Access to multiple clubs
    - Admin: Full system access

### 4.1.3 Package Management

- Define package types (e.g., "12 sessions for $1,200")
- Calculate per-session value automatically
- Link packages to clients
- Track remaining sessions (display only, not blocking)

### 4.1.4 Commission Calculation

**See `/docs/COMMISSION_SYSTEM_DESIGN.md` for complete commission system architecture and calculation methods.**

- Multiple calculation methods supported per organization
- Only validated sessions count toward commission
- No-shows excluded from calculations
- Monthly reset for tier progression
- Real-time tier progress visibility
- Configurable by organization admin

### 4.1.5 Reporting

- **Trainer View**
    - Current month progress
    - Commission tier status
    - Pending validations
- **Manager Views**
    - Club-level summaries
    - Trainer performance
    - Validation rates
- **Payroll Report (Monthly)**
    - Trainer name
    - Total completed sessions
    - Commission tier achieved
    - Total session value
    - Commission percentage
    - Total payout amount
    - Export to Excel/CSV

### 4.2 System Features

### 4.2.1 Notifications

- Email to client for session validation
- Reminder emails for unvalidated sessions (to trainers)
- Monthly report ready notifications

### 4.2.2 Data Management

- No Glofox integration required
- Manual entry/import for client and package data
- Session data retention for minimum 13 months
- Audit trail for all changes

### 5. Non-Functional Requirements

### 5.1 Performance

- Page load time < 3 seconds
- Support 50 concurrent users
- Handle 500 sessions/month

### 5.2 Security

- Secure login for trainers/managers/admin
- No financial data storage
- Minimal PII (name, email only)
- Session validation links expire after 30 days

### 5.3 Usability

- Mobile-responsive design
- Work on smartphones and tablets
- Intuitive navigation
- Minimal training required

### 5.4 Reliability

- 99% uptime during business hours
- Daily automated backups
- Data export capability

### 6. User Flows

### 6.1 Session Completion Flow

1. Trainer opens app on mobile
2. Selects "New Session"
3. Chooses client from dropdown
4. Confirms date/time/location
5. Submits session
6. System sends email to client
7. Client clicks confirmation link
8. Session marked as validated

### 6.2 Monthly Payroll Flow

1. Admin accesses reports section
2. Selects "Monthly Payroll Report"
3. Reviews summary by trainer
4. Exports to Excel
5. Uploads to payroll system

### 6.3 Manager Reconciliation Flow

1. Manager views club dashboard
2. Compares session counts with Glofox
3. Identifies discrepancies
4. Adjusts session records if needed
5. Cannot modify validation status

### 7. Technical Architecture

### 7.1 Tech Stack (Optimized for Solo Development)

- **Frontend:** React with Tailwind CSS
- **Backend:** Node.js with Express
- **Database:** PostgreSQL
- **Hosting:** Railway
- **Email:** SendGrid or similar

### 7.2 Database Schema (Simplified)

`Users Table
- id, email, name, role, location_id, created_at

Locations Table
- id, name, address

Clients Table
- id, name, email, location_id

Packages Table
- id, client_id, name, total_value, total_sessions

Sessions Table
- id, trainer_id, client_id, package_id, location_id
- session_date, created_at, validated_at
- validation_token, session_value

Commission_Tiers Table
- id, min_sessions, max_sessions, percentage`

### 8. MVP Scope

### Phase 1 (MVP)

- Basic user authentication
- Session creation and email validation
- Simple reporting (view only)
- Manual commission tier setup
- Excel export for payroll

### Phase 2 (Post-MVP)

- Package management interface
- Automated reminders
- Advanced reporting filters
- Bulk session entry
- Mobile app consideration

### 9. Risks & Mitigation

```
RiskImpactMitigationLow email validation ratesIncomplete payroll dataReminder system, manager follow-upTrainers forgetting to log sessionsMissing revenueDaily session entry remindersEmail delivery issuesCannot validate sessionsBackup validation method, monitoringData discrepancies with GlofoxConfusion, distrustClear reconciliation process
```

### 10. Success Criteria

**Launch Success:**

- All trainers actively using system
- 80%+ sessions logged within 24 hours
- 90%+ validation rate
- Accurate first monthly payroll run

**Long-term Success:**

- Complete paper elimination
- HR time savings of 10+ hours/month
- Zero payroll disputes
- Positive trainer feedback

### 11. Implementation Timeline

**Week 1-2:** Database design and authentication
**Week 3-4:** Session management and validation
**Week 5-6:** Reporting and exports
**Week 7:** Testing and refinement
**Week 8:** Deployment and training

### 12. Program Management System (Phase 2 Priority)

#### 12.1 AI-Powered Program Import
**Objective:** Zero-friction onboarding for PTs to import existing programs

**Technical Implementation:**
- **Frontend:** Drag-and-drop interface accepting multiple formats
  - Images (PNG, JPG) - screenshots or photos
  - Documents (PDF, DOCX)
  - Spreadsheets (Excel, CSV)
  - Direct paste from clipboard
  
- **AI Processing Pipeline:**
  1. **OCR Layer** (for images/PDFs): Extract text using Tesseract or Cloud Vision API
  2. **Structure Recognition**: Identify tables, lists, or structured data
  3. **NLP Parser**: Extract exercise names, sets, reps, weights, rest periods
  4. **Exercise Matching**: 
     - Fuzzy match against exercise database
     - Handle variations (e.g., "bench press" = "barbell bench press" = "BP")
     - Auto-create new exercises with suggested muscle groups
  5. **Program Assembly**: Structure into weeks, days, and workout blocks
  6. **Validation**: Flag ambiguities for PT review

**User Flow:**
1. PT uploads/pastes program in any format
2. AI processes and shows preview with confidence scores
3. PT reviews and corrects any misinterpretations
4. Program saved and linked to client(s)
5. PT Manager notified for approval

#### 12.2 Program Quality Control System
**For PT Managers to maintain standards:**

- **Program Repository:**
  - Centralized database of all programs
  - Version control for program updates
  - Template library for common programs
  
- **Approval Workflow:**
  - New programs require PT Manager approval
  - Automated checks for completeness
  - Comments and revision requests
  - Approval status tracking
  
- **Quality Metrics:**
  - Program completion rates
  - Client progress tracking
  - Exercise variety and progression
  - Compliance with gym standards

#### 12.3 Database Schema Extensions

```prisma
model Program {
  id              String @id @default(cuid())
  name            String
  trainerId       String
  status          ProgramStatus @default(DRAFT)
  approvedBy      String?
  approvalDate    DateTime?
  clientId        String?
  templateType    String?
  importMethod    ImportMethod?
  aiConfidence    Float?
  weeks           ProgramWeek[]
  exercises       ProgramExercise[]
  revisions       ProgramRevision[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Exercise {
  id              String @id @default(cuid())
  name            String @unique
  aliases         String[] // Alternative names
  category        String // Strength, Cardio, Flexibility
  muscleGroups    String[]
  equipment       String?
  instructions    String?
  videoUrl        String?
  createdBy       String?
  aiGenerated     Boolean @default(false)
}

model ProgramExercise {
  id              String @id @default(cuid())
  programId       String
  exerciseId      String
  dayNumber       Int
  orderInDay      Int
  sets            Int
  reps            String // Can be range like "8-12"
  weight          String? // Can be "BW" or "70%" etc
  restSeconds     Int?
  notes           String?
}

enum ProgramStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  REJECTED
  ARCHIVED
}

enum ImportMethod {
  MANUAL
  PDF_UPLOAD
  IMAGE_UPLOAD
  EXCEL_IMPORT
  AI_ASSISTED
}
```

### 13. Implementation Roadmap

**Phase 1 (Current - Completed):**
- ✅ Session tracking
- ✅ Commission calculations
- ✅ Basic reporting

**Phase 2 (Next Priority):**
- AI-powered program import system
- Exercise database with fuzzy matching
- Basic program approval workflow

**Phase 3:**
- Advanced program analytics
- Client progress tracking
- Program recommendation engine

**Phase 4:**
- Mobile app for program execution
- Video exercise demonstrations
- Real-time form checking (using phone camera)

### 14. Open Questions / Decisions Needed

1. Validation link expiration time (suggested 30 days)
2. Reminder email frequency for unvalidated sessions
3. Historical data import requirements
4. Specific commission tier breakpoints
5. Session edit permissions and time limits
6. Preferred AI service (OpenAI GPT-4 Vision, Google Cloud Vision, AWS Textract)
7. Exercise database source (create custom vs. integrate existing)
8. Program approval SLA for PT Managers