# Task 01: Foundation & Setup

**Complexity: 3/10**  
**Priority: CORE (MVP)**  
**Status: Not Started**  
**Dependencies: None**

## Objective
Set up the foundational infrastructure for the PT Session Tracker application including database configuration, environment setup, and initial project structure.

## Requirements from PRD
- PostgreSQL database setup
- Environment configuration for development and production
- Basic project structure following Next.js 15 conventions
- Development seed data for testing

## Implementation Checklist

### Database Setup
- [ ] Initialize Prisma with PostgreSQL
- [ ] Create initial migration from schema
- [ ] Set up database connection string
- [ ] Test database connection

### Environment Configuration
- [ ] Create `.env.example` file with all required variables
- [ ] Set up `.env.local` for development
- [ ] Configure database URL
- [ ] Add NextAuth secret
- [ ] Document all environment variables

### Project Structure
- [ ] Organize folder structure for components
- [ ] Set up `/src/lib` for utilities
- [ ] Create `/src/types` for TypeScript definitions
- [ ] Set up `/src/hooks` for custom React hooks

### Development Tools
- [ ] Configure Prettier for code formatting
- [ ] Set up ESLint rules
- [ ] Add TypeScript strict mode
- [ ] Create npm scripts for common tasks

### Seed Data
- [ ] Create seed script for development
- [ ] Add sample locations
- [ ] Add test users (trainer, manager, admin)
- [ ] Add sample clients
- [ ] Add sample packages and sessions

## Acceptance Criteria
- [ ] Database connects successfully
- [ ] Prisma Client generates without errors
- [ ] Environment variables are documented
- [ ] Seed script populates test data
- [ ] Project runs with `npm run dev`

## Technical Notes
- Use Railway PostgreSQL for production readiness
- Keep seed data realistic for testing commission calculations
- Ensure all timestamps use UTC
- Follow Prisma naming conventions

## Files to Create/Modify
- `/prisma/seed.ts`
- `/.env.example`
- `/src/lib/db/prisma.ts`
- `/package.json` (add seed script)
- `/tsconfig.json` (strict mode)