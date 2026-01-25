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

# Code Quality
npm run lint         # Run ESLint
```

## Coding Standards and Conventions

### Git Branching Rules
- Use semantic naming: `type/description` (e.g., `feature/login-page`, `fix/header-bug`)
- Types: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`
- Include ticket numbers when applicable: `feat/JIRA-123-description`
- Use lowercase and hyphens for separators
- Always create a new branch for new tasks using `/branch`

### Version Control
- Use Conventional Commits specification for git commit messages
- Use semantic versioning (SemVer)

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

- `DATABASE_URL` - PostgreSQL connection string (Neon or local)
- `SESSION_SECRET` - Generate with: `openssl rand -base64 32`
- `NODE_ENV` - Set to `development` or `production`

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