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
- [ ] Welcome message with name
- [ ] Today's sessions list
- [ ] Quick add session button
- [ ] Month-to-date metrics:
  - [ ] Sessions completed
  - [ ] Total session value
  - [ ] Validation rate
  - [ ] Commission tier progress
- [ ] My clients list
- [ ] Pending validations alert
- [ ] Recent activity feed

### Club Manager Dashboard
- [ ] Club overview stats
- [ ] Active trainers today
- [ ] Sessions by trainer (table)
- [ ] Daily/weekly/monthly totals
- [ ] Validation rate by trainer
- [ ] Unassigned clients alert
- [ ] Low validation warnings
- [ ] Quick actions menu

### PT Manager Dashboard
- [ ] Multi-location selector
- [ ] Aggregate statistics
- [ ] Performance comparison
- [ ] Trainer rankings
- [ ] Location comparison charts
- [ ] System-wide alerts
- [ ] Trend analysis graphs

### Admin Dashboard
- [ ] System health metrics
- [ ] User activity summary
- [ ] Email delivery status
- [ ] Recent audit logs
- [ ] Database statistics
- [ ] Error monitoring
- [ ] Configuration shortcuts

### Dashboard Components
- [ ] Stats cards (reusable)
- [ ] Activity feed widget
- [ ] Progress bars/gauges
- [ ] Mini charts/sparklines
- [ ] Alert notifications
- [ ] Quick action buttons
- [ ] Data refresh indicator

### Performance Metrics
- [ ] Sessions per day/week/month
- [ ] Average sessions per trainer
- [ ] Peak activity times
- [ ] Validation success rate
- [ ] Client engagement rate
- [ ] Revenue metrics

### Real-time Updates
- [ ] Auto-refresh data (30 seconds)
- [ ] WebSocket for live updates (optional)
- [ ] Loading states
- [ ] Error recovery
- [ ] Offline indicator

## Acceptance Criteria
- [ ] Role-appropriate dashboard loads
- [ ] Data updates without page refresh
- [ ] Mobile-responsive layout
- [ ] Charts render correctly
- [ ] Quick actions work properly
- [ ] Performance under 3 second load

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