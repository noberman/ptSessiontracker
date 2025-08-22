## Personal Training Session Management System

### 1. Executive Summary

**Product Name:** PT Session Tracker

**Purpose:** Replace the paper-based session tracking system with a digital solution that streamlines session validation, eliminates manual data entry, and automates payroll calculations for personal trainers.

**Key Problem:** Currently, trainers log sessions on paper, manually transfer to Excel with photos, and HR must aggregate all data to calculate monthly execution commissions. This process is time-consuming, error-prone, and difficult to audit.

**Solution:** A web-based, mobile-friendly application that digitally tracks sessions, validates completion via email confirmation, and automatically calculates commission payouts based on tiered percentages and session values.

### 2. Objectives & Success Metrics

**Primary Objectives:**

- Eliminate paper-based session tracking
- Automate commission calculations
- Provide real-time visibility into session completion and payroll obligations
- Ensure session validation authenticity

**Success Metrics:**

- 100% reduction in paper form usage
- 80% reduction in time spent on payroll calculations
- 90%+ session validation rate
- Zero payroll calculation errors

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

- **Tiered System (Monthly Reset)**
    - Configure tiers (e.g., 0-30 sessions: 25%, 31-60: 30%, 61+: 35%)
    - Rate based on total sessions achieved
    - **Single rate applies to ALL sessions** (not progressive)
    - Only validated sessions count
    - No-shows excluded
- **Payout Calculation**
    - Total Session Value × Commission Percentage
    - Example: 65 sessions = 35% rate on ALL 65 sessions
    - Real-time tier progress visibility

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

### 12. Open Questions / Decisions Needed

1. Validation link expiration time (suggested 30 days)
2. Reminder email frequency for unvalidated sessions
3. Historical data import requirements
4. Specific commission tier breakpoints
5. Session edit permissions and time limits