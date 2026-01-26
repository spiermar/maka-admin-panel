# GitHub Actions CI Workflow Design

**Date:** 2026-01-25
**Status:** Approved

## Overview

Implement a comprehensive GitHub Actions CI workflow that runs automatically on every pull request to validate code quality, build integrity, and test coverage.

## Goals

- Run all validation checks (lint, type check, build, tests) on every PR
- Provide fast feedback through parallel job execution
- Ensure PRs cannot merge until all checks pass
- Generate test reports and coverage artifacts for review

## Workflow Structure

The CI workflow consists of 4 parallel jobs:

1. **Lint & Type Check** - ESLint + TypeScript compiler validation
2. **Build** - Next.js production build validation
3. **Unit Tests** - Vitest tests with coverage reporting
4. **E2E Tests** - Playwright browser automation tests (depends on Build)

### Trigger Configuration

- Runs on all pull requests targeting `main` branch
- Runs on direct pushes to `main` (post-merge validation)
- Can be manually triggered via `workflow_dispatch`

### Common Setup

All jobs use:
- Node.js 18
- `npm ci` for consistent dependency installation
- npm cache for faster subsequent runs

## Job Details

### Job 1: Lint & Type Check

**Purpose:** Validate code style and TypeScript types

**Steps:**
1. Checkout code
2. Setup Node.js with cache
3. Install dependencies (`npm ci`)
4. Run ESLint (`npm run lint`)
5. Run TypeScript compiler (`tsc --noEmit`)

**Runtime:** ~20-30 seconds
**Environment:** No special variables needed

### Job 2: Build

**Purpose:** Ensure Next.js app builds successfully for production

**Steps:**
1. Checkout code
2. Setup Node.js with cache
3. Install dependencies (`npm ci`)
4. Run production build (`npm run build`)

**Runtime:** ~1-2 minutes
**Environment:**
- `NODE_ENV=test`
- `POSTGRES_URL=${{ secrets.DATABASE_URL }}`
- `SESSION_SECRET=${{ secrets.SESSION_SECRET }}`

### Job 3: Unit Tests

**Purpose:** Run Vitest unit tests and generate coverage reports

**Steps:**
1. Checkout code
2. Setup Node.js with cache
3. Install dependencies (`npm ci`)
4. Run unit tests in CI mode (`npm run test -- --run --coverage`)
5. Upload coverage report as artifact

**Runtime:** ~30-60 seconds
**Environment:**
- `NODE_ENV=test`

**Artifacts:**
- Coverage report (retained 30 days)

### Job 4: E2E Tests

**Purpose:** Run full-stack Playwright browser automation tests

**Dependencies:** Requires Build job to complete first

**Steps:**
1. Checkout code
2. Setup Node.js with cache
3. Install dependencies (`npm ci`)
4. Install Playwright browsers (`npx playwright install --with-deps chromium`)
5. Run E2E tests (`npm run test:e2e`)
6. Upload Playwright HTML report (always)
7. Upload test videos/screenshots (on failure only)
8. Post test summary as PR comment (on PRs only)

**Runtime:** ~2-3 minutes
**Environment:**
- `NODE_ENV=test`
- `POSTGRES_URL=${{ secrets.DATABASE_URL }}`
- `SESSION_SECRET=${{ secrets.SESSION_SECRET }}`

**Artifacts:**
- Playwright HTML report (retained 30 days)
- Test videos and screenshots (retained 7 days, failures only)

**PR Integration:**
- Uses `daun/playwright-report-comment@v3` to post test results on PR

## Environment Configuration

### Required GitHub Secrets

Must be configured in repository settings (Settings → Secrets and variables → Actions):

1. **DATABASE_URL**
   - Neon PostgreSQL connection string
   - Value: `postgresql://neondb_owner:npg_B3WQXepYF6uV@ep-small-king-ahp7ao4n-pooler.c-3.us-east-1.aws.neon.tech/ledger?sslmode=require&channel_binding=require`

2. **SESSION_SECRET**
   - iron-session encryption key
   - Generate with: `openssl rand -base64 32`

### Database Strategy

**External Database:** Uses pre-configured Neon PostgreSQL database

- Database is pre-seeded with schema and test data
- Tests use existing data (e.g., default admin user)
- No database initialization or reset in CI workflow
- Tests should be idempotent where possible

**Note:** For concurrent PR testing, tests are designed to work with shared database state. Future enhancement could add test data isolation if needed.

## Status Checks & PR Requirements

All 4 jobs appear as required status checks on pull requests:
- ✅ Lint & Type Check
- ✅ Build
- ✅ Unit Tests
- ✅ E2E Tests

PRs cannot be merged until all checks pass.

## Performance Expectations

**Total Runtime:** ~3-4 minutes (parallel execution)

Individual job timings:
- Lint & Type Check: ~20-30 seconds
- Build: ~1-2 minutes
- Unit Tests: ~30-60 seconds
- E2E Tests: ~2-3 minutes (longest pole)

## File Structure

```
.github/
  workflows/
    ci.yml                    # New main CI workflow
    e2e-tests.yml.template    # Can be deleted after migration
```

## Implementation Tasks

1. Create `.github/workflows/ci.yml` workflow file
2. Configure GitHub secrets (DATABASE_URL, SESSION_SECRET)
3. Delete `.github/workflows/e2e-tests.yml.template` (obsolete)
4. Test workflow on a PR
5. Configure branch protection rules to require all 4 status checks

## Future Enhancements

- Add test result trend tracking over time
- Add code coverage reporting to PR comments
- Consider matrix testing across Node.js versions (18, 20, 22)
- Add database isolation for parallel test runs if conflicts occur
- Add caching for Playwright browsers to speed up installation
