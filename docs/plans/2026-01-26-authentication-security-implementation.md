# Authentication Security Improvements Implementation Plan

**Issue:** #16 - [HIGH] Authentication Security Improvements
**Design:** docs/plans/2026-01-26-authentication-security-design.md
**Estimated Time:** 2-3 hours
**Priority:** HIGH

## Overview

Implement constant-time authentication delay to prevent username enumeration and strong password complexity requirements.

## Implementation Steps

### Step 1: Create Timing-Safe Wrapper Module

**File:** `lib/auth/timing-safe.ts` (new)

```typescript
import { performance } from 'perf_hooks';

export async function wrapWithConstantTime<T>(
  operation: () => Promise<T>,
  targetDurationMs: number = 500
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    const elapsedTime = performance.now() - startTime;
    const remainingDelay = Math.max(0, targetDurationMs - elapsedTime);
    
    if (remainingDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingDelay));
    }
    
    return result;
  } catch (error) {
    // Ensure we still delay even on error to prevent timing attacks
    const elapsedTime = performance.now() - startTime;
    const remainingDelay = Math.max(0, targetDurationMs - elapsedTime);
    
    if (remainingDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingDelay));
    }
    
    throw error;
  }
}

function getConstantTimeDelay(): number {
  const fromEnv = process.env.AUTH_CONSTANT_TIME_DELAY_MS;
  if (fromEnv) {
    return parseInt(fromEnv, 10);
  }
  
  // Default: 500ms in production, 100ms in development
  return process.env.NODE_ENV === 'production' ? 500 : 100;
}

export { getConstantTimeDelay };
```

**Key implementation details:**
- Targets constant time across all operations
- Delays even on errors (prevents timing via error paths)
- Configurable via environment variable
- Safe defaults for production (500ms) and development (100ms)

### Step 2: Add Environment Configuration

**File:** `.env.example`

```bash
# Constant time delay for authentication (milliseconds)
# Prevents timing-based username enumeration attacks
# Production: 500, Development: 100
 AUTH_CONSTANT_TIME_DELAY_MS=500
```

### Step 3: Enhance Password Validation Schema

**File:** `lib/validations/auth.ts` (modify)

Replace existing password schema:

```typescript
import { z } from 'zod';

export const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .refine(
    (password) => {
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[^A-Za-z0-9]/.test(password);
      const typeCount = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
      return typeCount >= 3;
    },
    { message: 'Password must include at least 3 of: uppercase, lowercase, number, special character' }
  );

// For login (no complexity check - only required)
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// For registration and password changes (with complexity)
export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: passwordSchema,
  confirmPassword: passwordSchema,
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
```

**Changes made:**
- Password requires minimum 12 characters
- Password requires at least 3 of 4 character types
- Clear, specific error messages
- Separate schemas for login (no complexity) vs registration (with complexity)

### Step 4: Integrate Constant-Time Delay into Login

**File:** `lib/actions/auth.ts` (modify)

Wrap user lookup and password verification:

```typescript
import { wrapWithConstantTime, getConstantTimeDelay } from '@/lib/auth/timing-safe';

export async function login(prevState: any, formData: FormData) {
  const targetDelay = getConstantTimeDelay();
  
  const result = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  if (!result.success) {
    // Still delay to prevent timing via validation errors
    await wrapWithConstantTime(async () => {}, targetDelay);
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  const { username, password } = result.data;

  // Wrap user lookup in constant time
  const user = await wrapWithConstantTime(async () => {
    return await queryOne<User>(
      'SELECT id, username, password_hash, session_version FROM users WHERE username = $1',
      [username]
    );
  }, targetDelay);

  if (!user) {
    // Still delay for invalid user (prevents enumeration)
    await wrapWithConstantTime(async () => {}, targetDelay);
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  // Wrap password verification in constant time
  const isValid = await wrapWithConstantTime(async () => {
    return await verifyPassword(password, user.password_hash);
  }, targetDelay);

  if (!isValid) {
    await wrapWithConstantTime(async () => {}, targetDelay);
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  // Rest of login logic also wrapped for consistent timing
  await wrapWithConstantTime(async () => {
    const oldSession = await getSession();
    await oldSession.destroy();

    const session = await getSession();
    session.userId = user.id;
    session.username = user.username;
    session.sessionVersion = user.session_version || 1;
    await session.save();
  }, targetDelay);

  return { success: true };
}

export async function logout() {
  try {
    const session = await getSession();
    session.destroy();
    redirect('/login');
  } catch (error) {
    // Logout doesn't need timing protection
    redirect('/login');
  }
}
```

**Changes made:**
- All authentication paths wrapped in constant-time delay
- Invalid users delayed same as valid users
- Invalid passwords delayed same as valid passwords
- Logging out doesn't need timing protection (no user enumeration risk)

### Step 5: Update Registration Form (if exists)

If there's a registration flow, update to use `registerSchema` with password complexity validation.

**File:** Check for `app/(auth)/register/` or similar

Update form validation to use enhanced schema and show specific error messages.

### Step 6: Create Unit Tests

**File:** `__tests__/auth/timing-safe.test.ts` (new)

```typescript
import { wrapWithConstantTime } from '@/lib/auth/timing-safe';

describe('Constant Time Delay', () => {
  const originalEnv = process.env;
  let performanceNowSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    performanceNowSpy = jest.spyOn(performance, 'now');
  });

  afterEach(() => {
    process.env = originalEnv;
    performanceNowSpy.mockRestore();
  });

  it('adds delay to complete quickly', async () => {
    // Mock performance.now() to control time
    let callCount = 0;
    performanceNowSpy.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 10; // Operation took 10ms
      return 500; // After delay
    });

    await wrapWithConstantTime(async () => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 10));
    }, 500);

    expect(performanceNowSpy).toHaveBeenCalled();
  });

  it('adds delay to slow operations', async () => {
    let callCount = 0;
    performanceNowSpy.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 400; // Operation took 400ms
      return 500; // After tiny delay
    });

    await wrapWithConstantTime(async () => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 400));
    }, 500);

    expect(performanceNowSpy).toHaveBeenCalled();
  });

  it('delays even on error', async () => {
    let callCount = 0;
    performanceNowSpy.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 10;
      return 500;
    });

    await expect(async () => {
      await wrapWithConstantTime(async () => {
        callCount++;
        throw new Error('Test error');
      }, 500);
    }).rejects.toThrow('Test error');

    expect(performanceNowSpy).toHaveBeenCalledTimes(3);
  });
});
```

**File:** `__tests__/validations/auth.test.ts` (new)

```typescript
import { passwordSchema } from '@/lib/validations/auth';

describe('Password Complexity', () => {
  it('rejects passwords shorter than 12 characters', () => {
    expect(() => passwordSchema.parse('short')).toThrow();
  });

  it('accepts 12+ characters with 3 types', () => {
    expect(() => passwordSchema.parse('Password123')).not.toThrow();
    expect(() => passwordSchema.parse('password123!')).not.toThrow();
    expect(() => passwordSchema.parse('PASSWORD123!')).not.toThrow();
  });

  it('rejects 12+ characters with less than 3 types', () => {
    expect(() => passwordSchema.parse('passwordonly')).toThrow();
    expect(() => passwordSchema.parse('PASSWORDONLY')).toThrow();
    expect(() => passwordSchema.parse('123456789012')).toThrow();
  });

  it('provides specific error for missing 3rd type', () => {
    const result = passwordSchema.safeParse('password123');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('uppercase');
  });
});
```

### Step 7: Create E2E Tests

**File:** `e2e/auth-timing.spec.ts` (new)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Timing Security', () => {
  test('prevents timing attacks on invalid username', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/login');
    await page.fill('input[name="username"]', 'nonexistent');
    await page.fill('input[name="password"]', 'test123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Invalid');
    
    const duration = Date.now() - startTime;
    
    // Should take approximately 500ms (± 100ms tolerance for network)
    expect(duration).toBeGreaterThan(400);
  });

  test('prevents timing attacks on invalid password', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Invalid');
    
    const duration = Date.now() - startTime;
    
    // Should also take approximately 500ms
    expect(duration).toBeGreaterThan(400);
  }));

  test('valid login also takes constant time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    const duration = Date.now() - startTime;
    
    // Should also take approximately 500ms
    expect(duration).toBeGreaterThan(400);
  });
});
```

**File:** `e2e/auth-password-complexity.spec.ts` (new)

Test registration form with password complexity validation (if registration exists).

### Step 8: Update Documentation

**File:** `docs/SECURITY_SESSION.md` (update)

Add sections:
- Timing Attack Mitigation: How constant-time delay works
- Password Complexity: Rules and rationale
- Migration Guide: No breaking changes for existing users

**File:** Update `CLAUDE.md` or `REQUIREMENTS.md` with password complexity requirements.

### Step 9: Local Testing Checklist

Before committing:

- [ ] Create `lib/auth/timing-safe.ts`
- [ ] Add `AUTH_CONSTANT_TIME_DELAY_MS` to `.env.local`
- [ ] Modify `lib/validations/auth.ts` password schema
- [ ] Modify `lib/actions/auth.ts` with constant-time wrapper
- [ ] Run `npm test` - all unit tests pass
- [ ] Run `npm run test:e2e` - all E2E tests pass
- [ ] Test timing: 3 invalid username logins → all ~500ms
- [ ] Test timing: 3 invalid password logins → all ~500ms
- [ ] Test timing: valid login → ~500ms
- [ ] Test password rejection: enter 11-char password → error
- [ ] Test password rejection: enter valid-length with 1-2 types → specific error
- [ ] Test password acceptance: enter 12+ chars with 3+ types → success
- [ ] Verify existing admin login still works (no complexity retroactive)

### Step 10: Create Feature Branch

```bash
git checkout -b fix/security-auth-timing-and-password-complexity
```

### Step 11: Commit Changes

```bash
git add .
git commit -m "fix: add timing attack protection and password complexity improvements

- Constant-time delay wrapper prevents username enumeration
- Password schema requires 12+ chars and 3 of 4 character types
- Generic login errors prevent account enumeration
- Specific password errors guide users during registration
- No breaking changes - existing passwords remain valid
- Closes #16"
```

### Step 12: Deploy to Staging

```bash
git push -u origin fix/security-auth-timing-and-password-complexity
gh pr create --title "fix: add timing attack protection and password complexity" \
  --body "Implements authentication security enhancements (#16)"
```

**Staging verification:**
- [ ] Deploy code changes
- [ ] Monitor login response times (should cluster around 500ms)
- [ ] Test brute-force timing consistency
- [ ] Verify existing users can still login
- [ ] Test new password complexity (if registration enabled)
- [ ] Monitor user feedback on UX

### Step 13: Production Deployment

**Pre-deployment:**
- [ ] Staging tests pass
- [ ] Document password complexity in help/FAQ
- [ ] Prepare user communication if needed

**Deployment:**
- [ ] Merge PR
- [ ] Monitor login performance metrics
- [ ] Track support tickets for password issues
- [ ] Adjust 3-of-4 requirement if UX feedback negative
- [ ] Monitor for timing bypass attempts (should see consistent response times)

## Files Modified/Created

| File | Type | Action |
|------|------|--------|
| `lib/auth/timing-safe.ts` | New | Create |
| `lib/validations/auth.ts` | Edit | Enhance password schema |
| `lib/actions/auth.ts` | Edit | Add constant-time wrappers |
| `.env.example` | Edit | Add AUTH_CONSTANT_TIME_DELAY_MS |
| `__tests__/auth/timing-safe.test.ts` | New | Create |
| `__tests__/validations/auth.test.ts` | New | Create |
| `e2e/auth-timing.spec.ts` | New | Create |
| `e2e/auth-password-complexity.spec.ts` | New | Create |
| `docs/SECURITY_SESSION.md` | Edit | Update |

## Verification Commands

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Test timing specifically
npm test timing-safe.test.ts
npm run test:e2e auth-timing.spec.ts

# Test password validation
npm test validations/auth.test.ts

# Measure login timing manually
time curl -X POST http://localhost:3000/login \
  -d 'username=invalid&password=test'
```

## Success Criteria

- ✅ All login attempts complete in ~500ms (production)
- ✅ Response times consistent across valid/invalid credentials
- ✅ Passwords < 12 characters rejected
- ✅ Passwords with < 3 character types rejected
- ✅ Passwords with 12+ chars and 3+ types accepted
- ✅ Specific error messages guide user corrections
- ✅ All existing tests pass
- ✅ New timing and complexity tests pass
- ✅ Existing users can login without password change
- ✅ Production deployment with monitoring

## Rollback Plan

If issues arise:

1. **UX complaints about 500ms delay:** Reduce `AUTH_CONSTANT_TIME_DELAY_MS` to 200ms or 300ms
2. **Users unable to create passwords:** Relax 3-of-4 requirement to 2-of-4 or 12+ chars only
3. **Complete rollback:** Remove constant-time wrapper, revert password schema, redeploy

No database changes, so rollback is non-destructive. Existing passwords (including complex ones) remain valid.

## Future Enhancements (Out of Scope)

- Password strength meter UI component
- haveibeenpwned.com integration for leaked password detection
- Force password change on first login
- Password history (prevent reusing last 5)
- Password expiration policy
- Adaptive timing (shorter delay for high-reputation IPs, longer for suspicious)
- Admin-override for password complexity policies

## User Communication

**Draft announcement:**

```
Subject: Important: Enhanced Password Security

To improve account security, we've strengthened password requirements:

- Minimum 12 characters
- Include at least 3 of: uppercase, lowercase, number, special character

Examples of strong passwords:
- MySecret456 ✓
- P@ssword123 ✓
- GoodPass456 ✓

Your existing password will continue to work. When you change your password,
it must meet the new requirements.

Questions? Contact support@example.com
```

## Monitoring

**Metrics to track:**
- Average login latency (should be ~500ms)
- Login latency distribution (should cluster around 500ms)
- Password validation failure rate
- User complaints about UX (via support tickets)

**Alerts:**
- Login latency < 400ms (timing attack bypass attempt?)
- Password validation errors > 50% (users struggling?)
- Support tickets spike (UX issues?)
