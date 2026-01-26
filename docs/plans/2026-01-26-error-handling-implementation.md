# Error Handling and Information Disclosure Implementation Plan

**Issue:** #17 - [HIGH] Error Handling and Information Disclosure
**Design:** docs/plans/2026-01-26-error-handling-design.md
**Estimated Time:** 1-2 hours
**Priority:** HIGH

## Overview

Implement a secure error logging utility to prevent sensitive data disclosure in authentication Server Actions. Replace error logging with sanitized output in production while preserving full debugging details in development.

## Implementation Steps

### Step 1: Create Secure Error Handler Utility

**File:** `lib/utils/error-handler.ts` (new)

```typescript
interface SecureErrorLog {
  message: string;
  timestamp: string;
  context: string;
}

export function logSecureError(context: string, error: unknown) {
  const timestamp = new Date().toISOString();

  if (process.env.NODE_ENV === 'development') {
    // Full details for development debugging
    console.error(`[${context}]`, error);
    if (error instanceof Error && error.stack) {
      console.error(`[${context}] Stack:`, error.stack);
    }
  } else {
    // Sanitized logging for production
    const sanitizedError: SecureErrorLog = {
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp,
      context,
    };

    console.error(JSON.stringify(sanitizedError));
  }
}
```

**Key implementation details:**
- Accepts `context` string for operation identification
- Accepts `error: unknown` for type safety
- Development: Full error + stack trace with context prefix
- Production: JSON-serialized sanitized object
- Timestamp added in production for log aggregation

### Step 2: Integrate Secure Error Handler into Authentication Actions

**File:** `lib/actions/auth.ts` (modify)

Replace and add error logging in login and logout functions:

```typescript
'use server';

import { redirect } from 'next/navigation';
import { queryOne } from '@/lib/db';
import { User } from '@/lib/db/types';
import { getSession } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { loginSchema } from '@/lib/validations/auth';
import { logSecureError } from '@/lib/utils/error-handler';
import { getConstantTimeDelay } from '@/lib/auth/timing-safe';
import { wrapWithConstantTime } from '@/lib/auth/timing-safe';
import { incrementFailedAttempts, resetFailedAttempts } from '@/lib/auth/account-lockout';

export async function login(prevState: any, formData: FormData) {
  const result = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  if (!result.success) {
    await wrapWithConstantTime(async () => {}, getConstantTimeDelay());
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  const { username, password } = result.data;

  const user = await wrapWithConstantTime(async () => {
    return await queryOne<User>(
      'SELECT id, username, password_hash, session_version FROM users WHERE username = $1',
      [username]
    );
  }, getConstantTimeDelay());

  if (!user) {
    await wrapWithConstantTime(async () => {}, getConstantTimeDelay());
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  const isValid = await wrapWithConstantTime(async () => {
    return await verifyPassword(password, user.password_hash);
  }, getConstantTimeDelay());

  if (!isValid) {
    logSecureError('login-failed', `Invalid password attempt for user: ${username}`);
    incrementFailedAttempts(user.id);
    await wrapWithConstantTime(async () => {}, getConstantTimeDelay());
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  try {
    await wrapWithConstantTime(async () => {
      const oldSession = await getSession();
      await oldSession.destroy();

      const session = await getSession();
      session.userId = user.id;
      session.username = user.username;
      session.sessionVersion = user.session_version || 1;
      await session.save();

      resetFailedAttempts(user.id);
    }, getConstantTimeDelay());

    return { success: true };
  } catch (error) {
    logSecureError('login-session-error', error);
    await wrapWithConstantTime(async () => {}, getConstantTimeDelay());
    return {
      success: false,
      error: 'Authentication failed',
    };
  }
}

export async function logout() {
  try {
    const session = await getSession();
    session.destroy();
    redirect('/login');
  } catch (error) {
    logSecureError('logout-error', error);
    // Still attempt redirect even if session destruction fails
    redirect('/login');
  }
}
```

**Changes made:**
1. Import `logSecureError` from error handler utility
2. Add logging for failed login attempts (invalid password)
3. Add logging for session creation errors
4. Add logging for logout errors
5. Wrap all logging with context labels ('login-failed', 'login-session-error', 'logout-error')

### Step 3: Create Unit Tests for Error Handler

**File:** `__tests__/utils/error-handler.test.ts` (new)

```typescript
import { logSecureError } from '@/lib/utils/error-handler';

describe('Secure Error Handler', () => {
  const originalEnv = process.env;
  let mockConsoleError: jest.MockedFunction<typeof console.error>;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    mockConsoleError.mockRestore();
  });

  describe('Development mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('logs full error with context label', () => {
      const error = new Error('Test error');
      logSecureError('test-context', error);

      expect(mockConsoleError).toHaveBeenCalledWith('[test-context]', error);
    });

    it('logs stack trace for Error objects', () => {
      const error = new Error('Test error');
      logSecureError('test-context', error);

      expect(mockConsoleError).toHaveBeenCalledWith('[test-context] Stack:', error.stack);
    });

    it('logs string errors', () => {
      logSecureError('test-context', 'String error');

      expect(mockConsoleError).toHaveBeenCalledWith('[test-context]', 'String error');
    });
  });

  describe('Production mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('logs sanitized error object', () => {
      const error = new Error('Test error');
      logSecureError('test-context', error);

      const loggedCalls = mockConsoleError.mock.calls;
      const logEntry = JSON.parse(loggedCalls[0][0] as string);

      expect(logEntry).toHaveProperty('message', 'Test error');
      expect(logEntry).toHaveProperty('context', 'test-context');
      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).not.toHaveProperty('stack');
    });

    it('logs unknown errors as unknown message', () => {
      logSecureError('test-context', null);

      const loggedCalls = mockConsoleError.mock.calls;
      const logEntry = JSON.parse(loggedCalls[0][0] as string);

      expect(logEntry.message).toBe('Unknown error');
    });

    it('does not include stack trace', () => {
      const error = new Error('Test error');
      logSecureError('test-context', error);

      const loggedCalls = mockConsoleError.mock.calls;
      const logEntry = JSON.parse(loggedCalls[0][0] as string);

      expect(logEntry).not.toHaveProperty('stack');
    });
  });
});
```

### Step 4: Update Authentication Action Tests

**File:** `__tests__/actions/auth.test.ts` (update or create)

Add tests to verify secure error logging integration:

```typescript
import { logSecureError } from '@/lib/utils/error-handler';

describe('Authentication Actions - Secure Logging', () => {
  it('logs failed login attempts with secure handler', async () => {
    // Test that login failures call logSecureError
    const mockLogSecureError = jest.spyOn(require('@/lib/utils/error-handler'), 'logSecureError');

    await login(null, new FormData());

    expect(mockLogSecureError).toHaveBeenCalled();
  });

  it('logs logout errors with secure handler', async () => {
    // Test that logout errors call logSecureError
    const mockLogSecureError = jest.spyOn(require('@/lib/utils/error-handler'), 'logSecureError');

    // Simulate logout error scenario
    await logout();

    expect(mockLogSecureError).toHaveBeenCalled();
  });
});
```

### Step 5: Create E2E Tests for Error Handling

**File:** `e2e/error-handling.spec.ts` (new)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Error Handling Security', () => {
  test('login failures do not expose sensitive data in responses', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'nonexistent');
    await page.fill('input[name="password"]', 'wrong');
    await page.click('button[type="submit"]');

    // Verify error response does not contain stack traces
    const errorText = await page.textContent('text=Invalid');
    expect(errorText).not.toContain('stack');
    expect(errorText).not.toContain('Error');
    expect(errorText).not.toContain('at ');
    expect(errorText).not.toContain('/');
  });

  test('logout failures redirect without exposing errors', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Logout should succeed even if session destruction has issues
    await page.goto('/logout');
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');
  });
});
```

### Step 6: Update Documentation

**File:** `docs/SECURITY_ERROR_HANDLING.md` (new)

Document secure error handling practices:

```markdown
# Secure Error Handling

## Overview

The application uses secure error logging to prevent sensitive data disclosure in production logs.

## Error Handler Utility

Location: `lib/utils/error-handler.ts`

Function: `logSecureError(context: string, error: unknown)`

## Behavior

### Development Mode
- Full error details logged (message + stack trace + context)
- Context label prefixes all logs for easy filtering
- Stack traces included for debugging

### Production Mode
- Sanitized JSON logs only
- Fields: `message`, `timestamp`, `context`
- No stack traces, file paths, or database internals

## Usage

```typescript
import { logSecureError } from '@/lib/utils/error-handler';

try {
  // Operation that may fail
} catch (error) {
  logSecureError('operation-name', error);
  return { success: false, error: 'Generic error message' };
}
```

## Best Practices

1. **Use context labels:** Identify the operation (e.g., 'login', 'session-create')
2. **Keep user messages generic:** Never expose internal details to users
3. **Log all errors:** Even if errors are handled, log for observability
4. **Test both modes:** Verify development and production logging behavior
```

### Step 7: Local Testing Checklist

Before committing:

- [ ] Create `lib/utils/error-handler.ts`
- [ ] Modify `lib/actions/auth.ts` with `logSecureError()` calls
- [ ] Create `__tests__/utils/error-handler.test.ts`
- [ ] Run `npm test` - all unit tests pass
- [ ] Run `npm run test:e2e` - all E2E tests pass
- [ ] Test in development mode: Set `NODE_ENV=development`
- [ ] Verify development logs show stack traces
- [ ] Test in production mode: Set `NODE_ENV=production`
- [ ] Verify production logs are JSON-serialized
- [ ] Verify production logs have no stack traces
- [ ] Test login with invalid password → check logs for 'login-failed' context
- [ ] Test login failure during session error → check logs for 'login-session-error' context
- [ ] Test logout → redirect succeeds even if session.destroy() fails
- [ ] Verify all authentication tests still pass

### Step 8: Create Feature Branch

```bash
git checkout -b fix/security-secure-error-logging
```

### Step 9: Commit Changes

```bash
git add .
git commit -m "fix: implement secure error logging to prevent sensitive data disclosure

- Create logSecureError utility sanitizes logs based on NODE_ENV
- Development logs include full error details and stack traces
- Production logs only include message, timestamp, context
- Applied to authentication Server Actions (login/logout)
- Prevents exposure of database schema, file paths, stack traces
- Closes #17"
```

### Step 10: Deploy to Staging

```bash
git push -u origin fix/security-secure-error-logging
gh pr create --title "fix: implement secure error logging to prevent sensitive data disclosure" \
  --body "Implements secure error logging for authentication (#17)"
```

**Staging verification:**
- Deploy code changes
- Set `NODE_ENV=production` in staging
- Verify authentication flow works normally
- Test login with invalid credentials
- Check staging logs for JSON-serialized errors
- Verify no stack traces in production logs
- Test logout functionality
- Verify logs contain context labels ('login-failed', etc.)

### Step 11: Production Deployment

**Pre-deployment:**
- Staging tests pass
- Verify log aggregation system works with JSON format
- Document log format changes for monitoring team

**Deployment:**
- Merge PR
- Verify production logs are sanitized
- Monitor authentication error rates
- Check for any unexpected error patterns
- Validate log monitoring still works with new format

## Files Modified/Created

| File | Type | Action |
|------|------|--------|
| `lib/utils/error-handler.ts` | New | Create |
| `lib/actions/auth.ts` | Edit | Add logSecureError() calls |
| `__tests__/utils/error-handler.test.ts` | New | Create |
| `__tests__/actions/auth.test.ts` | Edit | Add logging tests |
| `e2e/error-handling.spec.ts` | New | Create |
| `docs/SECURITY_ERROR_HANDLING.md` | New | Create |
| `docs/plans/2026-01-26-error-handling-design.md` | New | Create |

## Verification Commands

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Test error handler specifically
npm test utils/error-handler.test.ts

# Test error handling E2E
npm run test:e2e error-handling.spec.ts

# Test development mode logging
NODE_ENV=development npm test

# Test production mode logging
NODE_ENV=production npm test

# Manually verify log format
NODE_ENV=production npm run dev
# Trigger authentication error and check console logs
```

## Success Criteria

- ✅ Authentication errors use `logSecureError()` function
- ✅ Development logs include full error details with stack traces
- ✅ Production logs contain only message + timestamp + context
- ✅ Production logs are JSON-serialized
- ✅ No stack traces in production logs
- ✅ No file paths in production logs
- ✅ All existing tests pass
- ✅ New error handler tests pass (100% coverage)
- ✅ New E2E tests pass
- ✅ Authentication flow unaffected
- ✅ Production deployment with sanitized logs

## Rollback Plan

If issues arise:

1. **Minor issues:** Adjust logging logic, add more context, redeploy
2. **Format issues:** Revert JSON serialization to plain text
3. **Complete rollback:** Remove `lib/utils/error-handler.ts`, remove `logSecureError()` calls from auth

No database changes, so rollback is non-destructive. Authentication continues working with previous `console.error()` behavior.

## Performance Impact

**Estimated overhead:**
- Function call: <0.1ms
- JSON serialization (production only): <0.5ms
- Total per login/logout: <1ms (negligible)

**Monitoring:**
- Track login/logout latency before and after deployment
- Should see no measurable difference

## Future Enhancements (Not in Scope)

- Apply secure logging to all Server Actions (transactions, accounts, categories)
- Integrate error monitoring service (Sentry, LogRocket)
- Add error correlation IDs for distributed tracing
- Structured logging in development mode (JSON everywhere)
- Log level filtering (debug, info, warn, error)
- Centralized log aggregation (ELK stack, Datadog)

## References

- Design Document: `docs/plans/2026-01-26-error-handling-design.md`
- Issue: #17 - [HIGH] Error Handling and Information Disclosure
- OWASP Logging Cheatsheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- CWE-209: Generation of Error Message Containing Sensitive Information
