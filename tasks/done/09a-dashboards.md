# Task 09A: Dashboards

**Complexity: 5/10**  
**Priority: CORE (MVP)**  
**Status: Not Started**  
**Dependencies: Task 06C (Session Management), Task 07 (Commission System)**

## Objective
Implement role-specific dashboards providing real-time visibility into sessions, performance metrics, and operational insights.

## Requirements from PRD
- Trainer dashboard with commission progress
- Club Manager oversight dashboard
- PT Manager multi-club view
- Admin system overview
- Real-time data updates

## Implementation Checklist

### Trainer Dashboard
- [x] Welcome message with name
- [x] Today's sessions list
- [x] Quick add session button
- [x] Month-to-date metrics:
  - [x] Sessions completed
  - [x] Total session value
  - [x] Validation rate
  - [ ] Commission tier progress (commission system not built yet)
- [x] My clients list
- [x] Pending validations alert
- [x] Recent activity feed

### Club Manager Dashboard
- [x] Club overview stats
- [x] Active trainers today
- [x] Sessions by trainer (table)
- [x] Daily/weekly/monthly totals
- [x] Validation rate by trainer
- [ ] Unassigned clients alert
- [ ] Low validation warnings
- [x] Quick actions menu

### PT Manager Dashboard
- [x] Multi-location selector
- [x] Aggregate statistics
- [x] Performance comparison
- [x] Trainer rankings
- [x] Location comparison charts
- [ ] System-wide alerts
- [x] Trend analysis graphs

### Admin Dashboard
- [x] System health metrics (uses PT Manager dashboard)
- [x] User activity summary
- [ ] Email delivery status
- [ ] Recent audit logs
- [ ] Database statistics
- [ ] Error monitoring
- [ ] Configuration shortcuts

### Dashboard Components
- [x] Stats cards (reusable)
- [x] Activity feed widget
- [x] Progress bars/gauges
- [x] Mini charts/sparklines (using Recharts)
- [x] Alert notifications
- [x] Quick action buttons
- [x] Data refresh indicator

### Performance Metrics
- [x] Sessions per day/week/month
- [x] Average sessions per trainer
- [ ] Peak activity times
- [x] Validation success rate
- [x] Client engagement rate
- [x] Revenue metrics

### Real-time Updates
- [x] Auto-refresh data (30 seconds)
- [ ] WebSocket for live updates (optional)
- [x] Loading states
- [x] Error recovery
- [ ] Offline indicator

## Acceptance Criteria
- [x] Role-appropriate dashboard loads
- [x] Data updates without page refresh
- [x] Mobile-responsive layout
- [x] Charts render correctly
- [x] Quick actions work properly
- [x] Performance under 3 second load

## Technical Notes
- Use React Query for data fetching
- Implement data caching strategy
- Consider chart library (Chart.js/Recharts)
- Optimize database queries
- Use indexes for aggregations

## Dashboard Layout (Trainer)
```
+----------------------------------+
|  Welcome, John Smith      [Add]  |
+----------------------------------+
| Today: 5 sessions | This Month:  |
| ✅ 3 validated    | 45 sessions   |
| ⏳ 2 pending      | $4,500 value  |
+----------------------------------+
| Commission Progress:              |
| [=======>    ] 45/60 sessions    |
| Current tier: 30%                |
+----------------------------------+
| My Clients        | Recent        |
| • Jane Doe       | 10:00 - Jane  |
| • Bob Smith      | 14:00 - Bob   |
| • Alice Johnson  | 16:30 - Alice |
+----------------------------------+
```

## Files to Create/Modify
- `/src/app/dashboard/page.tsx`
- `/src/app/dashboard/trainer/page.tsx`
- `/src/app/dashboard/manager/page.tsx`
- `/src/app/dashboard/admin/page.tsx`
- `/src/components/dashboard/StatsCard.tsx`
- `/src/components/dashboard/ActivityFeed.tsx`
- `/src/components/dashboard/ProgressGauge.tsx`
- `/src/components/dashboard/QuickActions.tsx`
- `/src/hooks/useDashboardData.ts`