# Client Programs Module Design Document

## Executive Summary
A comprehensive program management system that enables trainers to easily import, create, and manage client workout programs while providing PT Managers with quality control oversight and progress tracking capabilities. The cornerstone of this system is AI-assisted program import that dramatically reduces the friction of getting existing programs into the platform.

## Core Problem Statement

### Current State
- Programs scattered across trainers' phones, notes apps, PDFs, Excel sheets
- PT Managers have zero visibility into client programs
- No standardization or quality control
- No systematic progress tracking
- Difficult to substitute trainers (no program access)
- Each trainer manages 10-30 clients with custom programs

### Desired State
- Centralized program repository with easy import
- PT Manager oversight and quality control
- Standardized exercise library with custom additions
- Comprehensive progress tracking and periodization
- Easy program adjustments during sessions
- AI-assisted import from any format (photo, PDF, Excel, text)

## System Architecture

### Core Components

```
┌─────────────────────────────────────────────┐
│           AI Import Engine                   │
│  (Photos, PDFs, Excel, Screenshots, Text)    │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│         Program Structure Layer              │
│     (Programs → Workouts → Exercises)        │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│          Exercise Library                    │
│   (Global + Organization + Custom)           │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│      Progress Tracking & Analytics           │
│  (Volume, Intensity, Periodization)          │
└─────────────────────────────────────────────┘
```

## Data Model

### Program Structure

```prisma
model Program {
  id                String @id @default(cuid())
  organizationId    String
  name              String
  description       String?
  
  // Ownership & Assignment
  createdById       String    // Trainer who created
  clientId          String?   // Null = template
  isTemplate        Boolean @default(false)
  
  // Periodization
  totalWeeks        Int?
  currentWeek       Int @default(1)
  programType       ProgramType // STRENGTH, HYPERTROPHY, ENDURANCE, etc.
  
  // Import metadata
  importMethod      ImportMethod?
  importedFrom      String?    // Original format/source
  aiConfidence      Float?     // AI's confidence in import accuracy
  
  // Status
  status            ProgramStatus @default(DRAFT)
  reviewedById      String?    // PT Manager who reviewed
  reviewedAt        DateTime?
  reviewNotes       String?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  workouts          Workout[]
  progressRecords   ProgressRecord[]
  organization      Organization @relation(...)
  createdBy         User @relation("ProgramCreator", ...)
  client            Client? @relation(...)
  reviewedBy        User? @relation("ProgramReviewer", ...)
}

model Workout {
  id                String @id @default(cuid())
  programId         String
  name              String
  dayNumber         Int       // Day within program
  weekNumber        Int       // Week within program
  
  // Workout metadata
  targetDuration    Int?      // Minutes
  workoutType       WorkoutType // UPPER, LOWER, FULL_BODY, CARDIO, etc.
  targetVolume      Float?    // Total volume goal
  
  // Completion tracking
  scheduledDate     DateTime?
  completedDate     DateTime?
  actualDuration    Int?      // Minutes
  
  notes             String?
  
  // Relations
  program           Program @relation(...)
  exercises         WorkoutExercise[]
  sessionRecords    SessionRecord[]
  
  @@unique([programId, weekNumber, dayNumber])
}

model Exercise {
  id                String @id @default(cuid())
  name              String
  category          ExerciseCategory // PUSH, PULL, LEGS, CORE, etc.
  muscleGroups      String[]    // ["chest", "triceps", "shoulders"]
  equipment         String?     // barbell, dumbbell, machine, bodyweight
  
  // Exercise details
  description       String?
  cues              String[]    // Form cues
  videoUrl          String?
  imageUrl          String?
  
  // Organization specific or global
  organizationId    String?     // Null = global exercise
  isCustom          Boolean @default(false)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  organization      Organization? @relation(...)
  workoutExercises  WorkoutExercise[]
  
  @@unique([name, organizationId])
}

model WorkoutExercise {
  id                String @id @default(cuid())
  workoutId         String
  exerciseId        String
  orderIndex        Int       // Order in workout
  
  // Programming details
  sets              Int
  reps              String    // "8-12" or "10" or "AMRAP"
  intensity         String?   // "70%" or "RPE 8" or weight
  restSeconds       Int?      // Rest between sets
  tempo             String?   // "3010" (eccentric-pause-concentric-pause)
  
  // Superset/circuit grouping
  groupId           String?   // Same ID = superset/circuit
  groupType         GroupType? // SUPERSET, CIRCUIT, GIANT_SET
  
  notes             String?
  
  // Relations
  workout           Workout @relation(...)
  exercise          Exercise @relation(...)
  executionRecords  ExecutionRecord[]
  
  @@unique([workoutId, orderIndex])
}

model SessionRecord {
  id                String @id @default(cuid())
  workoutId         String
  trainerId         String
  clientId          String
  sessionDate       DateTime
  
  // Session metadata
  startTime         DateTime
  endTime           DateTime?
  totalVolume       Float?    // Calculated: sum of weight × reps
  
  // Session adjustments
  modifiedProgram   Boolean @default(false)
  modificationNotes String?
  
  // Relations
  workout           Workout @relation(...)
  trainer           User @relation(...)
  client            Client @relation(...)
  executionRecords  ExecutionRecord[]
}

model ExecutionRecord {
  id                String @id @default(cuid())
  sessionRecordId   String
  workoutExerciseId String
  setNumber         Int
  
  // Execution details
  plannedReps       Int
  actualReps        Int
  weight            Float?    // In kg
  rpe               Float?    // Rate of Perceived Exertion (1-10)
  
  // Form and notes
  formRating        Int?      // 1-5 scale
  notes             String?
  
  // Relations
  sessionRecord     SessionRecord @relation(...)
  workoutExercise   WorkoutExercise @relation(...)
  
  @@unique([sessionRecordId, workoutExerciseId, setNumber])
}

model ProgressRecord {
  id                String @id @default(cuid())
  programId         String
  clientId          String
  exerciseId        String
  
  // Progress metrics
  date              DateTime
  maxWeight         Float?
  maxReps           Int?
  totalVolume       Float?
  
  // Calculated fields
  estimated1RM      Float?    // Calculated one-rep max
  volumeChange      Float?    // % change from last session
  
  // Relations
  program           Program @relation(...)
  client            Client @relation(...)
  exercise          Exercise @relation(...)
  
  @@index([clientId, exerciseId, date])
}

// Enums
enum ProgramType {
  STRENGTH
  HYPERTROPHY
  ENDURANCE
  POWER
  REHABILITATION
  GENERAL_FITNESS
  SPORT_SPECIFIC
}

enum ProgramStatus {
  DRAFT
  PENDING_REVIEW
  APPROVED
  ACTIVE
  COMPLETED
  ARCHIVED
}

enum ImportMethod {
  MANUAL
  EXCEL_IMPORT
  PDF_IMPORT
  PHOTO_IMPORT
  TEXT_PASTE
  VOICE_INPUT
  AI_GENERATED
}

enum WorkoutType {
  UPPER_BODY
  LOWER_BODY
  FULL_BODY
  PUSH
  PULL
  LEGS
  CARDIO
  HIIT
  FLEXIBILITY
  CUSTOM
}

enum ExerciseCategory {
  CHEST
  BACK
  SHOULDERS
  ARMS
  LEGS
  CORE
  CARDIO
  FLEXIBILITY
  COMPOUND
  ISOLATION
}

enum GroupType {
  SUPERSET
  CIRCUIT
  GIANT_SET
  DROP_SET
  CLUSTER_SET
}
```

## AI-Assisted Import System (Critical Feature)

### Import Flow

```
1. CAPTURE
   ↓
   Trainer uploads: Photo, PDF, Excel, Screenshot, or Text
   ↓
2. AI PROCESSING
   ↓
   - OCR for images/PDFs
   - Pattern recognition for structure
   - Exercise matching against library
   - Intelligent parsing of sets/reps/weights
   ↓
3. HUMAN VALIDATION
   ↓
   - AI presents structured interpretation
   - Trainer validates/corrects via UI or voice
   - Fuzzy matching suggestions for exercises
   ↓
4. SAVE & ASSIGN
   ↓
   - Save as template or assign to client
   - Ready for immediate use
```

### AI Import Interface

```typescript
interface AIImportEngine {
  // Main import function
  async importProgram(input: ImportInput): Promise<ImportResult> {
    const extracted = await this.extractContent(input);
    const structured = await this.structureProgram(extracted);
    const matched = await this.matchExercises(structured);
    return this.presentForValidation(matched);
  }
  
  // Extract text/structure from various formats
  async extractContent(input: ImportInput): Promise<ExtractedContent> {
    switch(input.type) {
      case 'IMAGE':
        return await this.ocrImage(input.data);
      case 'PDF':
        return await this.parsePDF(input.data);
      case 'EXCEL':
        return await this.parseExcel(input.data);
      case 'TEXT':
        return await this.parseText(input.data);
      case 'VOICE':
        return await this.transcribeVoice(input.data);
    }
  }
  
  // Structure into programs/workouts/exercises
  async structureProgram(content: ExtractedContent): Promise<StructuredProgram> {
    // Use AI to identify:
    // - Program name and duration
    // - Individual workouts (Day 1, Week 1, etc.)
    // - Exercises with sets/reps/weight
    // - Special instructions (supersets, rest periods)
    
    const prompt = `
      Extract workout program structure from this content.
      Identify:
      1. Program name and total weeks
      2. Individual workouts with day/week numbers
      3. Exercises with:
         - Name
         - Sets x Reps (handle formats like "3x10", "4 sets of 8-12")
         - Weight/intensity (if specified)
         - Rest periods
         - Special notes (supersets, tempo, etc.)
    `;
    
    return await this.aiModel.extract(content, prompt);
  }
  
  // Match exercises to library
  async matchExercises(program: StructuredProgram): Promise<MatchedProgram> {
    for (const exercise of program.exercises) {
      const matches = await this.fuzzyMatch(exercise.name);
      exercise.suggestedMatches = matches;
      exercise.confidence = this.calculateConfidence(matches);
    }
    return program;
  }
}
```

### Import Validation UI

```jsx
// Voice-assisted correction
<VoiceAssistant>
  AI: "I found a 12-week strength program with 4 workouts per week. 
       Day 1 appears to be Upper Body with Bench Press 4 sets of 8.
       Should I continue with this interpretation?"
  
  Trainer: "Yes, but it's 4 sets of 8 to 10 reps"
  
  AI: "Updated to 4 sets of 8-10 reps. Moving to exercise 2..."
</VoiceAssistant>

// Visual validation interface
<ImportReview>
  <ProgramSummary>
    Name: [12-Week Strength Program]
    Weeks: [12]
    Workouts/Week: [4]
  </ProgramSummary>
  
  <WorkoutList>
    Day 1: Upper Body ✓
    - [✓] Bench Press - 4x8-10 @ 80%
    - [?] "BB Row" → Barbell Row? [Confirm]
    - [✓] Dumbbell Shoulder Press - 3x12
    - [!] "Skull crushers" → Not found [Add Custom]
  </WorkoutList>
  
  <Actions>
    [Approve All] [Review Uncertain] [Start Over]
  </Actions>
</ImportReview>
```

### Common Import Patterns

```javascript
// Pattern recognition for various formats
const patterns = {
  // Format: "Exercise: Sets x Reps @ Weight"
  standard: /(.+):\s*(\d+)\s*x\s*(\d+(?:-\d+)?)\s*(?:@\s*(\d+%?|\w+))?/,
  
  // Format: "3 sets of 10 reps"
  verbal: /(\d+)\s*sets?\s*of\s*(\d+(?:-\d+)?)\s*reps?/,
  
  // Format: "Bench Press 135lbs 3x10"
  weightFirst: /(.+)\s+(\d+(?:lbs?|kg)?)\s+(\d+)x(\d+)/,
  
  // Supersets: "A1: Exercise" "A2: Exercise"
  superset: /([A-Z]\d+):\s*(.+)/,
  
  // Rest periods: "Rest: 60s" or "90 sec rest"
  rest: /(?:rest:?\s*)?(\d+)\s*(?:s|sec|seconds?)/i
};
```

## User Interfaces

### Trainer Mobile Interface (Primary)

```
┌─────────────────────────┐
│  Today's Workout        │
│  John Smith - Week 4    │
├─────────────────────────┤
│ □ Squat                 │
│   4×8 @ 100kg          │
│   [Adjust] [Complete]   │
├─────────────────────────┤
│ □ RDL                   │
│   3×10 @ 80kg          │
│   [Adjust] [Complete]   │
├─────────────────────────┤
│ [+ Add Exercise]        │
│ [Swap Workout]          │
│ [End Session]           │
└─────────────────────────┘
```

### Quick Adjustment Interface

```
Adjusting: Squat

Current: 4×8 @ 100kg

Quick Adjustments:
[↓ 90kg] [Current] [↑ 110kg]

Sets: [3] [4] [5]
Reps: [6] [8] [10] [12]

[Custom Input]
[Save Adjustment]
```

### PT Manager Dashboard

```
Program Quality Control

Pending Review (3):
┌──────────────────────────────────┐
│ John's Program - Sarah (PT1)     │
│ 12 weeks, Strength              │
│ [Review] [Quick Approve]         │
├──────────────────────────────────┤
│ Mike's Program - Tom (PT2)       │
│ 8 weeks, Hypertrophy            │
│ ⚠ High volume week 1            │
│ [Review] [Request Changes]       │
└──────────────────────────────────┘

Team Overview:
- Active Programs: 127
- Avg Completion: 78%
- Programs Need Review: 3
- At-Risk Clients: 5 (no progress 2+ weeks)
```

### Progress Visualization

```
Client: John Smith
Exercise: Squat

Progress Chart (12 weeks):
│
│     ╱╲    ← Current PR: 120kg
│    ╱  ╲
│   ╱    ╲__╱\
│  ╱          \  ← Deload week
│ ╱            
│╱
└──────────────────
 W1  W4  W8  W12

Volume Progression:
Week 1: 3,200kg total
Week 4: 4,100kg total (+28%)
Week 8: 3,500kg total (deload)

Mesocycle Overview:
[===Accumulation===][=Intensification=][Deload][Test]
```

## Implementation Approach

### Phase 1: Core Program Management (Week 1-2)
- [ ] Basic data models (Program, Workout, Exercise)
- [ ] Manual program creation interface
- [ ] Exercise library (100 common exercises)
- [ ] Basic workout execution tracking
- [ ] Simple progress recording

### Phase 2: AI Import System (Week 3-4) - CRITICAL
- [ ] Image upload and OCR integration
- [ ] Excel/CSV parser
- [ ] AI exercise matching
- [ ] Validation interface
- [ ] Voice-to-text corrections

### Phase 3: PT Manager Features (Week 5)
- [ ] Program review queue
- [ ] Quality control dashboard
- [ ] Approval workflow
- [ ] Team oversight metrics
- [ ] Program templates

### Phase 4: Advanced Progress Tracking (Week 6)
- [ ] Volume calculations
- [ ] Progress charts
- [ ] Periodization tracking
- [ ] PR tracking
- [ ] Deload detection

### Phase 5: Optimization (Week 7-8)
- [ ] Quick adjustment interface
- [ ] Workout swapping
- [ ] Exercise substitutions
- [ ] Offline mode
- [ ] Performance optimization

## Critical Success Factors

### 1. Import Friction Must Be Minimal
- **Target**: <2 minutes to import a complete program
- **Key Features**:
  - Multiple format support
  - Intelligent exercise matching
  - Voice corrections
  - Bulk import capability

### 2. Session Adjustments Must Be Fast
- **Target**: <10 seconds to adjust an exercise
- **Key Features**:
  - Quick adjustment buttons
  - Preset modifications
  - Swipe gestures
  - Voice input

### 3. PT Manager Oversight Must Be Efficient
- **Target**: Review 10 programs in <5 minutes
- **Key Features**:
  - Bulk approval
  - Smart flagging of issues
  - Quick feedback mechanism
  - Dashboard overview

## Technical Considerations

### AI/ML Integration
```javascript
// OpenAI GPT-4 Vision for image processing
const analyzeWorkoutImage = async (imageBuffer) => {
  const response = await openai.createCompletion({
    model: "gpt-4-vision-preview",
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: "Extract the workout program from this image. List exercises, sets, reps, and weights."
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
          }
        }
      ]
    }]
  });
  return parseWorkoutResponse(response);
};

// Fuzzy matching for exercise names
const matchExercise = async (inputName, exerciseLibrary) => {
  const matches = fuzzy.filter(inputName, exerciseLibrary, {
    extract: exercise => exercise.name
  });
  
  // Also try AI matching for non-standard names
  if (matches[0].score < 0.8) {
    const aiMatch = await openai.createCompletion({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: "Match this exercise name to the closest standard exercise."
      }, {
        role: "user",
        content: `Input: "${inputName}", Options: ${exerciseLibrary.map(e => e.name).join(", ")}`
      }]
    });
    return aiMatch;
  }
  
  return matches;
};
```

### Performance Optimization
- Cache exercise library locally
- Offline-first architecture
- Incremental sync for progress data
- Lazy load historical data
- Optimize images before upload

### Data Privacy
- Programs remain organization-private
- Exercise library has public and private sections
- Client progress data encrypted
- Audit trail for all modifications
- GDPR compliance for client data

## Success Metrics

### Adoption Metrics
- **Target**: 80% of trainers actively using within 1 month
- **Measure**: Daily active trainers, programs created, sessions tracked

### Efficiency Metrics
- **Import Time**: <2 minutes per program (vs 30+ minutes manual)
- **Adjustment Time**: <10 seconds per exercise
- **Review Time**: <30 seconds per program

### Quality Metrics
- **Program Completion Rate**: >70%
- **Client Progress**: Measurable improvement in 80% of clients
- **PT Manager Satisfaction**: Visibility into 100% of programs

### Technical Metrics
- **Import Accuracy**: >90% exercise matching accuracy
- **System Uptime**: 99.9%
- **Response Time**: <200ms for all operations
- **Sync Reliability**: 100% data consistency

## Risk Mitigation

### Risk: Low Adoption Due to High Friction
- **Mitigation**: Focus on AI import, make it magical
- **Mitigation**: Progressive onboarding, import one program at a time
- **Mitigation**: Trainer champions to demonstrate value

### Risk: AI Import Inaccuracy
- **Mitigation**: Always require human validation
- **Mitigation**: Continuous learning from corrections
- **Mitigation**: Fallback to manual entry

### Risk: PT Manager Overwhelm
- **Mitigation**: Smart filtering and prioritization
- **Mitigation**: Bulk actions for efficiency
- **Mitigation**: Gradual rollout by trainer tier

### Risk: Data Loss During Session
- **Mitigation**: Auto-save every action
- **Mitigation**: Offline mode with sync
- **Mitigation**: Session recovery mechanism

## Future Enhancements

### Phase 2 Features
- Client mobile app for self-tracking
- Wearable integration (Apple Watch, Fitbit)
- AI program generation based on goals
- Video exercise demonstrations
- Social features (client community)

### Advanced Analytics
- Predictive modeling for plateau detection
- Injury risk assessment
- Optimal load progression recommendations
- Fatigue monitoring
- Recovery recommendations

### Integration Opportunities
- MyFitnessPal for nutrition
- Strava/Garmin for cardio
- InBody for body composition
- Physical therapy systems
- Medical record systems