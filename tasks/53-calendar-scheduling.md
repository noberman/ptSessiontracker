# Task 53: Calendar & Scheduling

## Problem

1. Sessions are planned externally (WhatsApp, other platforms). Trainers log sessions AFTER they happen. The platform only captures that a session occurred + client validation. There is no appointment, reminder, or feedback system.

2. Managers and sales staff cannot book fitness assessments or sessions for trainers because there is no way for trainers to indicate their working days and hours. Club managers need to see trainer availability to book appointments on their behalf (e.g., fitness assessments for prospective clients).

## Solution

Move session planning INTO the platform, enabling a complete workflow:

```
Trainer Sets Availability → Appointment Created → Reminder Email → Session Happens → Log Session → Validation Email → Feedback Collection
```

**Feature flag:** `FEATURE_CALENDAR_ENABLED` at org level. Gradual rollout to test organizations before franchisees.

---

## Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Availability model | Flexible calendar-event style: set recurring weekly defaults OR one-off day-by-day. Trainers can override specific days. |
| 2 | Who sets trainer availability? | Org-level setting: "Manager only" or "Manager & Trainer". Configurable in org settings. Admin, PT Manager, and Club Manager can always set it; trainers can only if the org allows. |
| 3 | Who can book on behalf of a trainer? | Admin, PT Manager, Club Manager. Trainers cannot book into each other's calendars. |
| 4 | Fitness assessments | Distinct appointment type. Same duration as regular session but does NOT deduct a package credit. It's a free sales appointment. Prospects (not yet clients) can be booked — name + email entered, converted to client after assessment. |
| 5 | Appointment types | `SESSION` (links to package, deducts credit) and `FITNESS_ASSESSMENT` (no package, no credit deduction). Hard-coded for MVP; custom types deferred to future iteration. |
| 6 | Time slot granularity | 15 minutes. Appointments can start at :00, :15, :30, :45. |
| 7 | Settings split | Org-level settings (who can edit availability) → `/settings`. Actual availability and appointments → within the calendar page. |
| 8 | Manager default view | Multi-trainer overview (desktop). Trainer columns with availability and appointments visible. |

---

## User Stories

### Trainer
- Set my working hours (if org allows) so managers know when I'm available
- Schedule appointments with clients so they receive reminders
- See week view with hourly slots to manage schedule
- Convert an appointment to a logged session easily after it happens
- See own performance metrics (validation rates, feedback scores, client retention)

### Club Manager / PT Manager / Admin
- Set trainer working hours/availability
- See all trainer schedules and available slots to understand capacity
- Book appointments (sessions or fitness assessments) on behalf of trainers into their available slots
- Book fitness assessments for prospects not yet in the system
- See aggregated feedback scores per trainer

### Client (via email)
- Receive a reminder before session
- Validate session and optionally provide feedback on the same page

---

## Features

### 53.1 Trainer Availability
- Trainers (or managers, depending on org setting) define working hours
- **Recurring availability:** Set a weekly template (e.g., Mon 8am-4pm, Wed 10am-6pm, Fri 9am-3pm) that repeats
- **One-off overrides:** Add or remove availability for specific dates (e.g., off next Tuesday, working this Saturday)
- Multiple blocks per day supported (e.g., 9am-12pm + 1pm-5pm for lunch break)
- Calendar-event style UX — similar to how you set events in Google Calendar (recurring or specific)
- Availability visible on calendar views — shows open vs booked slots
- Org setting to control who can edit: "Manager only" or "Manager & Trainer"
- 15-minute time slot granularity

### 53.2 Appointment Management
- Create appointment: client, trainer, date, time, duration, location
- **Appointment types:**
  - `SESSION` — regular training session, links to package, deducts credit on completion
  - `FITNESS_ASSESSMENT` — sales appointment, no package link, no credit deduction. Can be booked for prospects (name + email, not yet a client in the system).
- Individual appointments only (no recurring in MVP)
- Edit/cancel appointments
- Validation: appointment must fall within trainer's available hours
- Booking roles: Admin, PT Manager, Club Manager can book on behalf of trainers. Trainers book their own.

### 53.3 Calendar Views
- **Trainer view:** Week view with hourly breakdown (primary view). Shows availability blocks + appointments.
- **Manager view:** Multi-trainer overview as default. All trainers at a location shown as columns. Click trainer to zoom into single-trainer view.
- Day/month views as secondary options

### 53.4 Notifications
- Reminder email to client (configurable: 24h before, 1h before, etc.)
- Appointment confirmation email on creation
- Cancellation notification

### 53.5 Session Integration
- Appointment → "Log Session" action (for SESSION type only)
- Pre-populates session form with appointment details
- Existing no-show handling applies (no commission, credit used)
- Appointment status: Scheduled → Completed / No-Show / Cancelled
- FITNESS_ASSESSMENT: marked as Completed or No-Show but no session/credit impact

### 53.6 Feedback Collection
- Added to existing validation confirmation page (non-invasive)
- Client validates session, then sees optional feedback questions
- Questions vary by frequency:
  - Every session: "How was your session?" (1-5 stars)
  - Every 5-10 sessions: "How is your trainer?" (1-5 stars), energy/soreness check
- Feedback stored and linked to session + trainer

---

## UX & User Flows

### Navigation
- Calendar is a **new top-level nav item** between Dashboard and Sessions
- All roles see it (trainers see own calendar, managers see multi-trainer view)

### Desktop UX

**Trainer calendar:**
- Week view. Horizontal = days (Mon-Sun), vertical = 15-minute time slots
- Availability blocks shown as light background shading (working hours)
- Appointments shown as colored event blocks within those hours
- Click an empty available slot → appointment creation modal
- Click an existing appointment → appointment detail modal

**Manager calendar:**
- Lands on **multi-trainer overview** by default
- Columns = trainers at the selected location, rows = time slots
- Each trainer column shows their availability shading + booked appointments
- Open slots are clearly visible for booking
- Click an open slot in a trainer's column → appointment creation modal (trainer pre-filled)
- Click a trainer's name/column header → zoom into single-trainer full calendar view
- Location filter at top (for managers with multiple locations)
- Back button to return to overview

**Modals (desktop):**
- Appointment creation: modal pop-out over the calendar (stays in context)
- Appointment detail: modal showing details + action buttons
- Availability editing: modal or inline on the calendar

### Mobile UX

**Calendar navigation:**
- Default: 1-day view
- Option to switch to 3-day view
- Swipe left/right to navigate between days
- "Today" button to jump back to current day
- "Set Availability" CTA at top — only visible if user has edit permission

**Manager on mobile:**
- Horizontal scrollable trainer chips/tabs at top
- Tap a trainer chip to see their calendar
- "All" option shows agenda/list view for the day: all appointments across all trainers grouped by time

**Creating a new appointment (mobile):**
- Bottom sheet slides up from the bottom
- Can be pushed up to full-screen modal
- Fill in details: client, type, package (if session), duration, notes
- Confirm to create, swipe down to cancel
- Same pattern as creating an event in iOS/Google Calendar

**Viewing an existing appointment (mobile):**
- Tap the appointment on the calendar
- Appointment expands into a full-screen detail view (not a bottom sheet — different visual pattern from creation)
- Shows all details: client, time, type, status, notes
- Prominent "Log Session" button (for SESSION type) or "Mark Completed" (for FITNESS_ASSESSMENT)
- Other actions: No-Show, Cancel, Edit
- Back/swipe to return to calendar

### Key User Flows

**Flow 1: Trainer sets availability**
```
Calendar page → "Set Availability" CTA →
Weekly grid (Mon-Sun × 15-min time slots) →
Click/drag to mark working hours per day →
Save → recurring schedule set

Override a specific day:
Click that day → "Block this day" or "Change hours for this day only"
```

**Flow 2: Manager books fitness assessment for a prospect**
```
Calendar page (multi-trainer overview) →
Select trainer column or pick from dropdown →
See their week with available slots highlighted →
Click an open slot → appointment creation modal →
Select type: "Fitness Assessment" →
Enter prospect name + email (or search existing client) →
Confirm → Appointment created →
Confirmation email sent to prospect
```

**Flow 3: Trainer books a session for their client**
```
Calendar page (own calendar) →
Click an open slot → appointment creation modal →
Type defaults to "Session" →
Select client → Select package (auto-populates if client has one) →
Confirm → Appointment created → Reminder email queued
```

**Flow 4: Appointment → Logged Session**
```
Day of appointment → Trainer opens calendar →
Sees today's appointments → Clicks the appointment →
Detail view shows "Log Session" button →
Click → Session form opens pre-filled (client, date, time, location, package) →
Submit → Session created, appointment marked COMPLETED →
Validation email sent to client →
Client validates + optional feedback
```

**Flow 5: No-Show**
```
Appointment time passes → Trainer opens appointment →
Clicks "No-Show" → Appointment marked NO_SHOW →
(If SESSION type: credit used but no commission, matching existing logic)
```

**Flow 6: Client receives reminder**
```
24h before appointment → Cron job fires →
Email sent: "Reminder: You have a session with [Trainer] tomorrow at [Time] at [Location]" →
Client sees it → shows up (or doesn't)
```

**Flow 7: Fitness assessment for prospect → client conversion**
```
Fitness assessment completed → Manager marks as Completed →
If prospect is not yet a client → prompt to create client record →
Pre-fill name + email from appointment → Create client →
Optionally assign package immediately
```

---

## Schema Changes

### TrainerAvailability

```prisma
model TrainerAvailability {
  id              String      @id @default(cuid())
  trainerId       String
  organizationId  String

  // Recurring weekly schedule
  dayOfWeek       Int?        // 0=Sunday, 1=Monday, ... 6=Saturday (null for one-off)
  startTime       String      // "09:00" (HH:mm format, 15-min increments)
  endTime         String      // "17:00" (HH:mm format, 15-min increments)

  // One-off override for a specific date
  specificDate    DateTime?   // Set for date-specific overrides, null for recurring
  isAvailable     Boolean     @default(true) // false = blocked off (e.g., day off override)

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  trainer         User        @relation(fields: [trainerId], references: [id])
  organization    Organization @relation(fields: [organizationId], references: [id])

  @@index([trainerId, dayOfWeek])
  @@index([trainerId, specificDate])
  @@map("trainer_availability")
}
```

**Logic:**
- Recurring entries: `dayOfWeek` set, `specificDate` null → applies every week
- One-off entries: `specificDate` set, `dayOfWeek` null → applies to that date only
- Day-off override: `specificDate` set, `isAvailable = false` → blocks a recurring day
- Multiple blocks per day: multiple rows for same dayOfWeek (e.g., 9:00-12:00 + 13:00-17:00)
- Resolution: specific date entries override recurring entries for that day

### Appointment

```prisma
model Appointment {
  id              String      @id @default(cuid())
  trainerId       String
  clientId        String?     // Nullable for FITNESS_ASSESSMENT with prospects
  locationId      String
  packageId       String?     // Optional link to package (null for FITNESS_ASSESSMENT)

  type            AppointmentType @default(SESSION)
  scheduledAt     DateTime    // Date and time of appointment
  duration        Int         @default(60) // Duration in minutes

  status          AppointmentStatus @default(SCHEDULED)

  // Prospect info (for FITNESS_ASSESSMENT when client doesn't exist yet)
  prospectName    String?
  prospectEmail   String?

  reminderSentAt  DateTime?
  bookedById      String?     // Who created the appointment (trainer or manager)

  // Links to session when completed (SESSION type only)
  sessionId       String?     @unique

  notes           String?

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  organizationId  String

  trainer         User        @relation("TrainerAppointments", fields: [trainerId], references: [id])
  client          Client?     @relation(fields: [clientId], references: [id])
  location        Location    @relation(fields: [locationId], references: [id])
  package         Package?    @relation(fields: [packageId], references: [id])
  session         Session?    @relation(fields: [sessionId], references: [id])
  bookedBy        User?       @relation("BookedByAppointments", fields: [bookedById], references: [id])
  organization    Organization @relation(fields: [organizationId], references: [id])

  @@index([trainerId, scheduledAt])
  @@index([organizationId, scheduledAt])
  @@map("appointments")
}

enum AppointmentType {
  SESSION             // Regular training session — links to package, deducts credit
  FITNESS_ASSESSMENT  // Sales appointment — no package, no credit deduction
}

enum AppointmentStatus {
  SCHEDULED
  COMPLETED
  NO_SHOW
  CANCELLED
}
```

### SessionFeedback

```prisma
model SessionFeedback {
  id              String      @id @default(cuid())
  sessionId       String      @unique

  sessionRating   Int?        // 1-5 stars
  trainerRating   Int?        // 1-5 stars (collected less frequently)
  energyLevel     Int?        // 1-5
  sorenessLevel   Int?        // 1-5
  comments        String?

  collectedAt     DateTime    @default(now())

  session         Session     @relation(fields: [sessionId], references: [id])

  @@map("session_feedback")
}
```

### Organization (new setting)

```prisma
// Add to Organization model:
availabilityEditableBy  String  @default("MANAGER_ONLY") // "MANAGER_ONLY" or "MANAGER_AND_TRAINER"
```

---

## Implementation Steps

### Step 1: Schema & Foundation (Complexity: 4)
- [ ] Add TrainerAvailability, Appointment, SessionFeedback models to Prisma schema
- [ ] Add AppointmentType, AppointmentStatus enums
- [ ] Add `availabilityEditableBy` field to Organization model
- [ ] Create and run migration
- [ ] Update `/docs/schema.md`
- [ ] Add feature flag field to Organization model (or use org settings)

### Step 2: Trainer Availability API & UI (Complexity: 6)
- [ ] `GET /api/availability/[trainerId]` — get availability for a trainer (recurring + overrides for date range)
- [ ] `POST /api/availability` — create recurring or one-off availability entry
- [ ] `PUT /api/availability/[id]` — edit availability entry
- [ ] `DELETE /api/availability/[id]` — remove availability entry
- [ ] Availability resolution logic: merge recurring + specific date overrides
- [ ] Permission check: org setting controls whether trainer can edit own availability
- [ ] Availability settings UI (set weekly schedule, add overrides)
- [ ] Org settings UI: "Manager only" / "Manager & Trainer" toggle

### Step 3: Appointment CRUD API (Complexity: 6)
- [ ] `POST /api/appointments` — create appointment (validate against trainer availability)
- [ ] `GET /api/appointments` — list with filters (trainer, date range, location, status, type)
- [ ] `PUT /api/appointments/[id]` — edit appointment
- [ ] `DELETE /api/appointments/[id]` — cancel appointment (set status to CANCELLED)
- [ ] Booking permission check: trainers book own, managers book on behalf
- [ ] Validate appointment falls within trainer's available hours
- [ ] FITNESS_ASSESSMENT type: support prospect fields (name + email) when no clientId
- [ ] SESSION type: require clientId and validate package

### Step 4: Trainer Calendar View (Complexity: 7)
- [ ] Week view component with 15-minute time slots
- [ ] Show availability blocks (working hours) as background shading
- [ ] Display appointments with client name, time, duration, type
- [ ] Color coding by appointment type and status
- [ ] Click empty available slot → appointment creation modal
- [ ] Click existing appointment → appointment detail modal
- [ ] "Set Availability" CTA (visible if user has permission)
- [ ] Mobile: 1-day view (default) or 3-day view, swipe left/right to navigate
- [ ] Mobile: bottom sheet for new appointment, expand-to-fullscreen for existing

### Step 5: Manager Calendar View (Complexity: 7)
- [ ] Desktop: multi-trainer overview — columns per trainer, rows per time slot
- [ ] Show each trainer's availability shading + booked appointments
- [ ] Click open slot in trainer column → appointment creation modal (trainer pre-filled)
- [ ] Click trainer name → zoom into single-trainer full view, back button to return
- [ ] Location filter at top
- [ ] Mobile: horizontal trainer chips/tabs, tap to switch trainer
- [ ] Mobile "All" view: agenda/list of all appointments grouped by time

### Step 6: Session Integration (Complexity: 6)
- [ ] "Log Session" action on SESSION-type appointments
- [ ] Pre-populate session form with appointment details (client, date, time, location, package)
- [ ] Update appointment status on session creation (SCHEDULED → COMPLETED)
- [ ] Handle no-shows (SCHEDULED → NO_SHOW)
- [ ] FITNESS_ASSESSMENT: mark Completed/No-Show only, no session or credit impact
- [ ] Prospect conversion flow: prompt to create client after completed fitness assessment
- [ ] Review existing no-show code in `/api/sessions/route.ts`

### Step 7: Reminder Email System (Complexity: 6)
- [ ] Cron job or scheduled task to check upcoming appointments
- [ ] Send reminder email via existing email service (Resend)
- [ ] Configurable reminder timing (24h before default)
- [ ] Track `reminderSentAt` to avoid duplicates
- [ ] Appointment confirmation email on creation
- [ ] Cancellation notification email
- [ ] Support sending to prospect email (for FITNESS_ASSESSMENT)

### Step 8: Feedback Collection (Complexity: 5)
- [ ] SessionFeedback API endpoints (create, get by session)
- [ ] Update validation confirmation page to include feedback form
- [ ] Star ratings UI (1-5 stars, tap to select)
- [ ] Optional text comment
- [ ] Prominent skip option
- [ ] Frequency logic for trainer rating questions

### Step 9: Feedback Dashboard (Complexity: 4)
- [ ] Trainer feedback dashboard (own scores over time)
- [ ] Manager feedback overview (per-trainer aggregated scores)
- [ ] Integration with existing dashboard

---

## Technical Notes

- 15-minute time slot granularity throughout (availability, appointment scheduling, calendar grid)
- Review existing no-show code in session creation (`/api/sessions/route.ts`)
- Reminder emails via existing email service (Resend)
- Cron job for reminders — consider Railway cron or `/api/cron/` endpoint
- Feature flag check on all calendar routes and UI components
- Availability resolution: specific date entries always win over recurring entries for that day
- `bookedById` on Appointment tracks who made the booking (for audit)
- Prospect fields on Appointment: `prospectName` + `prospectEmail` used when `clientId` is null
- Calendar library options: react-big-calendar, FullCalendar, or custom build

## Open Questions

1. Reminder timing: what intervals? Configurable per org?
2. Feedback frequency: exact logic for "every N sessions" trainer rating questions
3. Calendar library: build custom or use react-big-calendar / similar?
4. Should fitness assessments show on existing session/commission reports (as zero-value entries) or be excluded?

## Success Metrics

- Appointment adoption rate (% sessions with prior appointment)
- Feedback response rate
- Client retention correlation with feedback scores
- Manager booking rate (% appointments booked by managers vs trainers)
