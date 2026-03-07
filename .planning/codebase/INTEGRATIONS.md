# Integrations Map

## Database Integration (PostgreSQL via Vercel Postgres)
- The app integrates with PostgreSQL through `@vercel/postgres` in `lib/db/index.ts`.
- Connection is environment-driven (`POSTGRES_URL` documented in `.env.example`).
- Direct SQL access is used by server modules instead of an ORM (`lib/db/*.ts`).
- Schema bootstrap and seed data are applied from `lib/db/schema.sql` and `scripts/init-db.sql` via `scripts/init-db.js`.
- Runtime writes/reads for financial records occur through action + DB module pairs such as `lib/actions/transactions.ts` and `lib/db/transactions.ts`.

## Authentication + Session Integration
- Session persistence integrates `iron-session` with Next cookie APIs in `lib/auth/session.ts`.
- `SESSION_SECRET` is validated for strength on startup in `lib/auth/session.ts`.
- Password verification integrates `bcrypt` in `lib/auth/password.ts` and login orchestration in `lib/actions/auth.ts`.
- Session invalidation/version checks integrate DB user state with session state in `lib/auth/session.ts` and `lib/auth/session-invalidation.ts`.
- Login hardening integrates rate limiting + lockout via `lib/auth/rate-limit.ts` and `lib/auth/account-lockout.ts`.

## CSRF / Origin-Control Integration
- Allowed origin policy integrates environment config `ALLOWED_ORIGINS` from `.env.example` with request filtering in `middleware.ts`.
- Middleware checks `origin`/`referer`/host-derived origin in `middleware.ts` for mutating methods only.
- The test route `app/api/test-csrf/route.ts` provides a target used by CSRF-oriented tests.
- Security headers integrate with response delivery in `next.config.ts` (CSP, frame, referrer, permissions, HSTS in prod).

## Internationalization Integration
- i18n is integrated with the Next.js pipeline using `next-intl/plugin` in `next.config.ts`.
- Locale selection integrates query params/cookie/header flow through `middleware.ts`, `lib/i18n/request.ts`, and `lib/i18n/utils.ts`.
- Message catalogs integrate at runtime from `messages/en.json` and `messages/pt-BR.json`.
- Root provider wiring is in `app/layout.tsx` using `NextIntlClientProvider`.

## Financial Data Import Integration (OFX)
- External OFX file parsing integrates `ofx-parser` in `lib/ofx/parser.ts`.
- Import orchestration integrates parsed transactions with DB persistence in `lib/actions/ofx-import.ts`.
- Duplicate detection integrates OFX identifiers (`ofx_fitid`) with SQL existence checks in `lib/actions/ofx-import.ts`.
- OFX fields are persisted in transaction columns defined in `lib/db/schema.sql` (`ofx_fitid`, `ofx_memo`, `ofx_refnum`).

## Visualization + Analytics Integration
- Analytics computations integrate server-side domain logic in `lib/analytics/cash-flow.ts`.
- Chart rendering integrates Recharts components in `components/dashboard/cash-flow-chart.tsx` and `components/dashboard/category-chart.tsx`.
- Dashboard pages integrate action/data components via `app/(dashboard)/page.tsx` and `components/dashboard/*`.

## Testing and QA Integrations
- Unit + integration tests integrate Vitest/JSDOM/Testing Library using `vitest.config.ts` and `vitest.setup.ts`.
- E2E browser tests integrate Playwright with local app bootstrapping in `playwright.config.ts`.
- E2E DB lifecycle integrates direct SQL cleanup/seed in `e2e/helpers/database.ts`.
- Authentication helper integration for E2E flows is in `e2e/helpers/auth.ts`.

## Operational/Developer Integrations
- Local env loading for scripts integrates `dotenv` in `scripts/init-db.js` and `scripts/add-user.js`.
- Admin/bootstrap operations integrate CLI scripts with DB writes in `scripts/reset-admin-password.js` and `scripts/add-user.js`.
- Build/lint/test commands integrate through npm scripts in `package.json`.
- Current-state note: no outbound third-party API client integration is present in app runtime modules under `lib/` or `app/api/`; integrations are primarily package/library-level and database-centric.
