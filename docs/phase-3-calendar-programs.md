# Phase 3: Calendar, Programs & Client Progress

## Overview

Phase 3 introduces two major interconnected modules to transform PT Session Tracker from a session logging and commission tool into a comprehensive training management platform.

**Timeline:** MVP target 4-6 weeks (February - March 2026)

**Approach:**
- Feature branch development with org-level feature flags
- Calendar module first (faster to ship)
- Programs module second (requires UX iteration)
- Gradual rollout to test organizations before franchisees

---

## Module 1: Calendar & Scheduling

### Goal
Move session planning INTO the platform, enabling a complete workflow from scheduling through validation and feedback collection.

### Current State
- Sessions are planned externally (WhatsApp, other platforms)
- Trainers log sessions AFTER they happen
- Only captures that session occurred + client validation
- No appointment/reminder system

### Target State
```
Appointment Created → Reminder Email → Session Happens → Log Session → Validation Email → Feedback Collection
```

### User Stories

#### Trainer
- As a trainer, I want to schedule appointments with my clients so they receive reminders
- As a trainer, I want to see my week view with hourly slots so I can manage my schedule
- As a trainer, I want to convert an appointment to a logged session easily after it happens
- As a trainer, I want to see my own performance metrics (validation rates, feedback scores, client retention)

#### Club Manager / PT Manager
- As a manager, I want to see all trainer schedules to understand capacity
- As a manager, I want to book appointments on behalf of trainers
- As a manager, I want to see aggregated feedback scores per trainer

#### Client (via email)
- As a client, I want to receive a reminder before my session so I don't forget
- As a client, I want to validate my session and optionally provide feedback on the same page

### Features

#### Appointment Management
- Create appointment: client, trainer, date, time, duration, location
- Individual appointments only (no recurring in MVP)
- Edit/cancel appointments
- Link to existing packages (deduct session on completion)

#### Calendar Views
- **Trainer view:** Week view with hourly breakdown (primary view)
- **Manager view:** All trainers at a location, filterable
- Day/month views as secondary options

#### Notifications
- Reminder email to client (configurable: 24h before, 1h before, etc.)
- Appointment confirmation email on creation
- Cancellation notification

#### Session Integration
- Appointment → "Start Session" or "Log Session" action
- Pre-populates session form with appointment details
- Existing no-show handling applies (no commission, credit used)
- Appointment status: Scheduled → Completed / No-Show / Cancelled

#### Feedback Collection
- Added to existing validation confirmation page (non-invasive)
- Client validates session, then sees optional feedback questions
- Questions can vary by frequency:
  - Every session: "How was your session?" (1-5 stars)
  - Every 5-10 sessions: "How is your trainer?" (1-5 stars), energy/soreness check
- Feedback stored and linked to session + trainer

### Data Model Changes

```prisma
model Appointment {
  id              String      @id @default(cuid())
  trainerId       String
  clientId        String
  locationId      String
  packageId       String?     // Optional link to package

  scheduledAt     DateTime    // Date and time of appointment
  duration        Int         @default(60) // Duration in minutes

  status          AppointmentStatus @default(SCHEDULED)

  reminderSentAt  DateTime?

  // Links to session when completed
  sessionId       String?     @unique

  notes           String?

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  organizationId  String

  trainer         User        @relation(fields: [trainerId], references: [id])
  client          Client      @relation(fields: [clientId], references: [id])
  location        Location    @relation(fields: [locationId], references: [id])
  package         Package?    @relation(fields: [packageId], references: [id])
  session         Session?    @relation(fields: [sessionId], references: [id])
  organization    Organization @relation(fields: [organizationId], references: [id])
}

enum AppointmentStatus {
  SCHEDULED
  COMPLETED
  NO_SHOW
  CANCELLED
}

model SessionFeedback {
  id              String      @id @default(cuid())
  sessionId       String

  sessionRating   Int?        // 1-5 stars
  trainerRating   Int?        // 1-5 stars (collected less frequently)
  energyLevel     Int?        // 1-5
  sorenessLevel   Int?        // 1-5
  comments        String?

  collectedAt     DateTime    @default(now())

  session         Session     @relation(fields: [sessionId], references: [id])
}
```

### Technical Notes
- Review existing no-show code in session creation (`/api/sessions/route.ts`)
- Reminder emails via existing email service (Resend/SendGrid)
- Consider cron job or scheduled task for sending reminders
- Feature flag: `FEATURE_CALENDAR_ENABLED` at org level

---

## Module 2: Client Progress & Programs

### Goal
Capture what actually happens in training sessions, track client progress over time, and give managers visibility into training quality and client outcomes.

### Current State
- Client model has basic info (name, email, location)
- No goals or metrics tracking
- No program/workout logging
- No visibility into what happens during sessions
- Churn tracked but no context on why clients leave

### Target State
- Rich client profiles with goals and metrics
- Training programs with exercises, sets, reps, weights
- Per-session workout logging
- Progress visualization over time
- Manager dashboard for training quality oversight

### User Stories

#### Trainer
- As a trainer, I want to create training programs for my clients so they know what to do
- As a trainer, I want to log what was actually done in each session so I can track progress
- As a trainer, I want to use templates to quickly create programs
- As a trainer, I want to add custom exercises that aren't in the library
- As a trainer, I want to modify the program on the fly during a session
- As a trainer, I want to record client metrics (weight, body fat) periodically
- As a trainer, I want to see my client's progress over time

#### Club Manager / PT Manager
- As a manager, I want to see client profiles including their goals and progress
- As a manager, when a client churns, I want to review their history (programs, feedback, progress) to understand why
- As a manager, I want to see trainer performance metrics (client retention, feedback scores, client progress)
- As a manager, I want to identify at-risk clients (future enhancement)

#### Client (via email)
- As a client, I want to receive a PDF summary of my workout after each session

### Features

#### Client Profile Enhancements
- **Goals:** Text field for client's stated objectives
- **Body Metrics:** Weight, body fat %, measurements (tracked monthly)
- **Performance Metrics:** Derived from workout logs (volume, PRs)
- **Feedback History:** Aggregated from session feedback

#### Exercise Library
- Pre-populated database of common exercises
- Categories: Compound, Isolation, Cardio, Mobility, etc.
- Muscle groups tagged
- Custom exercises per organization
- Research needed: wger.de API, ExerciseDB, or similar

#### Program Builder
- Create from scratch or from templates
- Program structure:
  - Name, duration (e.g., 8 weeks)
  - Days per week
  - Workout days (e.g., Day A: Upper, Day B: Lower)
  - Exercises with sets, reps, weight/RPE targets
  - Warm-up, main work, accessories sections
- Template library:
  - Upper/Lower Split
  - Push/Pull/Legs
  - Full Body
  - 5x5 Strength
  - Custom org templates
- Assign program to client with start date
- **UX Priority:** Must be fast and easy - biggest differentiator vs competitors

#### Workout Logging (Per Session)
- When logging session, optionally record what was done
- Pre-populate from program (planned workout for that day)
- Log actual: exercise, sets, reps, weight
- Track planned vs actual
- Mobile-first UI (trainers on phones during sessions)
- Quick-log mode for speed

#### Progress Tracking
- Body metrics over time (charts)
- Exercise progression (weight/volume over time)
- Training volume trends
- Personal records (PRs) tracked automatically

#### Workout Summary PDF
- Generated after session
- Emailed to client
- Contains: date, exercises performed, sets/reps/weight
- Simple, clean format

#### Churn Analysis (Manager View)
When viewing a churned client, surface:
- Client profile & initial goals
- Programs they were on
- Session history & attendance patterns
- Feedback scores they gave
- Progress made (metrics, PRs)
- Their trainer's overall rating

### Data Model Changes

```prisma
// Enhanced Client model
model Client {
  // ... existing fields ...

  goals           String?     // Text description of client goals
  notes           String?     // General notes about client

  metrics         ClientMetric[]
  programs        ClientProgram[]
}

model ClientMetric {
  id              String      @id @default(cuid())
  clientId        String

  recordedAt      DateTime    @default(now())
  recordedBy      String      // Trainer who recorded

  weight          Float?      // kg
  bodyFatPercent  Float?

  // Measurements in cm
  chest           Float?
  waist           Float?
  hips            Float?
  armLeft         Float?
  armRight        Float?
  thighLeft       Float?
  thighRight      Float?

  notes           String?

  client          Client      @relation(fields: [clientId], references: [id])
  recorder        User        @relation(fields: [recordedBy], references: [id])
}

model Exercise {
  id              String      @id @default(cuid())
  name            String
  category        ExerciseCategory
  muscleGroups    String[]    // e.g., ["chest", "triceps"]
  description     String?
  videoUrl        String?

  isCustom        Boolean     @default(false)
  organizationId  String?     // null = global, set = org-specific

  organization    Organization? @relation(fields: [organizationId], references: [id])

  @@unique([name, organizationId])
}

enum ExerciseCategory {
  COMPOUND
  ISOLATION
  CARDIO
  MOBILITY
  WARM_UP
  OTHER
}

model ProgramTemplate {
  id              String      @id @default(cuid())
  name            String
  description     String?
  durationWeeks   Int
  daysPerWeek     Int

  isGlobal        Boolean     @default(false) // System-provided template
  organizationId  String?

  workouts        ProgramWorkout[]
  organization    Organization? @relation(fields: [organizationId], references: [id])
}

model ProgramWorkout {
  id              String      @id @default(cuid())
  templateId      String

  dayNumber       Int         // e.g., 1, 2, 3 for Day A, B, C
  name            String      // e.g., "Upper Body", "Legs"

  exercises       ProgramExercise[]
  template        ProgramTemplate @relation(fields: [templateId], references: [id])
}

model ProgramExercise {
  id              String      @id @default(cuid())
  workoutId       String
  exerciseId      String

  orderIndex      Int
  section         ExerciseSection @default(MAIN)

  sets            Int
  repsMin         Int
  repsMax         Int?        // For rep ranges like 8-12
  weightKg        Float?      // Target weight
  rpe             Int?        // Rate of perceived exertion (1-10)
  restSeconds     Int?
  notes           String?

  workout         ProgramWorkout @relation(fields: [workoutId], references: [id])
  exercise        Exercise    @relation(fields: [exerciseId], references: [id])
}

enum ExerciseSection {
  WARM_UP
  MAIN
  ACCESSORY
  COOL_DOWN
}

model ClientProgram {
  id              String      @id @default(cuid())
  clientId        String
  templateId      String?     // Source template if created from one
  trainerId       String

  name            String
  startDate       DateTime
  endDate         DateTime?
  isActive        Boolean     @default(true)

  // Denormalized for flexibility - can diverge from template
  workouts        ClientProgramWorkout[]

  client          Client      @relation(fields: [clientId], references: [id])
  template        ProgramTemplate? @relation(fields: [templateId], references: [id])
  trainer         User        @relation(fields: [trainerId], references: [id])
}

model ClientProgramWorkout {
  id              String      @id @default(cuid())
  programId       String

  dayNumber       Int
  name            String

  exercises       ClientProgramExercise[]
  program         ClientProgram @relation(fields: [programId], references: [id])
}

model ClientProgramExercise {
  id              String      @id @default(cuid())
  workoutId       String
  exerciseId      String

  orderIndex      Int
  section         ExerciseSection @default(MAIN)

  sets            Int
  repsMin         Int
  repsMax         Int?
  weightKg        Float?
  rpe             Int?
  restSeconds     Int?
  notes           String?

  workout         ClientProgramWorkout @relation(fields: [workoutId], references: [id])
  exercise        Exercise    @relation(fields: [exerciseId], references: [id])
}

// Actual workout logged per session
model WorkoutLog {
  id              String      @id @default(cuid())
  sessionId       String      @unique
  clientProgramId String?     // Link to program if following one

  exercises       WorkoutLogExercise[]

  session         Session     @relation(fields: [sessionId], references: [id])
  clientProgram   ClientProgram? @relation(fields: [clientProgramId], references: [id])
}

model WorkoutLogExercise {
  id              String      @id @default(cuid())
  workoutLogId    String
  exerciseId      String

  orderIndex      Int

  sets            WorkoutLogSet[]
  notes           String?

  workoutLog      WorkoutLog  @relation(fields: [workoutLogId], references: [id])
  exercise        Exercise    @relation(fields: [exerciseId], references: [id])
}

model WorkoutLogSet {
  id              String      @id @default(cuid())
  exerciseLogId   String

  setNumber       Int
  reps            Int
  weightKg        Float?
  rpe             Int?        // 1-10
  isWarmup        Boolean     @default(false)
  isPR            Boolean     @default(false) // Personal record flag

  exerciseLog     WorkoutLogExercise @relation(fields: [exerciseLogId], references: [id])
}
```

### Technical Notes
- Mobile-first UI for workout logging (React Native consideration for future, or PWA)
- PDF generation: react-pdf or server-side with puppeteer
- Exercise library seeding: research wger.de API, ExerciseDB
- Feature flag: `FEATURE_PROGRAMS_ENABLED` at org level
- Consider lazy loading for exercise search (large dataset)

---

## UI Considerations

### Calendar Module
- Week view as primary (like Google Calendar)
- Drag-and-drop for rescheduling (nice-to-have)
- Color coding by trainer or status
- Mobile: simplified day view or list view

### Program Builder
- Desktop-optimized for creation (complex UI acceptable)
- Template picker as starting point
- Exercise search with autocomplete
- Drag-and-drop to reorder exercises
- Quick-add for common exercises

### Workout Logging (Mobile)
- Large touch targets
- Swipe gestures for quick entry
- Pre-populated from program
- Minimal typing required
- Timer integration (rest periods)

### Feedback Collection
- Embedded in validation confirmation page
- Star ratings (tap to select)
- Optional text comment
- Skip option prominent

---

## Competitor Analysis

### Trainerize
- Full client app with workout delivery
- Messaging built-in
- Habit tracking
- Complex, feature-rich

### TrueCoach
- Program delivery focused
- Clean workout logging
- Video exercise demos
- Client app required

### PTminder
- Business management focus
- Scheduling + payments
- Less workout-focused

### MindBody
- Class booking focused
- Large ecosystem
- Less personal training specific

### Our Differentiation
- **Simplicity:** Easier program creation than competitors
- **No client app required:** Everything via email links
- **Commission integration:** Unique to PT Session Tracker
- **Validation workflow:** Trust but verify model
- **Manager oversight:** Churn analysis, quality metrics

---

## Implementation Phases

### Phase 3.1: Calendar MVP (Weeks 1-2)
- [ ] Appointment model and API
- [ ] Create/edit/cancel appointments
- [ ] Trainer week view calendar
- [ ] Manager multi-trainer view
- [ ] Reminder email system (cron job)
- [ ] Link appointment to session logging
- [ ] Feature flag implementation

### Phase 3.2: Feedback Collection (Week 3)
- [ ] SessionFeedback model
- [ ] Update validation confirmation page
- [ ] Feedback questions UI
- [ ] Trainer feedback dashboard
- [ ] Manager feedback overview

### Phase 3.3: Client Profile & Metrics (Week 3-4)
- [ ] Client profile enhancements (goals, notes)
- [ ] ClientMetric model
- [ ] Metrics recording UI
- [ ] Basic progress charts

### Phase 3.4: Exercise Library (Week 4)
- [ ] Exercise model
- [ ] Seed initial exercise database
- [ ] Exercise search API
- [ ] Custom exercise creation

### Phase 3.5: Program Builder MVP (Weeks 5-6)
- [ ] Program/workout data models
- [ ] Program builder UI (desktop)
- [ ] Template system
- [ ] Assign program to client

### Phase 3.6: Workout Logging (Weeks 6+)
- [ ] WorkoutLog models
- [ ] Workout logging UI (mobile-first)
- [ ] PDF generation and email
- [ ] Progress tracking views

---

## Open Questions

1. **Exercise library source:** Which API/database to use for seeding exercises?
2. **Video demos:** Include exercise video links? Source?
3. **Reminder timing:** What intervals for appointment reminders? Configurable per org?
4. **Feedback frequency:** Exact logic for "every N sessions" questions
5. **PDF branding:** Include gym logo on workout PDFs?
6. **Offline support:** Needed for workout logging in gyms with poor connectivity?
7. **Import/export:** CSV import for existing programs from spreadsheets?

---

## Success Metrics

- Appointment adoption rate (% sessions with prior appointment)
- Feedback response rate
- Program creation rate (programs per trainer)
- Workout logging rate (% sessions with workout logged)
- Client retention correlation with feedback scores
- Time to create program (UX efficiency)
