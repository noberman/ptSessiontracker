# Program Management System - Implementation Plan

## Executive Summary
Transform the onboarding and management of PT programs from a manual, friction-heavy process to an AI-powered, seamless experience that takes less than 5 minutes per program.

## Core Problem Statement
Personal trainers have years of programs in various formats (PDFs, Excel, handwritten notes) that they need to get into the system. Current solutions require manual recreation of every exercise, set, and rep - often taking hours per program. This creates massive friction for onboarding new trainers and prevents PT Managers from having visibility into program quality.

## Solution: Three-Part System

### Part 1: AI-Powered Import Engine

#### User Experience Vision
1. **PT opens import page** - Clean drag-and-drop interface
2. **Uploads ANY format** - Photo, PDF, Excel, or paste text
3. **AI processes in seconds** - Shows structured preview
4. **PT reviews & confirms** - Make any corrections
5. **Done!** - Program saved and ready for clients

#### Technical Architecture

```typescript
// Import Pipeline
interface ProgramImporter {
  // Step 1: File Processing
  extractContent(file: File): Promise<RawContent>
  
  // Step 2: AI Analysis
  parseProgram(content: RawContent): Promise<StructuredProgram>
  
  // Step 3: Exercise Matching
  matchExercises(program: StructuredProgram): Promise<MatchedProgram>
  
  // Step 4: Validation
  validateProgram(program: MatchedProgram): ValidationResult
  
  // Step 5: Save
  saveProgram(program: ValidatedProgram): Promise<Program>
}
```

#### AI Integration Options

**Option 1: OpenAI GPT-4 Vision (Recommended)**
- **Pros:** Best understanding of context, handles messy formats
- **Cons:** Cost per request, requires API management
- **Implementation:**
```typescript
const analyzeProgram = async (imageBase64: string) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: "Extract the workout program from this image. Return as JSON with exercises, sets, reps, and structure."
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`
          }
        }
      ]
    }]
  });
  return JSON.parse(response.choices[0].message.content);
};
```

**Option 2: Custom ML Pipeline**
- OCR → Table Detection → NLP Extraction
- More control but more complex

#### Exercise Database Design

```typescript
// Fuzzy matching for exercise variations
class ExerciseMapper {
  private aliases = {
    'bench press': ['bp', 'bench', 'barbell bench press', 'bb bench'],
    'squat': ['back squat', 'barbell squat', 'squats'],
    'deadlift': ['dl', 'conventional deadlift', 'deads']
  };
  
  findExercise(name: string): Exercise | null {
    // Direct match
    const direct = this.exercises.find(e => 
      e.name.toLowerCase() === name.toLowerCase()
    );
    if (direct) return direct;
    
    // Fuzzy match
    const normalized = name.toLowerCase().trim();
    for (const [canonical, aliasList] of Object.entries(this.aliases)) {
      if (aliasList.includes(normalized)) {
        return this.exercises.find(e => e.name === canonical);
      }
    }
    
    // Levenshtein distance for close matches
    return this.findClosestMatch(name);
  }
}
```

### Part 2: PT Manager Quality Control

#### Dashboard Features
1. **Program Queue** - New programs awaiting approval
2. **Quick Review** - Side-by-side program viewer
3. **Inline Comments** - Suggest improvements
4. **Approval Actions** - Approve, Request Changes, Reject
5. **Template Library** - Approved programs become templates

#### Approval Workflow

```typescript
interface ProgramApproval {
  program: Program;
  status: 'PENDING' | 'APPROVED' | 'NEEDS_REVISION' | 'REJECTED';
  reviewer: User;
  comments: Comment[];
  revisionRequests: RevisionRequest[];
  approvalDate?: Date;
}

// PT Manager sees all pending programs
const getPendingPrograms = async (managerId: string) => {
  return prisma.program.findMany({
    where: {
      status: 'PENDING_APPROVAL',
      trainer: {
        locationId: { in: managerLocations }
      }
    },
    include: {
      trainer: true,
      exercises: true,
      client: true
    }
  });
};
```

### Part 3: Smart Program Features

#### Auto-Enhancement
When a program is imported, the system can:
- Suggest missing rest periods based on exercise type
- Flag potential issues (e.g., no warm-up, too much volume)
- Recommend complementary exercises
- Add video links for exercises

#### Program Analytics
- Track which programs get best results
- Identify most effective exercise combinations
- Monitor client adherence rates
- Generate insights for PT Managers

## Implementation Timeline

### Sprint 1: Foundation (Week 1-2)
- [ ] Create Program, Exercise, ProgramExercise models
- [ ] Build basic manual program creation UI
- [ ] Set up exercise database with common exercises

### Sprint 2: Import Engine (Week 3-4)
- [ ] Implement file upload interface
- [ ] Integrate OCR service (start with images)
- [ ] Build exercise matching algorithm
- [ ] Create review/correction UI

### Sprint 3: AI Integration (Week 5-6)
- [ ] Set up OpenAI API integration
- [ ] Train prompts for program extraction
- [ ] Handle multiple formats (PDF, Excel)
- [ ] Implement confidence scoring

### Sprint 4: Quality Control (Week 7-8)
- [ ] Build PT Manager dashboard
- [ ] Create approval workflow
- [ ] Add commenting system
- [ ] Implement revision requests

### Sprint 5: Polish & Scale (Week 9-10)
- [ ] Optimize for mobile
- [ ] Add bulk import for multiple programs
- [ ] Create template library
- [ ] Performance optimization

## Success Metrics

### Quantitative
- **Import Speed:** <5 minutes per program (vs 30-60 minutes manual)
- **Accuracy:** 95% exercise recognition accuracy
- **Adoption:** 80% of PTs use import feature in first month
- **Approval Time:** <24 hours for program approval

### Qualitative
- PTs feel the system "just works" with their existing materials
- PT Managers have confidence in program quality
- Clients receive consistent, high-quality programs
- Reduced friction leads to faster PT onboarding

## Technical Decisions Needed

1. **AI Service Selection**
   - OpenAI GPT-4 Vision (best quality, higher cost)
   - Google Cloud Vision + Natural Language (good balance)
   - AWS Textract + Comprehend (AWS ecosystem)
   - Custom solution (most control, most work)

2. **Exercise Database Source**
   - Build custom (full control)
   - WGER API (open source, 800+ exercises)
   - ExRx.net data (comprehensive but needs licensing)

3. **File Processing Architecture**
   - Client-side processing (faster, privacy)
   - Server-side queue (better for large files)
   - Hybrid approach (recommended)

4. **Storage Strategy**
   - Store original uploads for reference
   - Version control for program edits
   - CDN for exercise videos/images

## Risk Mitigation

### Technical Risks
- **AI Accuracy:** Have manual fallback, allow easy corrections
- **Processing Time:** Show progress, process in background
- **Cost Management:** Set limits, cache results, batch processing

### User Adoption Risks
- **Trust in AI:** Show confidence scores, allow full editing
- **Change Resistance:** Make it optional initially, show clear benefits
- **Data Loss Fear:** Keep original files, version everything

## Next Steps

1. **Prototype the import flow** with a simple OCR implementation
2. **Test with real PT programs** in various formats
3. **Get feedback from 3-5 PTs** on the experience
4. **Refine the AI prompts** based on real-world data
5. **Build the MVP** focusing on the most common format first

## Conclusion

This system will transform program management from a burden to a competitive advantage. By removing friction from the onboarding process and giving PT Managers visibility into program quality, we can:
- Onboard new PTs in minutes, not days
- Ensure consistent quality across all programs
- Build a valuable library of proven programs
- Focus PTs on training clients, not data entry

The key is to start simple (basic import), prove value, then expand capabilities based on user feedback.