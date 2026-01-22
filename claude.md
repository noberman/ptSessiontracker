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

## Debugging Procedure
When debugging issues (UX problems, feature bugs, unexpected behavior), follow this structured process:

**Step 1: Analysis** - Present initial observations
    - Describe the reported/observed problem clearly
    - Identify the affected components, pages, or flows
    - List any error messages, logs, or symptoms observed
    - Note the expected vs actual behavior

**Step 2: Hypothesis** - State what you think is wrong
    - Propose a specific hypothesis for the root cause
    - Explain the reasoning behind this hypothesis
    - Identify which files/functions are likely involved
    - Rate confidence level (low/medium/high)

**Step 3: Verification Plan** - How to confirm the hypothesis
    - Propose specific tests for the user to perform, OR
    - Suggest adding targeted console.logs or debug statements
    - Specify exactly what to look for in the output
    - Define what result would confirm or refute the hypothesis
    - **DO NOT make code changes yet** - wait for verification results

**Step 4: Solution Proposal** - Only after problem is verified
    - Present the proposed fix with clear explanation
    - Explain WHY this fix will resolve the issue
    - Describe the expected outcome after the fix
    - List any potential side effects or risks
    - Wait for approval before implementing

**Key Debugging Rules:**
- Never jump straight to code changes without completing Steps 1-3
- If hypothesis is wrong, return to Step 2 with new information
- Keep debug logs temporary - remove after issue is resolved
- Document the root cause for future reference

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
30. **CRITICAL GIT WORKFLOW: NEVER commit directly to main branch**
    - Development flow MUST be: Local → Staging → Production
    - Create features in staging branch first
    - Test thoroughly in staging environment
    - Only merge staging to main after verification
    - Main branch = production, must always be stable
    - If git hook warns about committing to main, STOP
31. Railway deployment configuration:
    - Environment variables managed through Railway dashboard
    - Use Railway CLI for production commands
    - PostgreSQL provided by Railway
    - Staging branch → staging environment
    - Main branch → production environment
32. **CRITICAL DATABASE RULE #1: NEVER use `prisma migrate reset` on production**
    - This command DESTROYS ALL DATA permanently
    - It drops all tables and recreates from scratch
    - Only use in development environments
    - If you're about to run this command, STOP and ask the user first
33. **CRITICAL DATABASE RULE #2: For production, ONLY use `prisma migrate deploy`**
    - This safely applies pending migrations without data loss
    - Never use reset, drop, or push commands on production
    - If migrations fail, debug the specific issue - don't reset
34. For production migrations:
    - Test thoroughly in development first
    - Use `prisma migrate deploy` for production (NEVER reset)
    - Verify migrations with database queries
35. Always verify migrations ran successfully:
    - Check _prisma_migrations table
    - Verify schema changes applied correctly
36. After production migrations:
    - Update code referencing old schema
    - Deploy immediately to avoid schema/code mismatch

## Session Management Specific
37. Session validation must use secure, time-limited tokens
38. Always validate trainer-client relationships before creating sessions
39. Implement proper error handling for email validation failures
40. Maintain audit trail for all session modifications
41. Track commission calculations with clear tier progression logic

## Security & Compliance
42. Never expose API keys or tokens in code
43. Implement proper authentication checks on all routes
44. Follow data privacy requirements for client PII (name, email only)
45. Audit log all significant actions (session creation, validation, modifications)
46. Encrypt sensitive data (validation tokens) in database

