## Important Documentation
- Product Requirements: See `/docs/PRD.md` for business requirements and use cases
- API Documentation: See `/docs/API.md` for email service and Glofox integration specifications
- Database Schema: See `/docs/schema.md` for current Prisma schema definitions
- Architecture: See `/docs/architecture.md` for page structure and routing
- Design System: See `/docs/design-system.json` for design tokens

## Standard Workflow
1. First think through the problem and task, then read the codebase for relevant files
2. Product plans and requirements are defined in `/docs/PRD.md` and `/tasks/` directory
3. **CRITICAL: Before making ANY changes or executing ANY actions, you MUST first present the complete plan in chat and wait for explicit approval. No code changes, no file creations, no modifications without agreed plan.**
4. Before beginning work on a task, check with me to verify the plan
5. Work on todo items within tasks, marking them complete as you go
6. Provide high-level explanations of changes at each step
7. Keep every change as simple as possible - impact minimal code, prioritize simplicity
8. Verify with me before making API or database schema changes
9. Close old servers before starting new ones when testing
10. Check frontend error logs before marking tasks complete
11. Before running migrations, check local schema, production schema, and documentation alignment
12. Always create migrations for schema changes - never modify production directly
13. The .env file is hidden (.gitignore) - ask if you need to check values
14. When planning features, list implementation steps with complexity scores (1-10)
15. Always use `npm run migrate` or `npx prisma migrate` - never use direct database commands
16. Before any migration: check existing files, migrations table, and get user approval
17. Make all migrations idempotent using appropriate checks

## Tech Stack Specific Rules
18. Use Next.js 15 App Router patterns - no pages directory
19. Follow Prisma schema conventions in `/docs/schema.md`
20. Use TypeScript strictly - no `any` types without justification
21. Implement shadcn/ui components with Tailwind CSS
22. Use design tokens from `/docs/design-system.json` for consistency
23. For real-time updates, use Server-Sent Events or polling strategies
24. State management with React Context/hooks, data fetching with React Server Components when possible

## Testing & Development
25. Test using actual model methods and code paths (e.g., use Prisma models, not raw SQL)
26. Before starting development, verify local matches production:
    - Run schema comparison scripts if available
    - Sync local with production before making changes
    - Never develop against mismatched schemas
27. After creating any migration:
    - Run it locally immediately with Prisma migrate
    - Update `/docs/schema.md` with changes
    - Include migration and documentation in same commit

## Email & Integration Rules
28. For email notifications (SendGrid/Resend):
    - Follow email service API documentation in `/docs/API.md`
    - Store email templates in database or configuration
    - Implement retry logic for failed sends
    - Log all email events for audit trail
29. For Glofox data reconciliation:
    - Manual import/export only (no direct API integration in MVP)
    - Validate data formats before import
    - Log all import events with user and timestamp

## Deployment & Production
30. Railway deployment configuration:
    - Environment variables managed through Railway dashboard
    - Use Railway CLI for production commands
    - PostgreSQL provided by Railway
31. For production migrations:
    - Test thoroughly in development first
    - Use Prisma migrate deploy for production
    - Verify migrations with database queries
32. Always verify migrations ran successfully:
    - Check _prisma_migrations table
    - Verify schema changes applied correctly
33. After production migrations:
    - Update code referencing old schema
    - Deploy immediately to avoid schema/code mismatch

## Session Management Specific
34. Session validation must use secure, time-limited tokens
35. Always validate trainer-client relationships before creating sessions
36. Implement proper error handling for email validation failures
37. Maintain audit trail for all session modifications
38. Track commission calculations with clear tier progression logic

## Security & Compliance
39. Never expose API keys or tokens in code
40. Implement proper authentication checks on all routes
41. Follow data privacy requirements for client PII (name, email only)
42. Audit log all significant actions (session creation, validation, modifications)
43. Encrypt sensitive data (validation tokens) in database

## Commission & Payroll Constraints
44. CRITICAL: Commission tiers reset monthly
45. Only validated sessions count toward commission calculations
46. No-show sessions must be excluded from commission calculations
47. Commission tier breakpoints must be configurable by admin
48. Payroll reports must be exportable in Excel/CSV format

## Database Schema Changes
49. **CRITICAL SCHEMA RULE**: When proposing ANY database schema changes (new models, new fields, field modifications):
    - MUST present in ALL CAPS the exact fields being added/modified
    - MUST explain the business purpose of EACH field
    - MUST justify why each field is necessary
    - Example format:
      ```
      PROPOSED SCHEMA CHANGES:
      - NEW FIELD: Session.VALIDATED_AT (DateTime, nullable) - Timestamp when client validated
      - NEW FIELD: Session.VALIDATION_TOKEN (String, unique) - Secure token for email validation
      JUSTIFICATION: These fields are needed for tracking session validation status
      ```
    - User MUST explicitly approve before implementing any schema changes
    - This prevents adding unnecessary fields that later require migrations to remove

## PT Session Tracker Specific Rules
50. Session records must capture: trainer, client, date, time, location, package details
51. Email validation links must expire after 30 days for security
52. Commission calculations must be transparent and auditable
53. Support for multiple club locations with proper access control
54. Trainer dashboard must show real-time commission tier progress
55. All session modifications require manager-level permissions or higher
56. Client email addresses must be validated before sending confirmation emails
57. System must handle edge cases: duplicate sessions, backdated entries, future sessions