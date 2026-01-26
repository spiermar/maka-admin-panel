# CSRF Protection Implementation Plan

**Issue:** #12 - [CRITICAL] Missing CSRF Protection on State-Changing Operations
**Design:** docs/plans/2026-01-26-csrf-protection-design.md
**Estimated Time:** 2-3 hours
**Priority:** CRITICAL

## Overview

Implement Origin and Referer header validation in Next.js middleware to protect all state-changing Server Actions from CSRF attacks.

## Implementation Steps

### Step 1: Create Middleware Configuration

**File:** `middleware.ts` (new, project root)

Create Next.js middleware that validates Origin/Referer headers for POST/PUT/DELETE/PATCH requests.

```typescript
import { NextRequest, NextResponse } from 'next/server';

function getAllowListOrigins(): string[] {
  const allowedOrigins = process.env.ALLOWED_ORIGINS;

  // If no origins configured, skip validation (safe default for initial deployment)
  if (!allowedOrigins) {
    return [];
  }

  return allowedOrigins.split(',').map(origin => origin.trim());
}

function isValidOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false;

  try {
    const originUrl = new URL(origin);
    return allowedOrigins.some(allowed => {
      const allowedUrl = new URL(allowed);
      return originUrl.origin === allowedUrl.origin;
    });
  } catch {
    return false;
  }
}

function getOriginFromHeaders(request: NextRequest): string | null {
  // Prefer Origin header (cross-origin requests)
  const origin = request.headers.get('origin');

  // Fall back to Referer header (same-origin requests)
  if (origin) {
    return origin;
  }

  const referer = request.headers.get('referer');
  if (!referer) {
    return null;
  }

  try {
    const refererUrl = new URL(referer);
    return refererUrl.origin;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const allowedOrigins = getAllowListOrigins();

  // Skip validation if no origins configured (safe default)
  if (allowedOrigins.length === 0) {
    return NextResponse.next();
  }

  // Skip validation for safe methods (GET, HEAD, OPTIONS)
  const method = request.method;
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return NextResponse.next();
  }

  const origin = getOriginFromHeaders(request);

  if (!isValidOrigin(origin, allowedOrigins)) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[CSRF] Invalid origin:', {
        origin,
        allowedOrigins,
        path: request.nextUrl.pathname,
      });
    } else {
      console.error('[CSRF] Invalid request origin blocked');
    }

    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
```

**Key implementation details:**
- Uses `ALLOWED_ORIGINS` env var for trusted domains
- Safe default skips validation if not configured (prevents breakage)
- Validates both Origin and Referer headers with fallback logic
- Returns generic 403 to prevent information leakage
- Matcher excludes static assets for performance

### Step 2: Update Environment Configuration

**File:** `.env.example`

Add the new environment variable:

```bash
# CSRF Protection - Comma-separated list of allowed origins
# Format: https://yourdomain.com,https://www.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com
```

**File:** Deployment documentation (update existing docs)

Add section for `ALLOWED_ORIGINS` configuration:
- Production: Set to actual deployment domain(s)
- Development: Set to `http://localhost:3000` or leave empty (validation disabled)
- Multiple environments: Comma-separated list

### Step 3: Create Unit Tests

**File:** `__tests__/middleware.test.ts` (new)

```typescript
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';

describe('CSRF Middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Origin validation', () => {
    it('allows requests with valid Origin header', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const request = new NextRequest('http://example.com/api/transactions', {
        method: 'POST',
        headers: { origin: 'https://example.com' },
      });

      const response = middleware(request);
      expect(response.status).toBeUndefined(); // NextResponse.next() has no status
    });

    it('blocks requests with invalid Origin header', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const request = new NextRequest('http://example.com/api/transactions', {
        method: 'POST',
        headers: { origin: 'https://malicious.com' },
      });

      const response = middleware(request);
      expect(response.status).toBe(403);
    });

    it('allows requests with valid Referer header when Origin missing', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const request = new NextRequest('http://example.com/api/transactions', {
        method: 'POST',
        headers: { referer: 'https://example.com/dashboard' },
      });

      const response = middleware(request);
      expect(response.status).toBeUndefined();
    });
  });

  describe('Method filtering', () => {
    it('skips validation for GET requests', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const request = new NextRequest('http://example.com/api/data', {
        method: 'GET',
        headers: { origin: 'https://malicious.com' },
      });

      const response = middleware(request);
      expect(response.status).toBeUndefined();
    });

    it('skips validation for HEAD requests', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const request = new NextRequest('http://example.com/api/data', {
        method: 'HEAD',
        headers: { origin: 'https://malicious.com' },
      });

      const response = middleware(request);
      expect(response.status).toBeUndefined();
    });
  });

  describe('Safe default behavior', () => {
    it('skips validation when ALLOWED_ORIGINS is not set', () => {
      process.env.ALLOWED_ORIGINS = '';

      const request = new NextRequest('http://example.com/api/transactions', {
        method: 'POST',
      });

      const response = middleware(request);
      expect(response.status).toBeUndefined();
    });
  });
});
```

### Step 4: Create Integration/E2E Tests

**File:** `e2e/csrf.spec.ts` (new)

```typescript
import { test, expect } from '@playwright/test';

test.describe('CSRF Protection', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('blocks requests with invalid Origin header', async ({ request }) => {
    const response = await request.post('/api/transactions', {
      headers: {
        origin: 'https://malicious.com',
      },
      form: {
        account_id: '1',
        amount: '-100',
        payee: 'Attacker',
      },
    });

    expect(response.status()).toBe(403);
  });

  test('allows requests with valid Origin header', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Add Transaction');

    // Fill and submit transaction form (valid Origin)
    await page.fill('input[name="amount"]', '100');
    await page.fill('input[name="payee"]', 'Test Payee');
    await page.click('button[type="submit"]');

    // Should succeed with valid Origin
    await expect(page.locator('text=Transaction added')).toBeVisible();
  });
});
```

### Step 5: Update Documentation

**File:** `DEPLOYMENT.md` (append)

```markdown
## CSRF Protection Configuration

The application uses middleware-based CSRF protection requiring proper `ALLOWED_ORIGINS` configuration.

### Environment Variables

```bash
# Required for production deployment
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Configuration Guide

**Production:**
Set `ALLOWED_ORIGINS` to your deployment domain(s). Use comma-separated values for multiple domains.

**Development:**
Can leave empty to skip validation, or set to `http://localhost:3000` for full testing.

**Troubleshooting:**
- 403 errors on legitimate requests: Check `ALLOWED_ORIGINS` matches actual domain
- Missing Origin headers: Ensure client sends proper headers (browsers do this automatically)
- API issues: Verify static asset paths excluded in middleware matcher
```

### Step 6: Local Testing Checklist

Before committing:

- [ ] Create `middleware.ts` file
- [ ] Add `ALLOWED_ORIGINS` to `.env.local` (e.g., `http://localhost:3000`)
- [ ] Run `npm run dev` and verify no startup errors
- [ ] Login form works correctly
- [ ] Create transaction form works
- [ ] Update transaction form works
- [ ] Delete transaction works
- [ ] All existing E2E tests pass: `npm run test:e2e`
- [ ] New middleware unit tests pass: `npm test middleware.test.ts`
- [ ] New CSRF E2E tests pass: `npm run test:e2e csrf.spec.ts`

### Step 7: Create Feature Branch

```bash
# Create new branch following conventions
git checkout -b fix/security-add-csrf-protection
```

### Step 8: Commit Changes

```bash
git add .
git commit -m "fix: add CSRF protection via Origin header validation

- Next.js middleware validates Origin/Referer headers
- Protects all state-changing Server Actions from CSRF
- Safe default: skips validation if ALLOWED_ORIGINS not configured
- Adds unit tests and E2E tests for cross-site attacks
- Closes #12"
```

### Step 9: Deploy to Staging

```bash
# Push branch
git push -u origin fix/security-add-csrf-protection

# Create PR
gh pr create --title "fix: add CSRF protection via Origin header validation" \
  --body "Implements CSRF protection for all state-changing operations (#12)"
```

**Staging verification:**
- [ ] Set `ALLOWED_ORIGINS` in staging environment
- [ ] Deploy to staging via CI/CD
- [ ] Run full test suite on staging
- [ ] Verify normal operations (login, transactions, accounts)
- [ ] Check logs for CSRF validation errors
- [ ] Test with invalid Origin header via curl

### Step 10: Production Deployment

**Pre-deployment:**
- [ ] Staging tests pass
- [ ] Set `ALLOWED_ORIGINS` in production environment
- [ ] Backup production database (rollback precaution)

**Deployment:**
- [ ] Merge PR to main
- [ ] CI/CD runs all tests
- [ ] Deploy to production
- [ ] Monitor 403 error rates
- [ ] Verify user operations successful
- [ ] Check application logs for anomalies

## Files Modified/Created

| File | Type | Action |
|------|------|--------|
| `middleware.ts` | New | Create |
| `.env.example` | Edit | Add ALLOWED_ORIGINS |
| `__tests__/middleware.test.ts` | New | Create |
| `e2e/csrf.spec.ts` | New | Create |
| `DEPLOYMENT.md` | Edit | Add CSRF configuration section |
| `docs/plans/2026-01-26-csrf-protection-design.md` | Create | Design document |

## Verification Commands

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Test middleware in isolation
npm test middleware.test.ts

# Test CSRF scenarios
npm run test:e2e csrf.spec.ts

# Lint check
npm run lint

# Type check
npm run build
```

## Success Criteria

- ✅ All state-changing Server Actions protected by Origin validation
- ✅ Cross-site attacks blocked with 403 response
- ✅ Normal application operation uninterrupted
- ✅ All existing tests pass
- ✅ New middleware tests pass (100% coverage)
- ✅ CSRF E2E tests pass
- ✅ Production deployment with `ALLOWED_ORIGINS` configured
- ✅ Zero false positives for legitimate requests

## Rollback Plan

If issues arise:

1. **Immediate:** Remove or rename `middleware.ts` to disable CSRF validation
2. **Alternative:** Set `ALLOWED_ORIGINS` to empty string in environment (safe default)
3. **Permanent:** Revert commit via `git revert <commit-hash>`

No database changes required, so rollback is non-destructive.

## References

- Design Document: `docs/plans/2026-01-26-csrf-protection-design.md`
- Issue: #12 - [CRITICAL] Missing CSRF Protection on State-Changing Operations
- Next.js Middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware
- OWASP CSRF: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
