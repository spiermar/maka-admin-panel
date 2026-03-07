# Architecture Map

## System Overview
- The repository is a Next.js App Router application with server-first rendering in `app/` and mixed client interactivity in leaf components marked with `'use client'`.
- Runtime stack is defined in `package.json`: Next.js 16, React 19, TypeScript, `@vercel/postgres`, `iron-session`, `next-intl`, `zod`, and `recharts`.
- The app serves a financial ledger + expense reporting domain across accounts, categories, transactions, and reimbursement workflows.

## Primary Runtime Layers
- Route/UI layer: `app/` route groups `(auth)` and `(dashboard)` compose pages, layouts, loading states, and error boundaries.
- Application actions layer: `lib/actions/*.ts` exposes server actions for mutation flows and cache revalidation.
- Domain/data access layer: `lib/db/*.ts` encapsulates SQL query logic for entity-specific reads/writes.
- Cross-cutting security layer: `lib/auth/*.ts`, `middleware.ts`, and security headers in `next.config.ts`.
- Validation layer: `lib/validations/*.ts` uses Zod before DB mutations.
- Internationalization layer: `lib/i18n/*.ts` + `messages/en.json` and `messages/pt-BR.json`.

## Request and Rendering Flow
- Global layout `app/layout.tsx` loads locale/messages and wraps children with `NextIntlClientProvider`.
- `middleware.ts` resolves locale (query/cookie), sets `x-locale`, and enforces origin checks for mutating HTTP verbs.
- Protected sections are enforced in `app/(dashboard)/layout.tsx` via `requireAuth()` from `lib/auth/session.ts`.
- Server-rendered pages fetch DB data directly (for example `app/(dashboard)/accounts/page.tsx` and `app/(dashboard)/accounts/[id]/page.tsx`).
- Client components orchestrate local UI state and invoke server actions (for example `app/(auth)/login/login-form.tsx`, `app/(dashboard)/accounts/[id]/client.tsx`).

## Authentication and Session Architecture
- Session backend is `iron-session` in `lib/auth/session.ts` with strict cookies (`httpOnly`, `sameSite: 'strict'`, optional domain).
- `SESSION_SECRET` is validated at startup for presence and minimum strength.
- `requireAuth()` checks session existence and validates server-side `session_version` against `users` table for invalidation support.
- Login action in `lib/actions/auth.ts` layers defenses: Zod validation, constant-time wrappers, rate limiting, account lockout, and secure error logging.
- Logout path in `lib/actions/auth.ts` destroys session then redirects.

## Data Architecture
- Canonical schema lives in `lib/db/schema.sql` with tables: `users`, `accounts`, `categories`, `transactions`, `expense_reports`, `expenses`.
- SQL access helper functions are centralized in `lib/db/index.ts` (`queryOne`, `queryMany`, `execute`, `executeReturning`).
- Entity modules (`lib/db/accounts.ts`, `lib/db/transactions.ts`, `lib/db/expense-reports.ts`) hold most SQL and return typed objects from `lib/db/types.ts`.
- Category path and transaction listings rely on recursive CTEs in `lib/db/transactions.ts` and `lib/db/expense-reports.ts`.
- Analytics in `lib/analytics/cash-flow.ts` computes account summary, monthly series, and category breakdowns from SQL aggregates.

## Mutation and Cache Strategy
- Server actions in `lib/actions/*.ts` validate form inputs and execute DB changes.
- Cache invalidation is path-based via `revalidatePath(...)` (examples: `/`, `/accounts/[id]`, `/settings`, `/expense-reports`).
- OFX import path: UI in `components/ofx-import-dialog.tsx` parses files client-side using `lib/ofx/parser.ts`, then sends selected records to `lib/actions/ofx-import.ts`.

## Internationalization Architecture
- Locale source is middleware-set `x-locale` and cookie `locale` in `middleware.ts`.
- `lib/i18n/request.ts` resolves locale from headers and dynamically imports message bundle JSON.
- Server and client components both use `next-intl` APIs (`getTranslations`, `useTranslations`).

## Testing and Verification Architecture
- Unit/integration tests are in `__tests__/` and run with Vitest (`vitest.config.ts`, jsdom environment).
- End-to-end tests are in `e2e/` and run with Playwright (`playwright.config.ts`), with local web server bootstrap.
- Test surface includes auth/session, middleware, db helpers, analytics, validations, and transaction UI behavior.
