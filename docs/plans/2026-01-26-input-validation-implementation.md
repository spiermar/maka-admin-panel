# Input Validation Improvements Implementation Plan

**Issue:** #18 - [HIGH] Input Validation Improvements
**Design:** docs/plans/2026-01-26-input-validation-design.md
**Estimated Time:** 1-2 hours
**Priority:** HIGH

## Overview

Enhance transaction input validation to enforce business logic constraints. Add semantic validation for amounts and dates to prevent data manipulation.

## Implementation Steps

### Step 1: Enhance Transaction Validation Schema

**File:** `lib/validations/transactions.ts` (modify)

Replace the existing schema with enhanced validation:

```typescript
import { z } from 'zod';

export const transactionSchema = z.object({
  account_id: z.coerce.number().positive('Account is required'),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .refine(
      (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const minDate = new Date(now.getFullYear() - 10, 0, 1); // 10 years ago
        
        return !isNaN(date.getTime()) 
          && date >= minDate 
          && date <= now;
      },
      { 
        message: 'Date must be within last 10 years and not in the future' 
      }
    ),
  payee: z.string().min(1, 'Payee is required').max(200),
  category_id: z.coerce.number().nullable().optional(),
  amount: z.string()
    .regex(/^-?\d+(\.\d{1,2})?$/, 'Invalid amount format')
    .refine(
      (amountStr) => {
        const amount = parseFloat(amountStr);
        return !isNaN(amount) 
          && amount >= -1000000 
          && amount <= 1000000;
      },
      { 
        message: 'Amount must be between -1,000,000.00 and 1,000,000.00' 
      }
    ),
  comment: z.string().max(1000).optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
```

**Changes made:**
- Date: Added temporal validation (last 10 years, not future)
- Amount: Added range validation (-1,000,000 to +1,000,000)
- Preserved all existing format validations
- Enhanced error messages for better UX

### Step 2: Create Unit Tests for Validation

**File:** `__tests__/validations/transactions.test.ts` (new)

```typescript
import { transactionSchema } from '@/lib/validations/transactions';

describe('Transaction Validation Schema', () => {
  describe('Amount Validation', () => {
    it('accepts amount at upper limit', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: '2026-01-26',
        payee: 'Test',
        amount: '1000000.00',
      });
      expect(result.success).toBe(true);
    });

    it('rejects amount exceeding upper limit', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: '2026-01-26',
        payee: 'Test',
        amount: '1000000.01',
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain('1,000,000');
    });

    it('accepts amount at lower limit', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: '2026-01-26',
        payee: 'Test',
        amount: '-1000000.00',
      });
      expect(result.success).toBe(true);
    });

    it('rejects amount below lower limit', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: '2026-01-26',
        payee: 'Test',
        amount: '-1000000.01',
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain('1,000,000');
    });

    it('accepts typical transaction amounts', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: '2026-01-26',
        payee: 'Test',
        amount: '150.50',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid amount format', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: '2026-01-26',
        payee: 'Test',
        amount: 'abc',
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain('Invalid amount format');
    });
  });

  describe('Date Validation', () => {
    const today = new Date().toISOString().split('T')[0];
    const tenYearsAgo = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    const tenYearsAndOneDayAgo = new Date(Date.now() - (10 * 365 + 1) * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    it('accepts today\'s date', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: today,
        payee: 'Test',
        amount: '100.00',
      });
      expect(result.success).toBe(true);
    });

    it('rejects future date', () => {
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: future,
        payee: 'Test',
        amount: '100.00',
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain('future');
    });

    it('accepts date exactly 10 years ago', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: tenYearsAgo,
        payee: 'Test',
        amount: '100.00',
      });
      expect(result.success).toBe(true);
    });

    it('rejects date older than 10 years', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: tenYearsAndOneDayAgo,
        payee: 'Test',
        amount: '100.00',
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain('10 years');
    });

    it('accepts recent dates', () => {
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: lastWeek,
        payee: 'Test',
        amount: '100.00',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid date format', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: '01-26-2026',
        payee: 'Test',
        amount: '100.00',
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain('YYYY-MM-DD');
    });
  });

  describe('Multiple Validation Errors', () => {
    it('shows all validation errors when multiple fields invalid', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: 'future-date',
        payee: 'Test',
        amount: 'invalid',
      });
      
      expect(result.success).toBe(false);
      const errors = result.error?.flatten().fieldErrors;
      expect(errors?.date).toBeDefined();
      expect(errors?.amount).toBeDefined();
    });
  });

  describe('Complete Valid Transaction', () => {
    it('accepts fully valid transaction with all fields', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: today,
        payee: 'Test Payee',
        category_id: 2,
        amount: '123.45',
        comment: 'Test comment',
      });
      
      expect(result.success).toBe(true);
    });
  });
});
```

### Step 3: Create E2E Tests for Form Validation

**File:** `e2e/input-validation.spec.ts` (new)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Transaction Input Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('prevents submission of amount exceeding limit', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Add Transaction');
    
    await page.fill('input[name="amount"]', '1000000.01');
    await page.fill('input[name="payee"]', 'Test');
    await page.click('button[type="submit"]');
    
    // Should show validation error
    await expect(page.locator('text=Amount must be between')).toBeVisible();
  });

  test('allows submission of amount at limit', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Add Transaction');
    
    await page.fill('input[name="amount"]', '1000000.00');
    await page.fill('input[name="payee"]', 'Test');
    await page.click('button[type="submit"]');
    
    // Should succeed
    await expect(page.locator('text=Transaction added')).toBeVisible();
  });

  test('prevents submission of future date', async ({ page }) => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    
    await page.goto('/');
    await page.click('text=Add Transaction');
    
    await page.fill('input[name="amount"]', '100.00');
    await page.fill('input[name="payee"]', 'Test');
    await page.fill('input[name="date"]', futureDate);
    await page.click('button[type="submit"]');
    
    // Should show validation error
    await expect(page.locator('text=future')).toBeVisible();
  });

  test('prevents submission of date older than 10 years', async ({ page }) => {
    const oldDate = '2015-01-01';
    
    await page.goto('/');
    await page.click('text=Add Transaction');
    
    await page.fill('input[name="amount"]', '100.00');
    await page.fill('input[name="payee"]', 'Test');
    await page.fill('input[name="date"]', oldDate);
    await page.click('button[type="submit"]');
    
    // Should show validation error
    await expect(page.locator('text=10 years')).toBeVisible();
  });

  test('shows specific error messages for each invalid field', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Add Transaction');
    
    await page.fill('input[name="amount"]', 'invalid');
    await page.fill('input[name="date"]', 'invalid');
    await page.click('button[type="submit"]');
    
    // Should show both errors
    await expect(page.locator('text=Invalid amount format')).toBeVisible();
    await expect(page.locator('text=YYYY-MM-DD')).toBeVisible();
  });

  test('allows submission of valid transaction', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    
    await page.goto('/');
    await page.click('text=Add Transaction');
    
    await page.fill('input[name="amount"]', '150.50');
    await page.fill('input[name="payee"]', 'Test Payee');
    await page.fill('input[name="date"]', today);
    await page.click('button[type="submit"]');
    
    // Should succeed
    await expect(page.locator('text=Transaction added')).toBeVisible();
  });
});
```

### Step 4: Update Documentation

**File:** `docs/SECURITY_VALIDATION.md` (new)

Document input validation rules:

```markdown
# Transaction Input Validation

## Overview

Transaction forms enforce business rules to prevent data manipulation and ensure data quality.

## Validation Rules

### Amount
- **Format:** Decimal with up to 2 places (e.g., 123.45)
- **Range:** -1,000,000.00 to +1,000,000.00
- **Error:** "Amount must be between -1,000,000.00 and 1,000,000.00"

### Date
- **Format:** YYYY-MM-DD
- **Range:** Within last 10 years, not in future
- **Error:** "Date must be within last 10 years and not in the future"

## Edge Cases

| Value | Valid | Reason |
|-------|-------|--------|
| 1,000,000.00 | ✅ | At upper limit |
| 1,000,000.01 | ❌ | Exceeds limit |
| Today | ✅ | Current date |
| Tomorrow | ❌ | Future date |
| 10 years ago | ✅ | At lower limit |
| 10 years + 1 day | ❌ | Exceeds limit |

## Implementation

Validation is enforced by Zod schema in `lib/validations/transactions.ts`.
Server Actions automatically reject invalid data before database operations.
```

### Step 5: Local Testing Checklist

Before committing:

- [ ] Modify `lib/validations/transactions.ts` with enhanced validation
- [ ] Create `__tests__/validations/transactions.test.ts`
- [ ] Create `e2e/input-validation.spec.ts`
- [ ] Run `npm test` - all unit tests pass
- [ ] Run `npm run test:e2e` - all E2E tests pass
- [ ] Test amount at upper limit (1,000,000.00) → form submits
- [ ] Test amount above limit (1,000,000.01) → validation error
- [ ] Test amount below limit (-1,000,000.01) → validation error
- [ ] Test future date → validation error
- [ ] Test date > 10 years old → validation error
- [ ] Test today's date → form submits
- [ ] Test date exactly 10 years ago → form submits
- [ ] Test valid transaction submit → success
- [ ] Verify existing tests still pass

### Step 6: Create Feature Branch

```bash
git checkout -b fix/security-enhance-transaction-input-validation
```

### Step 7: Commit Changes

```bash
git add .
git commit -m "fix: enhance transaction input validation with business rules

- Add amount range validation: -1,000,000.00 to +1,000,000.00
- Add date range validation: last 10 years, not in future
- Prevent extreme financial values and data manipulation
- Clear, specific error messages for users
- Add comprehensive unit and E2E tests
- Closes #18"
```

### Step 8: Deploy to Staging

```bash
git push -u origin fix/security-enhance-transaction-input-validation
gh pr create --title "fix: enhance transaction input validation with business rules" \
  --body "Implements input validation improvements (#18)"
```

**Staging verification:**
- Deploy code changes
- Test transaction form with edge cases
- Verify error messages display correctly
- Monitor form submission error rates
- Test valid transactions still work
- Monitor for legitimate use cases incorrectly blocked

### Step 9: Production Deployment

**Pre-deployment:**
- Staging tests pass
- Communicate changes to team
- Update user documentation with new limits

**Deployment:**
- Merge PR
- Monitor form validation error rate
- Check for spikes in rejected submissions
- Review error patterns for edge cases
- Adjust limits if legitimate use cases emerge

## Files Modified/Created

| File | Type | Action |
|------|------|--------|
| `lib/validations/transactions.ts` | Edit | Enhance validation |
| `__tests__/validations/transactions.test.ts` | New | Create |
| `e2e/input-validation.spec.ts` | New | Create |
| `docs/SECURITY_VALIDATION.md` | New | Create |
| `docs/plans/2026-01-26-input-validation-design.md` | New | Create |

## Verification Commands

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Test transaction validation specifically
npm test validations/transactions.test.ts
npm run test:e2e input-validation.spec.ts

# Test with edge cases manually
npm run dev
# Navigate to form, test edge cases
```

## Success Criteria

- ✅ Transaction amounts bounded to -1,000,000 to +1,000,000
- ✅ Transaction dates bounded to last 10 years, not future
- ✅ Edge cases validated correctly (±1,000,000, exactly 10 years, today)
- ✅ Clear, specific error messages for users
- ✅ All existing tests pass
- ✅ New validation tests pass (100% coverage)
- ✅ New E2E tests pass
- ✅ Production deployment with no disruption
- ✅ Minimal validation error rate (legitimate transactions pass)

## Rollback Plan

If issues arise:

1. **Legitimate transactions blocked:** Increase limits to 10M and redeploy
2. **Date constraints too restrictive:** Extend to 20 years and redeploy
3. **Complete rollback:** Revert `lib/validations/transactions.ts` changes

No database changes, so rollback is non-destructive. Existing transactions remain valid regardless of limits.

## Performance Impact

**Estimated overhead:**
- Additional validation logic: <1ms per transaction
- No database queries (pure calculations)
- Unnoticeable in UI response times

**Monitoring:**
- Track form submission latency before and after
- Should see no measurable difference

## Future Enhancements (Not in Scope)

- Apply similar validation to accounts and categories
- Add database check constraints for defense in depth
- Implement configurable limits per user/account tier
- Add admin workflow for exception handling
- Add historical data validation (audit old transactions)
- Implement progressive limits based on account tier

## References

- Design Document: `docs/plans/2026-01-26-input-validation-design.md`
- Issue: #18 - [HIGH] Input Validation Improvements
- CWE-20: Improper Input Validation
- OWASP Input Validation: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- Zod Documentation: https://zod.dev
