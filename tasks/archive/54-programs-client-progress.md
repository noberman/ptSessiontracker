# Task 54: Programs & Client Progress

## Problem

The platform has no visibility into what happens during training sessions. Client profiles are basic (name, email, location). There is no goal tracking, exercise logging, program management, or progress visualization. When clients churn, managers have no context on why.

## Solution

Add training programs, exercise logging, client metrics, and progress tracking. Give trainers tools to build and deliver programs. Give managers visibility into training quality and client outcomes.

**Feature flag:** `FEATURE_PROGRAMS_ENABLED` at org level.

**Dependency:** Task 53 (Feedback Collection) — feedback scores feed into client progress and churn analysis.

---

## User Stories

### Trainer
- Create training programs for clients
- Log what was actually done in each session to track progress
- Use templates to quickly create programs
- Add custom exercises not in the library
- Modify the program on the fly during a session
- Record client metrics (weight, body fat) periodically
- See client progress over time

### Club Manager / PT Manager
- See client profiles including goals and progress
- Review churned client history (programs, feedback, progress) to understand why
- See trainer performance metrics (client retention, feedback scores, client progress)

### Client (via email)
- Receive a PDF summary of workout after each session

---

## Features

### 54.1 Client Profile Enhancements
- **Goals:** Text field for client's stated objectives
- **Notes:** General trainer notes about client
- **Body Metrics:** Weight, body fat %, measurements (tracked periodically)
- **Performance Metrics:** Derived from workout logs (volume, PRs)
- **Feedback History:** Aggregated from session feedback (Task 53)

### 54.2 Exercise Library
- Pre-populated database of common exercises
- Categories: Compound, Isolation, Cardio, Mobility, Warm-Up, Other
- Muscle groups tagged
- Custom exercises per organization
- Exercise search with autocomplete
- Research needed: wger.de API, ExerciseDB, or similar for seeding

### 54.3 Program Builder
- Create from scratch or from templates
- Program structure:
  - Name, duration (e.g., 8 weeks)
  - Days per week
  - Workout days (e.g., Day A: Upper, Day B: Lower)
  - Exercises with sets, reps, weight/RPE targets
  - Warm-up, main work, accessories, cool-down sections
- Template library:
  - Upper/Lower Split
  - Push/Pull/Legs
  - Full Body
  - 5x5 Strength
  - Custom org templates
- Assign program to client with start date
- **UX Priority:** Must be fast and easy — biggest differentiator vs competitors

### 54.4 Workout Logging (Per Session)
- When logging session, optionally record what was done
- Pre-populate from program (planned workout for that day)
- Log actual: exercise, sets, reps, weight
- Track planned vs actual
- Mobile-first UI (trainers on phones during sessions)
- Quick-log mode for speed

### 54.5 Progress Tracking
- Body metrics over time (charts)
- Exercise progression (weight/volume over time)
- Training volume trends
- Personal records (PRs) tracked automatically

### 54.6 Workout Summary PDF
- Generated after session (when workout is logged)
- Emailed to client
- Contains: date, exercises performed, sets/reps/weight
- Simple, clean format

### 54.7 Churn Analysis (Manager View)
When viewing a churned client, surface:
- Client profile and initial goals
- Programs they were on
- Session history and attendance patterns
- Feedback scores they gave
- Progress made (metrics, PRs)
- Their trainer's overall rating

---

## Schema Changes

### Client Model (new fields)

```prisma
model Client {
  // ... existing fields ...

  goals           String?     // Text description of client goals
  notes           String?     // General notes about client

  metrics         ClientMetric[]
  programs        ClientProgram[]
}
```

### ClientMetric

```prisma
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
```

### Exercise

```prisma
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
```

### Program Templates

```prisma
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
```

### Client Programs (denormalized from template)

```prisma
model ClientProgram {
  id              String      @id @default(cuid())
  clientId        String
  templateId      String?     // Source template if created from one
  trainerId       String

  name            String
  startDate       DateTime
  endDate         DateTime?
  isActive        Boolean     @default(true)

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
```

### Workout Logging

```prisma
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

---

## Implementation Steps

### Step 1: Client Profile Enhancements (Complexity: 3)
- [ ] Add `goals` and `notes` fields to Client model
- [ ] Migration
- [ ] Update client detail page with goals/notes editing
- [ ] Update `/docs/schema.md`

### Step 2: Client Metrics (Complexity: 4)
- [ ] Add ClientMetric model
- [ ] Migration
- [ ] CRUD API for metrics
- [ ] Metrics recording UI on client detail page
- [ ] Basic progress charts (weight, body fat over time)

### Step 3: Exercise Library (Complexity: 5)
- [ ] Add Exercise model and ExerciseCategory enum
- [ ] Migration
- [ ] Seed initial exercise database (research wger.de API, ExerciseDB)
- [ ] Exercise search API with autocomplete
- [ ] Custom exercise creation per org
- [ ] Exercise management UI (admin/manager)

### Step 4: Program Templates (Complexity: 6)
- [ ] Add ProgramTemplate, ProgramWorkout, ProgramExercise models
- [ ] Migration
- [ ] Template CRUD API
- [ ] Seed default templates (Upper/Lower, PPL, Full Body, 5x5)
- [ ] Template builder UI (desktop-optimized)
- [ ] Exercise search with autocomplete in builder
- [ ] Drag-and-drop to reorder exercises

### Step 5: Client Programs (Complexity: 5)
- [ ] Add ClientProgram, ClientProgramWorkout, ClientProgramExercise models
- [ ] Migration
- [ ] Create program from template (denormalize/copy)
- [ ] Create program from scratch
- [ ] Assign program to client with start date
- [ ] View active program on client detail page

### Step 6: Workout Logging (Complexity: 8)
- [ ] Add WorkoutLog, WorkoutLogExercise, WorkoutLogSet models
- [ ] Migration
- [ ] Workout logging API
- [ ] Mobile-first workout logging UI
- [ ] Pre-populate from program (planned workout for that day)
- [ ] Log actual sets/reps/weight
- [ ] Track planned vs actual
- [ ] Quick-log mode for speed
- [ ] PR detection (auto-flag personal records)

### Step 7: Progress Tracking (Complexity: 5)
- [ ] Exercise progression charts (weight/volume over time)
- [ ] Training volume trends
- [ ] PR history display
- [ ] Integration with client detail page

### Step 8: Workout Summary PDF (Complexity: 4)
- [ ] PDF generation (react-pdf or server-side puppeteer)
- [ ] Email to client after session with workout logged
- [ ] Contents: date, exercises, sets/reps/weight
- [ ] Clean, simple format

### Step 9: Churn Analysis View (Complexity: 5)
- [ ] Manager view for churned clients
- [ ] Surface: goals, programs, session history, feedback scores, progress, PRs
- [ ] Integrate with existing client health metrics on dashboard

---

## UI Considerations

### Program Builder (Desktop)
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
- Timer integration for rest periods (nice-to-have)

## Technical Notes

- Mobile-first UI for workout logging (PWA approach for MVP)
- PDF generation: react-pdf or server-side with puppeteer
- Exercise library seeding: research wger.de API, ExerciseDB
- Feature flag check on all program routes and UI components
- Lazy loading for exercise search (potentially large dataset)
- ClientProgram is denormalized from template — can diverge after creation

## Open Questions

1. Exercise library source: which API/database for seeding exercises?
2. Video demos: include exercise video links? Source?
3. PDF branding: include gym logo on workout PDFs?
4. Offline support: needed for workout logging in gyms with poor connectivity?
5. Import/export: CSV import for existing programs from spreadsheets?

## Success Metrics

- Program creation rate (programs per trainer)
- Workout logging rate (% sessions with workout logged)
- Time to create a program (UX efficiency)
- Client retention correlation with program usage
