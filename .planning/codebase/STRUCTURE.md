# Codebase Structure

## Top-Level Layout
- `app/`: Next.js App Router routes, layouts, error/loading boundaries, and page-level composition.
- `components/`: Reusable UI and feature components (`dashboard`, `transactions`, `settings`, `ui`).
- `lib/`: Business logic and infrastructure modules (actions, db, auth, analytics, i18n, validations, ofx parsing).
- `messages/`: Locale dictionaries (`en.json`, `pt-BR.json`) consumed by `next-intl`.
- `__tests__/`: Vitest tests for units and selected component/integration behaviors.
- `e2e/`: Playwright scenarios and helpers for browser-level validation.
- `scripts/`: Database bootstrap/admin scripts and data utility scripts.
- `docs/`: Deployment/security/testing plans and implementation notes.

## Route Tree (`app/`)
- `app/layout.tsx`: root HTML/body wrapper and i18n provider bootstrap.
- `app/(auth)/layout.tsx`: auth route-group shell.
- `app/(auth)/login/page.tsx`: login entry page with redirect for authenticated users.
- `app/(auth)/login/login-form.tsx`: client-side form using `useActionState(login, ...)`.
- `app/(dashboard)/layout.tsx`: protected shell calling `requireAuth()` plus dashboard header/nav.
- `app/(dashboard)/page.tsx`: dashboard metrics/charts feed from analytics.
- `app/(dashboard)/accounts/page.tsx`: account list + balances.
- `app/(dashboard)/accounts/[id]/page.tsx`: server data load for account detail.
- `app/(dashboard)/accounts/[id]/client.tsx`: transaction table/form + OFX import dialog state.
- `app/(dashboard)/settings/page.tsx` and `app/(dashboard)/settings/client.tsx`: account/category administration UI.
- `app/(dashboard)/expense-reports/**`: list, detail, and create-report flows.
- `app/api/test-csrf/route.ts`: POST endpoint used for CSRF middleware verification.

## Logic and Infrastructure (`lib/`)
- `lib/actions/`: server actions grouped by domain (`auth`, `accounts`, `transactions`, `categories`, `expense-reports`, `ofx-import`).
- `lib/db/`: typed query modules and SQL schema/migrations (`schema.sql`, `migrations/*.sql`).
- `lib/auth/`: password hashing, session handling, rate limiting, account lockout, timing-safe utilities.
- `lib/analytics/`: financial summary and breakdown computations (`cash-flow.ts`).
- `lib/validations/`: Zod schemas guarding server actions.
- `lib/i18n/`: locale config + request-time locale/message resolution.
- `lib/ofx/`: file parsing and payee extraction helpers for OFX imports.

## Component Organization (`components/`)
- `components/ui/`: base UI primitives (button, dialog, form, input, select, table, etc.).
- `components/dashboard/`: dashboard-specific presentational components (summary cards, nav, charts, recent activity).
- `components/transactions/`: transaction form/table workflows.
- `components/settings/`: account/category management feature widgets.
- `components/ofx-import-dialog.tsx`: end-user import workflow from local OFX file.

## Data and Contract Files
- `lib/db/types.ts`: shared TypeScript interfaces for persistent entities and joined views.
- `messages/en.json` and `messages/pt-BR.json`: translation source of truth.
- `.env.example`: required runtime variables (`DATABASE_URL`, `SESSION_SECRET`, origin controls).

## Test and Quality Structure
- Unit/integration tests: `__tests__/auth`, `__tests__/lib`, `__tests__/validations`, `__tests__/components`, `__tests__/middleware.test.ts`.
- E2E tests: `e2e/01-auth.spec.ts` through `e2e/09-translations.spec.ts` plus fixtures/helpers.
- Test configs: `vitest.config.ts`, `playwright.config.ts`, `vitest.setup.ts`.

## Operations and Tooling Files
- `next.config.ts`: next-intl plugin integration and global security headers.
- `middleware.ts`: locale/cookie handling and origin validation for state-changing requests.
- `tailwind.config.ts`, `postcss.config.mjs`, `components.json`: styling/UI toolchain.
- `scripts/init-db.js`, `scripts/add-user.js`, `scripts/reset-admin-password.js`: DB/admin operational scripts.
