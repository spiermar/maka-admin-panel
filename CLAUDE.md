# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A financial ledger web application for managing, categorizing, and analyzing transactions across multiple accounts. 

## Tech Stack
- **Framework:** Next.js 16 (App Router), React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL

## Development Commands

```bash
# Development
npm run dev          # Start Next.js dev server on http://localhost:3000

# Build & Production
npm run build        # Build for production
npm start            # Start production server

# Unit Testing (Vitest)
npm test             # Run unit tests in watch mode
npm test -- --run    # Run unit tests once (CI mode)
npm run test:coverage # Run unit tests with coverage report
npm run test:ui      # Open Vitest UI dashboard

# E2E Testing (Playwright)
npm run test:e2e     # Run end-to-end tests
npm run test:e2e:ui  # Run E2E tests with interactive UI
npm run test:e2e:headed # Run E2E tests with visible browser
npm run test:e2e:debug  # Debug E2E tests with step-through

# Code Quality
npm run lint         # Run ESLint
```

## Coding Standards and Conventions

### Git Branching Rules

**CRITICAL: NEVER COMMIT DIRECTLY TO `main` BRANCH**

Before starting ANY work (fixes, features, or changes), you MUST:

1. **First, create a new branch** following semantic naming conventions:
   - Format: `type/description`
   - Examples: `fix/transaction-date-rendering`, `feat/user-profile-page`
   - Types: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`
   - Include ticket numbers when applicable: `feat/JIRA-123-description`
   - Use lowercase and hyphens for separators

2. **Then, implement your changes** on that branch

3. **Commit to the feature branch** (never to main)

4. **Push the branch** and create a pull request

**Workflow Enforcement:**
- Check current branch with `git branch` before committing
- If on `main`, STOP and create a feature branch first
- The only exception is when explicitly told to commit directly to main

### Version Control
- Use Conventional Commits specification for git commit messages
- Use semantic versioning (SemVer)

### Claude Temporary Plans, Checklists and Test Summaries
- Always store temporary files such as plans, checklists and test summaries to `tmp\`

## Architecture

### App Router Structure

The app uses Next.js 16 App Router with route groups:

- `app/(auth)/` - Authentication pages (login), uses separate layout
- `app/(dashboard)/` - Protected dashboard routes, all wrapped with `requireAuth()` in layout
- `app/(dashboard)/accounts/[id]/` - Dynamic account detail pages

**Route Protection:** The `(dashboard)` layout calls `requireAuth()` which redirects to `/login` if no session exists. Individual pages don't need auth checks.

### Data Layer Pattern

The codebase follows a strict separation of concerns:

```
┌─────────────────┐
│  Server Actions │  lib/actions/*.ts - Form handlers, mutations
│  (async "use server" functions)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DB Queries     │  lib/db/*.ts - Raw SQL queries
│  (queryOne, queryMany, execute helpers)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Database       │  PostgreSQL via @vercel/postgres
│  (schema in lib/db/schema.sql)
└─────────────────┘
```

**Server Actions** (`lib/actions/`) handle form submissions and mutations. They:
- Validate input with Zod schemas from `lib/validations/`
- Call database query functions
- Handle auth checks via `requireAuth()` or `getSession()`
- Use `revalidatePath()` to refresh cached data

**Database Queries** (`lib/db/`) contain raw SQL using helper functions:
- `queryOne<T>()` - Single row or null
- `queryMany<T>()` - Array of rows
- `execute()` - Mutations without return
- `executeReturning<T>()` - Mutations with RETURNING clause

**Analytics** (`lib/analytics/`) compute dashboard metrics using complex SQL queries with CTEs and window functions.

### Authentication

Uses `iron-session` for encrypted cookie-based sessions:
- `lib/auth/session.ts` - Session management utilities
- `requireAuth()` - Redirects to login if not authenticated (use in layouts/pages)
- `getSession()` - Returns session without redirect (use in Server Actions)
- `getCurrentUser()` - Returns user or null

Passwords are hashed with bcrypt (cost factor 12).

### Categories System

Categories support 3-level hierarchy:
- `category_type` ENUM: 'income' or 'expense'
- `parent_id` creates tree structure
- `depth` constraint (1-3) enforced at DB level
- Recursive CTEs used to build full paths (e.g., "Housing > Rent")

### Client/Server Component Split

Pages use the pattern:
- `page.tsx` - Server Component (fetches data, handles auth)
- `client.tsx` - Client Component (interactive UI, forms, state)

Server Components pass data as props to Client Components. This maximizes performance while enabling interactivity.

## Key Files

### Database Layer
- `lib/db/schema.sql` - Complete database schema
- `lib/db/index.ts` - Query helper functions
- `lib/db/transactions.ts` - Transaction queries
- `lib/db/accounts.ts` - Account queries
- `lib/db/categories.ts` - Category queries with tree operations
- `lib/db/types.ts` - TypeScript types for database models

### Analytics
- `lib/analytics/cash-flow.ts` - Dashboard metrics (monthly cash flow, category breakdowns, account summaries)
- Uses complex SQL with CTEs, window functions, and recursive queries

### Validation
- `lib/validations/*.ts` - Zod schemas for all forms
- Used by Server Actions to validate input before DB operations

### Testing

**Unit Tests (Vitest):**
- `__tests__/` - Unit tests using Vitest
- `vitest.config.ts` - Vitest configuration for Next.js 16
- `vitest.setup.ts` - Global test setup and mocks

**End-to-End Tests (Playwright):**
- `e2e/` - E2E tests using Playwright
- `e2e/auth.spec.ts` - Authentication flow tests
- `e2e/dashboard.spec.ts` - Dashboard visualization tests
- `e2e/navigation.spec.ts` - Navigation and routing tests
- `e2e/visual.spec.ts` - Visual regression and accessibility tests
- `e2e/helpers/auth.ts` - Reusable authentication helpers
- `playwright.config.ts` - Playwright configuration
- See `e2e/README.md` and `e2e/QUICK_START.md` for detailed documentation

## Configuration

### Database Setup

```bash
# Initialize database (requires PostgreSQL connection)
psql $DATABASE_URL -f scripts/init-db.sql

# This runs:
# 1. lib/db/schema.sql - Creates tables and schema
# 2. Seed data in scripts/init-db.sql - Default admin user and test data
```

**Default credentials:**
- Username: `admin`
- Password: `admin123`

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

- `POSTGRES_URL` - PostgreSQL connection string (Neon or local)
- `SESSION_SECRET` - Generate with: `openssl rand -base64 32`
- `NODE_ENV` - Set to `development` or `production`

## MCP Tools
- Use Next.js DevTools MCP server for Next.js development tools and utilities for coding agents.
- Use the Playright MCP server for browser automation capabilities using Playwright.

## Workflows

### Development Workflow for Fixes and Features

**MANDATORY: This workflow MUST be followed for ALL changes. No exceptions.**

When implementing fixes or new features, follow this workflow IN ORDER:

1. **FIRST: Create a new branch** (BEFORE writing any code or making any changes):
   ```bash
   # Check you're on main first
   git branch

   # Create and switch to new branch
   git checkout -b feat/your-feature-description
   # or
   git checkout -b fix/bug-description
   ```

   **STOP HERE if you're still on `main` - create the branch before proceeding!**

2. **SECOND: Implement your changes** following the architecture patterns and coding standards

3. **THIRD: Commit your changes** to the feature branch using Conventional Commits format:
   ```bash
   git add .
   git commit -m "feat: add user profile page"
   # or
   git commit -m "fix: resolve session expiration issue"
   ```

   Common commit types:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style/formatting (no logic changes)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Build process, dependencies, tooling

4. **FOURTH: Verify you're on a feature branch before committing**:
   ```bash
   # Check current branch - should NOT be 'main'
   git branch
   # If output shows '* main', STOP and create a feature branch first
   ```

5. **FIFTH: Push your branch** to remote:
   ```bash
   git push -u origin feat/your-feature-description
   ```

6. **SIXTH: Open a Pull Request**:
   - Use the `/pr` command or create PR manually via GitHub CLI:
     ```bash
     gh pr create --title "feat: your feature description" --body "Description of changes"
     ```
   - Provide a clear description of what changed and why
   - Reference any related issues
   - Ensure all tests pass before requesting review

**CRITICAL REMINDER:**
- ✅ ALWAYS work on feature branches
- ❌ NEVER commit directly to `main`
- 🛑 If you find yourself about to commit to `main`, STOP and create a feature branch first

## Important Context

### Database Schema Notes

**Transactions:**
- `amount` is DECIMAL(15,2) - positive for income, negative for expenses
- `date` is DATE type (not timestamp)
- Cascading deletes: deleting account deletes its transactions
- `category_id` can be NULL (uncategorized)

**Categories:**
- Self-referencing `parent_id` for tree structure
- `depth` check constraint ensures max 3 levels
- Cascading deletes propagate down tree

**Indexes:**
- `idx_transactions_account_date` - Account view queries
- `idx_transactions_date` - Dashboard date-based aggregations
- `idx_categories_parent` - Tree traversal queries

### Path Alias

The project uses `@/*` to reference the root directory:
```typescript
import { requireAuth } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
```

### UI Components

Uses Shadcn UI components in `components/ui/`. These are copied into the project (not installed as package) and can be modified directly. Built on Radix UI primitives with Tailwind styling.

Domain components in `components/dashboard/`, `components/transactions/`, etc. compose UI components with business logic.