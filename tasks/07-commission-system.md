# Task 07: Commission System

**Complexity: 4/10**  
**Priority: ENHANCEMENT (Phase 2)**  
**Status: Not Started**  
**Dependencies: Task 06C (Session Management)**

## Objective
Implement flexible commission tracking system supporting multiple calculation methods per organization.

## Commission System Architecture
**See `/docs/COMMISSION_SYSTEM_DESIGN.md` for complete system design, calculation methods, and database schema.**

## Core Requirements
- Support multiple commission calculation methods
- Count validated sessions per trainer per month
- Calculate total session values
- Only validated sessions count
- No-shows excluded
- Monthly reset
- Organization-specific configuration

## Implementation Checklist

### Commission API
- [ ] GET `/api/commission/summary` - Monthly summary
- [ ] GET `/api/commission/trainer/[id]` - Trainer details
- [ ] GET `/api/commission/period` - Custom date range
- [ ] Export endpoints for HR

### Monthly Summary Calculation
- [ ] Count validated sessions per trainer
- [ ] Sum session values per trainer
- [ ] Group by calendar month
- [ ] Exclude cancelled sessions
- [ ] Exclude no-shows
- [ ] Include substitute sessions

### Commission Dashboard
- [ ] Monthly summary table:
  - [ ] Trainer name
  - [ ] Total sessions completed
  - [ ] Total session value
  - [ ] Validation rate
  - [ ] Month-to-date progress
- [ ] Filter by month/year
- [ ] Filter by location
- [ ] Comparison with previous month

### Trainer View
- [ ] Personal commission summary
- [ ] Session count for current month
- [ ] Running total of session values
- [ ] List of validated sessions
- [ ] Progress toward next tier (if tiers configured)

### Data Export for HR
- [ ] Export to Excel/CSV format
- [ ] Include all necessary fields:
  - [ ] Trainer ID and name
  - [ ] Period (month/year)
  - [ ] Session count
  - [ ] Total value
  - [ ] Location
- [ ] Scheduled monthly reports
- [ ] Email delivery option

### Period Management
- [ ] Define commission period (calendar month)
- [ ] Handle month boundaries correctly
- [ ] Historical period access
- [ ] Year-end summaries
- [ ] Fiscal year option (if needed)

## Acceptance Criteria
- [ ] Accurate session counts per trainer
- [ ] Only validated sessions included
- [ ] Monthly totals calculate correctly
- [ ] Export format compatible with Excel
- [ ] Historical data accessible
- [ ] Real-time updates as sessions validate

## Technical Notes
- Use database aggregation for performance
- Cache monthly summaries
- Consider materialized views for reports
- UTC timezone for consistency
- Index sessions by trainer, date, validation

## Commission Calculation
**See `/docs/COMMISSION_SYSTEM_DESIGN.md` for detailed calculation examples for all supported methods:**
- Progressive Tier System
- Graduated Tier System
- Package-Based Commission
- Target-Based Commission
- Hybrid System

## Report Format
```csv
Trainer Name,Location,Month,Sessions,Total Value
John Smith,Main Gym,2024-12,45,4500.00
Jane Doe,West Branch,2024-12,38,3800.00
```

## Files to Create/Modify
- `/src/app/api/commission/route.ts`
- `/src/app/api/commission/export/route.ts`
- `/src/app/commission/page.tsx`
- `/src/app/commission/trainer/[id]/page.tsx`
- `/src/components/commission/SummaryTable.tsx`
- `/src/components/commission/TrainerProgress.tsx`
- `/src/lib/commission/calculator.ts`