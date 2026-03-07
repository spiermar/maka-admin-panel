# Code Conventions (Current State)

## Scope
- This document captures conventions observed in the current codebase, not idealized standards.
- Core application code lives in `app/`, `components/`, and `lib/`.

## Language and Module Conventions
- TypeScript is the default for app code (`*.ts`, `*.tsx`) across `app/`, `components/`, `lib/`, and `__tests__/`.
- ESM is used project-wide (`"type": "module"` in `package.json`).
- Path aliases use `@/` for project-root imports, configured in `tsconfig.json` and `vitest.config.ts`.

## Next.js Boundary Conventions
- Server actions/modules explicitly declare `'use server'` (example: `lib/actions/auth.ts`, `lib/actions/transactions.ts`).
- Client components explicitly declare `'use client'` (example: `app/(auth)/login/login-form.tsx`, `components/transactions/transaction-table.tsx`).
- Route groups are used for separation of concerns: `app/(auth)/...` and `app/(dashboard)/...`.

## Naming and File Organization
- Domain-first grouping is consistent in `lib/`:
- `lib/actions/*` for server actions.
- `lib/db/*` for data access and SQL wrappers.
- `lib/auth/*` for auth/session/rate-limit logic.
- `lib/validations/*` for Zod schemas.
- Component folders are feature-scoped (`components/dashboard/*`, `components/settings/*`, `components/transactions/*`) plus shared primitives in `components/ui/*`.
- Test files generally mirror feature paths (`__tests__/lib/db/transactions.test.ts`, `__tests__/components/transactions/transaction-table.test.tsx`).

## Validation and Data Handling
- Input validation relies on Zod schemas in `lib/validations/*`.
- Server actions typically use `.safeParse(...)` and return structured error payloads instead of throwing (example: `lib/actions/transactions.ts`).
- SQL uses positional parameters (`$1`, `$2`, etc.) and helper wrappers from `lib/db/index.ts`.

## Error and Security Conventions
- Security-sensitive auth paths prefer controlled logging via `logSecureError` in `lib/utils/error-handler.ts`.
- Middleware centralizes origin checks and locale cookie/header behavior in `middleware.ts`.
- Some modules still use direct `console.error` in catch blocks (for example `lib/actions/transactions.ts`), so logging style is currently mixed.

## Typing and Linting Reality
- `strict: true` is enabled in `tsconfig.json`.
- ESLint enforces `@typescript-eslint/no-unused-vars` with `_` ignore patterns in `eslint.config.mjs`.
- `@typescript-eslint/no-explicit-any` is only a warning; `any` is currently present in core code (`lib/actions/auth.ts`, `lib/db/index.ts`).

## UI and i18n Conventions
- i18n uses `next-intl` with message catalogs in `messages/en.json` and `messages/pt-BR.json`.
- UI composition leans on shared primitives from `components/ui/*` and utility-class styling in JSX.
- Feature components often accept locale/language props and format values locally (example: `components/transactions/transaction-table.tsx`).

## Operational Scripts
- One-off maintenance/data scripts are in `scripts/` and run via npm scripts in `package.json`.
- SQL schema and migrations are under `lib/db/schema.sql` and `lib/db/migrations/*.sql`.
