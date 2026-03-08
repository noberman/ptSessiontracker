# Task 54B: Programs & Client Progress — AI Interaction Layer

## Problem

Traditional workout logging is tedious: trainers tap through screens to select exercises, enter sets/reps/weight one by one. Program creation from scratch is slow. Importing programs from PDFs or screenshots requires manual re-entry. Body scan results are typed in manually from machine printouts. These friction points reduce adoption and data quality.

## Solution

Add a Google Gemini-powered AI layer on top of the 54A foundation. Trainers interact conversationally — speak or type what happened, and AI parses it into structured data. AI also assists with program creation, program import from images/PDFs, and body scan reading. Super admins control prompts and model settings without code deploys.

**Feature flag:** `aiEnabled` Boolean on Organization (separate from `programsEnabled`). Both must be enabled for AI features to appear.

**Dependency:** Task 54A (Programs Foundation) — all AI features write to 54A's models. AI features gracefully degrade to 54A's manual UI on failure.

---

## Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | AI provider | Google Gemini via `@google/generative-ai` SDK. Models: `gemini-2.0-flash` default, `gemini-2.0-pro` for complex tasks. Configurable per feature via AIPromptConfig. |
| 2 | Feature flag | `aiEnabled` Boolean on Organization. Separate from `programsEnabled` — org needs both enabled for AI features. |
| 3 | Prompt management | `AIPromptConfig` model. Super admin edits system prompts, context, model, temperature per feature. No code deploy needed to tune AI behavior. |
| 4 | Usage tracking | `AIUsageLog` model. Every AI call logged with tokens in/out, estimated cost, duration, success/failure. |
| 5 | Cost control | Per-org daily token budget stored on Organization. Requests rejected (with manual fallback) when budget exceeded. |
| 6 | Fallback strategy | All AI features have a "switch to manual" button. On AI error or budget exceeded, UI falls back to 54A standard forms. |
| 7 | Voice input | Web Speech API (browser-native). No additional dependency. Microphone button on conversational logging UI. |
| 8 | Exercise name matching | AI returns exercise names as text. Fuzzy match against Exercise table using Levenshtein distance or trigram similarity. Confidence threshold — below threshold, present options to trainer for confirmation. |
| 9 | Body scan reader | Gemini Vision reads photo/scan image → extracts metrics → populates ClientMetric with `source: BODY_SCAN`. |

---

## User Stories

### Trainer
- Talk or type what happened during a session and have it automatically parsed into a structured workout log
- Ask AI to generate a program based on client goals and constraints
- Take a photo of a program (from another gym, a book, a spreadsheet printout) and have AI import it
- Take a photo of a body scan printout and have the values automatically recorded
- Review and edit AI-generated data before saving
- Fall back to manual entry anytime AI is slow or inaccurate

### Super Admin
- Edit AI system prompts per feature without code deploys
- View AI usage dashboard (calls, tokens, cost per org)
- Enable/disable AI access per organization
- Set per-org daily token budgets
- Switch AI models per feature (e.g., use flash for logging, pro for program builder)

---

## Schema Changes

### Organization (add fields)

```prisma
model Organization {
  // ... existing fields ...
  aiEnabled           Boolean   @default(false)
  aiDailyTokenBudget  Int?      // Max tokens per day. null = unlimited.
}
```

### AIPromptConfig

```prisma
model AIPromptConfig {
  id                  String    @id @default(cuid())

  featureKey          String    @unique
  // Keys: "WORKOUT_LOGGING", "PROGRAM_BUILDER", "PROGRAM_IMPORT", "BODY_SCAN_READER"

  displayName         String    // Human-readable name for super admin UI
  description         String?   // What this prompt does

  systemPrompt        String    @db.Text
  contextTemplate     String?   @db.Text  // Template with {{variables}} injected at runtime
  model               String    @default("gemini-2.0-flash")
  temperature         Float     @default(0.3)
  maxTokens           Int       @default(2048)

  isActive            Boolean   @default(true)

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@map("ai_prompt_configs")
}
```

### AIUsageLog

```prisma
model AIUsageLog {
  id                  String    @id @default(cuid())
  organizationId      String
  userId              String    // Trainer who triggered the AI call

  featureKey          String    // Matches AIPromptConfig.featureKey
  model               String    // Actual model used

  tokensIn            Int
  tokensOut           Int
  estimatedCostUsd    Float     // Computed from token counts + model pricing
  durationMs          Int       // How long the AI call took

  success             Boolean
  errorMessage        String?

  createdAt           DateTime  @default(now())

  organization        Organization @relation(fields: [organizationId], references: [id])
  user                User         @relation(fields: [userId], references: [id])

  @@index([organizationId, createdAt])
  @@index([featureKey, createdAt])
  @@map("ai_usage_logs")
}
```

---

## AI Features

### Feature 1: Conversational Workout Logging (Complexity: 9/10)

The signature feature. Trainer speaks or types a natural language description of what happened, AI parses it into structured workout log data.

**Flow:**
1. Trainer opens workout log for a session
2. Taps microphone or types in chat-style input
3. Input: *"Did bench press 3 sets of 10 at 80kg, then incline dumbbell press 3x12 at 25kg each, finished with cable flies 4x15"*
4. AI parses → structured exercises with sets/reps/weight
5. Trainer sees parsed result in editable form (54A workout log UI)
6. Trainer confirms, edits, or adds more via voice/text
7. Multi-turn conversation supported (e.g., "Actually, make that 85kg on bench")
8. Save writes to WorkoutLog models

**Implementation:**
- [ ] Chat-style UI component with message history
- [ ] Web Speech API integration (microphone button, real-time transcription)
- [ ] Gemini prompt: parse natural language → JSON array of exercises with sets
- [ ] Fuzzy exercise name matching against Exercise table
- [ ] Confidence scoring — highlight low-confidence matches for trainer review
- [ ] Multi-turn conversation context (send previous messages + current program context)
- [ ] Pre-populate AI context with client's active program exercises
- [ ] "Switch to manual" button that opens 54A standard form with any data parsed so far
- [ ] Loading states, error handling, retry logic

### Feature 2: AI Program Builder (Complexity: 6/10)

Trainer describes what they want, AI generates a program structure.

**Flow:**
1. Trainer clicks "Create with AI" on program builder page
2. Enters description: *"8-week hypertrophy program for intermediate lifter, 4 days per week, upper/lower split, focus on chest and back"*
3. AI generates full program template with workouts, exercises, sets/reps
4. Result populates the 54A program builder UI (editable)
5. Trainer reviews, adjusts, saves

**Implementation:**
- [ ] Text input for program description (with suggested prompts)
- [ ] Gemini prompt: description → full program JSON structure
- [ ] Map AI exercise names to Exercise table (fuzzy match)
- [ ] Populate 54A program builder with generated data
- [ ] Trainer edits in standard builder before saving

### Feature 3: Program Import from Image/PDF (Complexity: 7/10)

Trainer photographs or uploads a program from another source (printed sheet, PDF, screenshot) and AI extracts it.

**Flow:**
1. Trainer clicks "Import Program" → "From Image/PDF"
2. Uploads image or PDF (camera capture on mobile, file upload on desktop)
3. Gemini Vision reads the document → extracts program structure
4. Result populates the 54A program builder UI (editable)
5. Trainer reviews, adjusts, saves

**Implementation:**
- [ ] File upload component (accept images + PDF)
- [ ] Camera capture on mobile via `<input type="file" capture="environment">`
- [ ] Gemini Vision prompt: image → program JSON structure
- [ ] Handle multi-page PDFs (extract text first, then parse)
- [ ] Map AI exercise names to Exercise table (fuzzy match)
- [ ] Populate 54A program builder with extracted data
- [ ] Clear indication of low-confidence extractions

### Feature 4: Body Scan Reader (Complexity: 5/10)

Trainer photographs a body composition scan printout, AI extracts the metrics.

**Flow:**
1. Trainer opens client metrics page
2. Taps "Scan Body Comp" → camera opens (or file upload)
3. Takes photo of InBody / Tanita / similar printout
4. Gemini Vision reads values → extracts weight, body fat %, muscle mass, BMI, visceral fat, BMR
5. Values pre-populate the ClientMetric form with `source: BODY_SCAN`
6. Trainer reviews, adjusts, saves

**Implementation:**
- [ ] Camera/file upload component for scan photos
- [ ] Gemini Vision prompt: scan image → metric values JSON
- [ ] Map extracted values to ClientMetric fields
- [ ] Pre-populate 54A metric form with extracted values
- [ ] Trainer confirms before saving
- [ ] Support common scan formats (InBody, Tanita, generic)

---

## Super Admin AI Configuration

### Page: `/super-admin/ai-config`

**Prompt Editor:**
- [ ] List all AIPromptConfig records
- [ ] Inline edit: system prompt, context template, model, temperature, max tokens
- [ ] Test prompt button (send test input, see raw AI response)
- [ ] Version history (store previous prompt versions — nice-to-have)

**Usage Dashboard:**
- [ ] Total AI calls, tokens, estimated cost (global + per org)
- [ ] Charts: usage over time (daily/weekly)
- [ ] Breakdown by feature key
- [ ] Per-org usage table with daily token spend vs budget
- [ ] Error rate by feature

**Org Access Management:**
- [ ] Toggle `aiEnabled` per organization
- [ ] Set `aiDailyTokenBudget` per organization
- [ ] View which orgs have AI active

---

## Implementation Plan

### Phase 1: Schema & SDK Setup (Complexity: 3/10)
- [ ] Add `aiEnabled`, `aiDailyTokenBudget` to Organization
- [ ] Add AIPromptConfig model
- [ ] Add AIUsageLog model
- [ ] Create migration
- [ ] Install `@google/generative-ai` SDK
- [ ] Create Gemini client utility (`src/lib/ai/gemini.ts`)
- [ ] Create AI service layer with usage logging, budget checking, error handling (`src/lib/ai/service.ts`)
- [ ] Seed initial AIPromptConfig records for all 4 features
- [ ] Update `/docs/schema.md`

### Phase 2: Exercise Fuzzy Matching (Complexity: 4/10)
- [ ] Fuzzy matching utility (`src/lib/ai/exercise-matcher.ts`)
- [ ] Levenshtein distance + word overlap scoring
- [ ] Confidence threshold (above = auto-match, below = present options)
- [ ] Unit tests for matching accuracy

### Phase 3: Conversational Workout Logging (Complexity: 9/10)
- [ ] Chat UI component with message history
- [ ] Web Speech API hook (`useVoiceInput`)
- [ ] Workout logging AI prompt (natural language → structured JSON)
- [ ] Multi-turn conversation handler (context window management)
- [ ] Exercise fuzzy matching integration
- [ ] Parse AI response → populate 54A WorkoutLog form
- [ ] Confidence indicators on parsed exercises
- [ ] "Switch to manual" fallback
- [ ] Mobile-optimized layout with prominent mic button
- [ ] Integration tests with mock Gemini responses

### Phase 4: AI Program Builder (Complexity: 6/10)
- [ ] "Create with AI" button on program builder
- [ ] Description input with suggested prompt templates
- [ ] Program builder AI prompt (description → program JSON)
- [ ] Parse AI response → populate 54A program template builder
- [ ] Exercise fuzzy matching integration
- [ ] Loading/error states

### Phase 5: Program Import (Complexity: 7/10)
- [ ] Image/PDF upload component
- [ ] Mobile camera capture integration
- [ ] Program import AI prompt (Gemini Vision, image → program JSON)
- [ ] PDF text extraction for multi-page documents
- [ ] Parse AI response → populate 54A program template builder
- [ ] Exercise fuzzy matching integration
- [ ] Confidence indicators on extracted data

### Phase 6: Body Scan Reader (Complexity: 5/10)
- [ ] Scan photo upload component
- [ ] Body scan AI prompt (Gemini Vision, scan image → metrics JSON)
- [ ] Parse AI response → pre-populate ClientMetric form
- [ ] `source: BODY_SCAN` auto-set
- [ ] Support for common scan formats

### Phase 7: Super Admin AI Config (Complexity: 6/10)
- [ ] AIPromptConfig CRUD API (`/api/super-admin/ai-config`)
- [ ] AIUsageLog query API (`/api/super-admin/ai-usage`)
- [ ] Prompt editor page with inline editing
- [ ] Test prompt functionality
- [ ] Usage dashboard with charts (recharts)
- [ ] Per-org AI access management table
- [ ] Daily token budget controls

---

## Files Changed

| Area | Files |
|------|-------|
| Schema | `prisma/schema.prisma` |
| Migrations | `prisma/migrations/YYYYMMDD_*` |
| Seed data | `prisma/seed.ts` (AIPromptConfig seeds) |
| AI core | `src/lib/ai/gemini.ts`, `src/lib/ai/service.ts`, `src/lib/ai/exercise-matcher.ts`, `src/lib/ai/prompts.ts` |
| AI features | `src/lib/ai/workout-logging.ts`, `src/lib/ai/program-builder.ts`, `src/lib/ai/program-import.ts`, `src/lib/ai/body-scan.ts` |
| API routes | `src/app/api/ai/workout-log/`, `src/app/api/ai/program-builder/`, `src/app/api/ai/program-import/`, `src/app/api/ai/body-scan/`, `src/app/api/super-admin/ai-config/`, `src/app/api/super-admin/ai-usage/` |
| Components | `src/components/ai/chat-input.tsx`, `src/components/ai/voice-input.tsx`, `src/components/ai/confidence-badge.tsx`, `src/components/ai/exercise-match-picker.tsx` |
| Pages | `src/app/(dashboard)/super-admin/ai-config/` |
| Hooks | `src/hooks/useVoiceInput.ts`, `src/hooks/useAIChat.ts` |
| Docs | `docs/schema.md` |

---

## Edge Cases

1. **AI returns unknown exercise name** — Fuzzy matcher finds no match above threshold. Present trainer with top 3 closest matches + "Create new exercise" option.
2. **Voice recognition in noisy gym** — Web Speech API may produce garbled text. AI prompt should be tolerant of typos and partial words. Always show transcribed text for trainer to verify before sending.
3. **Token budget exceeded mid-session** — Show clear "AI budget reached" message. Auto-switch to manual entry. Any data already parsed is preserved in the form.
4. **Gemini API down** — All AI buttons show fallback state. Manual entry always available. No blocking of 54A functionality.
5. **Body scan from unsupported machine** — AI may not extract all fields. Partially populated form is fine — trainer fills in the rest manually.
6. **Multi-language exercise names** — AI may output exercise names in trainer's language. Fuzzy matcher should work with the Exercise table's primary language. Consider adding aliases in future.
7. **Large image uploads** — Compress images client-side before sending to Gemini. Max file size validation.
8. **Concurrent AI requests** — One trainer sends multiple AI requests rapidly. Queue or debounce to prevent duplicate usage charges.
9. **Prompt injection via voice/text input** — Sanitize user input in prompts. System prompt instructs model to only output workout/program data, ignore unrelated instructions.

---

## Environment Variables

```
GEMINI_API_KEY=           # Google Gemini API key
```

---

## Success Criteria

- [ ] Conversational workout logging parses natural language with >85% accuracy on common exercises
- [ ] Voice input works on mobile Chrome and Safari
- [ ] AI program builder generates valid, complete programs from descriptions
- [ ] Program import successfully reads common program formats (printed, PDF, screenshot)
- [ ] Body scan reader extracts metrics from InBody and Tanita printouts
- [ ] All AI features fall back gracefully to manual entry on failure
- [ ] Super admin can edit prompts and see changes reflected immediately
- [ ] Usage dashboard accurately tracks token usage and estimated costs
- [ ] Per-org token budgets are enforced
- [ ] No AI feature blocks or degrades the 54A manual workflow
