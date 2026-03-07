# Stack Map

## Runtime + Framework
- Primary app framework is **Next.js 16** with **React 19** and **TypeScript** from `package.json`.
- App Router structure is in `app/` with route groups like `app/(auth)` and `app/(dashboard)`.
- Global app shell is implemented in `app/layout.tsx`.
- Middleware layer runs in `middleware.ts` for locale and origin checks.
- Next config hardens headers and wires i18n plugin in `next.config.ts`.

## UI Layer
- UI components are React function components under `components/`.
- Shared design-system primitives (shadcn/radix style) are in `components/ui/`.
- Feature UI modules are split into folders like `components/dashboard/`, `components/transactions/`, and `components/settings/`.
- Styling uses Tailwind CSS v4 + PostCSS config in `tailwind.config.ts` and `postcss.config.mjs`.
- Utility class composition uses `clsx`, `class-variance-authority`, and `tailwind-merge` from `package.json`.

## Server + Data Access
- Server mutations are implemented as Next Server Actions in `lib/actions/`.
- Database access layer uses `@vercel/postgres` SQL client in `lib/db/index.ts`.
- Query helpers (`queryOne`, `queryMany`, `execute`) are centralized in `lib/db/index.ts`.
- Domain-specific data modules are in `lib/db/accounts.ts`, `lib/db/transactions.ts`, `lib/db/categories.ts`, and `lib/db/expense-reports.ts`.
- SQL schema source-of-truth is `lib/db/schema.sql` with incremental migrations under `lib/db/migrations/`.

## Auth + Security Stack
- Session auth uses `iron-session` in `lib/auth/session.ts`.
- Password hashing/verification uses `bcrypt` in `lib/auth/password.ts`.
- Login flow server action is implemented in `lib/actions/auth.ts`.
- In-memory anti-bruteforce rate limiting uses `lru-cache` in `lib/auth/rate-limit.ts`.
- Account lockout/session invalidation helpers are in `lib/auth/account-lockout.ts` and `lib/auth/session-invalidation.ts`.
- Security headers are configured in `next.config.ts` and origin enforcement is in `middleware.ts`.

## Validation + i18n + Domain Processing
- Form and server input validation uses `zod` schemas under `lib/validations/`.
- Internationalization uses `next-intl` in `lib/i18n/request.ts` and `lib/i18n/config.ts`.
- Locale content files are in `messages/en.json` and `messages/pt-BR.json`.
- OFX parsing pipeline uses `ofx-parser` via `lib/ofx/parser.ts` and normalization helpers in `lib/ofx/utils.ts`.
- Analytics calculation layer is in `lib/analytics/` and chart rendering is in `components/dashboard/`.

## Tooling + Quality
- Linting uses ESLint 9 with Next config from `eslint.config.mjs`.
- Unit/component tests run on Vitest + Testing Library via `vitest.config.ts` and `vitest.setup.ts`.
- E2E tests run on Playwright via `playwright.config.ts` and specs in `e2e/`.
- DB/bootstrap scripts live in `scripts/` (`scripts/init-db.js`, `scripts/add-user.js`, `scripts/reset-admin-password.js`).
- TypeScript project config is in `tsconfig.json` with alias resolution used across `@/` imports.
