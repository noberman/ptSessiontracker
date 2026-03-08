# Task 54A: Programs & Client Progress — Foundation

## Problem

The platform has no visibility into what happens during training sessions. Client profiles are basic (name, email, location). There is no goal tracking, exercise logging, program management, or progress visualization. When clients churn, managers have no context on why.

## Solution

Add the data models, CRUD APIs, and standard UI for training programs, exercise logging, client metrics, and progress tracking. This task builds the **complete foundation** that Task 54B's AI interaction layer sits on top of.

**Feature flag:** `programsEnabled` Boolean on Organization (follows `calendarEnabled` pattern).

**Dependency:** Task 53 (Calendar & Scheduling) — WorkoutLog links 1:1 with Session.

---

## Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Feature flag | `programsEnabled` Boolean on Organization, default `false`. All program routes and UI gated behind it. |
| 2 | Exercise library source | Static JSON seed file (~200 exercises). No external API dependency. Seeded via Prisma seed script. |
| 3 | Exercise ownership | `organizationId: null` = global (seeded). `organizationId: set` = org-custom. Unique constraint on `[name, organizationId]`. |
| 4 | Template → Client Program | Denormalized copy. ClientProgram diverges freely after creation. `templateId` kept as optional reference. |
| 5 | WorkoutLog linkage | 1:1 with Session (optional). A session may or may not have a workout log. |
| 6 | PR detection | Computed on write. When a WorkoutLogSet is saved, compare against max weight×reps for that exercise+client. Flag `isPR` on the set. |
| 7 | ClientMetric body scan fields | Include `muscleMass`, `bmi`, `visceralFat`, `basalMetabolicRate` Float? fields + `source` enum (`MANUAL`, `BODY_SCAN`) to support 54B body scan reader. |
| 8 | Workout summary PDF | react-pdf for generation. Emailed to client after trainer completes workout log. |
| 9 | Program builder UX | Desktop-optimized for creation. Exercise search with autocomplete. Drag-and-drop reorder via `@dnd-kit/sortable`. |

---

## User Stories

### Trainer
- Create training programs for clients from scratch or templates
- Log what was actually done in each session to track progress
- Use templates to quickly create programs
- Add custom exercises not in the library
- Modify the program on the fly during a session
- Record client metrics (weight, body fat, measurements) periodically
- See client progress over time (charts, PRs)

### Club Manager / PT Manager
- See client profiles including goals and progress
- Review churned client history (programs, feedback, progress) to understand why
- See trainer performance metrics (client retention, feedback scores, client progress)

### Client (via email)
- Receive a PDF summary of workout after each session

---

## Schema Changes

### Organization (add field)

```prisma
model Organization {
  // ... existing fields ...
  programsEnabled    Boolean @default(false)
}
```

### Client (add fields)

```prisma
model Client {
  // ... existing fields ...
  goals              String?     // Text description of client goals
  notes              String?     // General trainer notes about client

  metrics            ClientMetric[]
  programs           ClientProgram[]
}
```

### ClientMetric

```prisma
model ClientMetric {
  id                    String        @id @default(cuid())
  clientId              String
  recordedAt            DateTime      @default(now())
  recordedBy            String        // Trainer who recorded

  // Core measurements
  weight                Float?        // kg
  bodyFatPercent         Float?

  // Body measurements (cm)
  chest                 Float?
  waist                 Float?
  hips                  Float?
  armLeft               Float?
  armRight              Float?
  thighLeft             Float?
  thighRight            Float?

  // Body scan data (populated by 54B AI reader or manual entry)
  muscleMass            Float?        // kg
  bmi                   Float?
  visceralFat           Float?
  basalMetabolicRate    Float?        // kcal/day

  source                MetricSource  @default(MANUAL)
  notes                 String?

  client                Client        @relation(fields: [clientId], references: [id])
  recorder              User          @relation(fields: [recordedBy], references: [id])

  @@index([clientId, recordedAt])
  @@map("client_metrics")
}

enum MetricSource {
  MANUAL
  BODY_SCAN
}
```

### Exercise

```prisma
model Exercise {
  id                    String            @id @default(cuid())
  name                  String
  category              ExerciseCategory
  muscleGroups          String[]          // e.g., ["chest", "triceps"]
  description           String?
  videoUrl              String?

  isCustom              Boolean           @default(false)
  organizationId        String?           // null = global, set = org-specific

  organization          Organization?     @relation(fields: [organizationId], references: [id])

  @@unique([name, organizationId])
  @@index([category])
  @@index([organizationId])
  @@map("exercises")
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
  id                    String              @id @default(cuid())
  name                  String
  description           String?
  durationWeeks         Int
  daysPerWeek           Int

  isGlobal              Boolean             @default(false)  // System-provided template
  organizationId        String?
  createdBy             String?

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  workouts              ProgramWorkout[]
  clientPrograms        ClientProgram[]
  organization          Organization?       @relation(fields: [organizationId], references: [id])
  creator               User?               @relation(fields: [createdBy], references: [id])

  @@index([organizationId])
  @@map("program_templates")
}

model ProgramWorkout {
  id                    String              @id @default(cuid())
  templateId            String
  dayNumber             Int                 // e.g., 1, 2, 3 for Day A, B, C
  name                  String              // e.g., "Upper Body", "Legs"

  exercises             ProgramExercise[]
  template              ProgramTemplate     @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@index([templateId])
  @@map("program_workouts")
}

model ProgramExercise {
  id                    String              @id @default(cuid())
  workoutId             String
  exerciseId            String

  orderIndex            Int
  section               ExerciseSection     @default(MAIN)

  sets                  Int
  repsMin               Int
  repsMax               Int?                // For rep ranges like 8-12
  weightKg              Float?              // Target weight
  rpe                   Int?                // Rate of perceived exertion (1-10)
  restSeconds           Int?
  notes                 String?

  workout               ProgramWorkout      @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  exercise              Exercise            @relation(fields: [exerciseId], references: [id])

  @@index([workoutId])
  @@map("program_exercises")
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
  id                    String                    @id @default(cuid())
  clientId              String
  templateId            String?                   // Source template if created from one
  trainerId             String

  name                  String
  startDate             DateTime
  endDate               DateTime?
  isActive              Boolean                   @default(true)

  createdAt             DateTime                  @default(now())
  updatedAt             DateTime                  @updatedAt

  workouts              ClientProgramWorkout[]
  workoutLogs           WorkoutLog[]

  client                Client                    @relation(fields: [clientId], references: [id])
  template              ProgramTemplate?          @relation(fields: [templateId], references: [id])
  trainer               User                      @relation(fields: [trainerId], references: [id])

  @@index([clientId])
  @@index([trainerId])
  @@map("client_programs")
}

model ClientProgramWorkout {
  id                    String                    @id @default(cuid())
  programId             String
  dayNumber             Int
  name                  String

  exercises             ClientProgramExercise[]
  program               ClientProgram             @relation(fields: [programId], references: [id], onDelete: Cascade)

  @@index([programId])
  @@map("client_program_workouts")
}

model ClientProgramExercise {
  id                    String                    @id @default(cuid())
  workoutId             String
  exerciseId            String

  orderIndex            Int
  section               ExerciseSection           @default(MAIN)

  sets                  Int
  repsMin               Int
  repsMax               Int?
  weightKg              Float?
  rpe                   Int?
  restSeconds           Int?
  notes                 String?

  workout               ClientProgramWorkout      @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  exercise              Exercise                  @relation(fields: [exerciseId], references: [id])

  @@index([workoutId])
  @@map("client_program_exercises")
}
```

### Workout Logging

```prisma
model WorkoutLog {
  id                    String                    @id @default(cuid())
  sessionId             String                    @unique
  clientProgramId       String?

  createdAt             DateTime                  @default(now())
  updatedAt             DateTime                  @updatedAt

  exercises             WorkoutLogExercise[]

  session               Session                   @relation(fields: [sessionId], references: [id])
  clientProgram         ClientProgram?            @relation(fields: [clientProgramId], references: [id])

  @@index([clientProgramId])
  @@map("workout_logs")
}

model WorkoutLogExercise {
  id                    String                    @id @default(cuid())
  workoutLogId          String
  exerciseId            String

  orderIndex            Int
  notes                 String?

  sets                  WorkoutLogSet[]

  workoutLog            WorkoutLog                @relation(fields: [workoutLogId], references: [id], onDelete: Cascade)
  exercise              Exercise                  @relation(fields: [exerciseId], references: [id])

  @@index([workoutLogId])
  @@map("workout_log_exercises")
}

model WorkoutLogSet {
  id                    String                    @id @default(cuid())
  exerciseLogId         String

  setNumber             Int
  reps                  Int
  weightKg              Float?
  rpe                   Int?                      // 1-10
  isWarmup              Boolean                   @default(false)
  isPR                  Boolean                   @default(false)

  exerciseLog           WorkoutLogExercise        @relation(fields: [exerciseLogId], references: [id], onDelete: Cascade)

  @@index([exerciseLogId])
  @@map("workout_log_sets")
}
```

---

## Implementation Plan

### Phase 1: Schema & Feature Flag (Complexity: 3/10)
- [ ] Add `programsEnabled` to Organization model
- [ ] Add `goals` and `notes` to Client model
- [ ] Create migration
- [ ] Update `/docs/schema.md`
- [ ] Add feature flag check middleware/utility

### Phase 2: Exercise Library (Complexity: 5/10)
- [ ] Add Exercise model, ExerciseCategory enum
- [ ] Create migration
- [ ] Build static JSON seed file (~200 exercises with categories + muscle groups)
- [ ] Seed script for exercises
- [ ] Exercise CRUD API routes (`/api/exercises`)
- [ ] Custom exercise creation per org
- [ ] Exercise search API with text matching + category filter

### Phase 3: Client Metrics (Complexity: 4/10)
- [ ] Add ClientMetric model, MetricSource enum
- [ ] Create migration
- [ ] ClientMetric CRUD API (`/api/clients/[id]/metrics`)
- [ ] Metrics recording UI on client detail page
- [ ] Basic progress charts (weight, body fat, measurements over time) using recharts

### Phase 4: Program Templates (Complexity: 6/10)
- [ ] Add ProgramTemplate, ProgramWorkout, ProgramExercise models, ExerciseSection enum
- [ ] Create migration
- [ ] Template CRUD API (`/api/program-templates`)
- [ ] Seed default templates (Upper/Lower Split, PPL, Full Body, 5×5 Strength)
- [ ] Template builder UI (desktop-optimized)
- [ ] Exercise search with autocomplete in builder
- [ ] Drag-and-drop exercise reordering via `@dnd-kit/sortable`

### Phase 5: Client Programs (Complexity: 5/10)
- [ ] Add ClientProgram, ClientProgramWorkout, ClientProgramExercise models
- [ ] Create migration
- [ ] Create program from template (denormalize/copy all workouts + exercises)
- [ ] Create program from scratch API
- [ ] Assign program to client with start date
- [ ] View active program on client detail page
- [ ] Edit/deactivate program

### Phase 6: Workout Logging (Complexity: 8/10)
- [ ] Add WorkoutLog, WorkoutLogExercise, WorkoutLogSet models
- [ ] Create migration
- [ ] Workout logging API (`/api/sessions/[id]/workout-log`)
- [ ] Mobile-first workout logging UI
- [ ] Pre-populate from client's active program (planned workout for that day)
- [ ] Log actual sets/reps/weight with inline editing
- [ ] Track planned vs actual (visual comparison)
- [ ] PR detection on save (compare against historical max for exercise+client)
- [ ] Quick-log mode (simplified entry for speed)

### Phase 7: Progress Tracking (Complexity: 5/10)
- [ ] Exercise progression charts (weight/volume over time per exercise)
- [ ] Training volume trends (weekly/monthly)
- [ ] PR history timeline
- [ ] Integration with client detail page (progress tab)

### Phase 8: Workout Summary PDF (Complexity: 4/10)
- [ ] PDF generation with react-pdf
- [ ] Template: date, exercises performed, sets/reps/weight, PRs flagged
- [ ] Email to client after trainer completes workout log
- [ ] Integrate with existing email service (SendGrid/Resend)

### Phase 9: Churn Analysis View (Complexity: 5/10)
- [ ] Manager view for churned clients
- [ ] Surface: goals, programs, session history, feedback scores, progress, PRs
- [ ] Integrate with existing client health metrics on dashboard

---

## Files Changed

| Area | Files |
|------|-------|
| Schema | `prisma/schema.prisma`, `prisma/seed.ts` |
| Migrations | `prisma/migrations/YYYYMMDD_*` (one per phase or grouped) |
| Seed data | `prisma/data/exercises.json` |
| API routes | `src/app/api/exercises/`, `src/app/api/clients/[id]/metrics/`, `src/app/api/program-templates/`, `src/app/api/clients/[id]/programs/`, `src/app/api/sessions/[id]/workout-log/` |
| Pages | `src/app/(dashboard)/clients/[id]/` (enhanced), `src/app/(dashboard)/programs/` (new), `src/app/(dashboard)/exercises/` (new) |
| Components | `src/components/programs/`, `src/components/exercises/`, `src/components/metrics/`, `src/components/workout-log/` |
| PDF | `src/lib/pdf/workout-summary.tsx` |
| Docs | `docs/schema.md` |

---

## Edge Cases

1. **Exercise name collisions** — Global exercise "Bench Press" + org-custom "Bench Press" handled by unique constraint on `[name, organizationId]`. Global has `null` orgId.
2. **Deleting an exercise used in programs** — Soft delete or block deletion if referenced. Use `Exercise.isCustom` to allow org admins to archive, not hard delete.
3. **Template modified after client program created** — No effect. Client programs are denormalized copies.
4. **Session without workout log** — Allowed. WorkoutLog is optional 1:1 with Session.
5. **PR detection across programs** — PRs are per exercise per client, regardless of which program the exercise appeared in.
6. **Concurrent metric recording** — Two trainers recording metrics for the same client simultaneously. Each creates its own timestamped record — no conflict.
7. **Program with no workouts** — Allowed (draft state). UI should indicate incomplete program.

---

## Success Criteria

- [ ] Feature flag gates all program-related routes and UI
- [ ] Exercise library seeded with ~200 exercises across all categories
- [ ] Trainers can create programs from templates or scratch in under 2 minutes
- [ ] Workout logging works on mobile with minimal typing
- [ ] PR detection is accurate and flagged visually
- [ ] Client metrics show progress charts over time
- [ ] Workout summary PDF emails deliver correctly
- [ ] Manager churn analysis view surfaces all relevant client data
- [ ] All schema changes documented in `/docs/schema.md`
