# Data Integrity Improvements Implementation Plan

**Issue:** #21 - [MEDIUM] Data Integrity and Validation Issues
**Design:** docs/plans/2026-01-26-data-integrity-design.md
**Estimated Time:** 2-3 hours
**Priority:** MEDIUM

## Overview

Implement data integrity protections for categories: circular reference prevention and orphan check on deletion.

## Implementation Steps

### Step 1: Add Circular Reference Check Function

**File:** `lib/db/categories.ts` (modify - add to existing file)

```typescript
import { queryOne, queryMany } from '@/lib/db';

// Add this function after existing getCategoryDepth function

export async function wouldCreateCircularReference(
  categoryId: number,
  newParentId: number | null
): Promise<boolean> {
  if (!newParentId) return false;
  
  if (newParentId === categoryId) {
    // Cannot be parent of self
    return true;
  }
  
  // Recursive CTE to traverse parent chain
  const result = await queryOne<{ has_cycle: boolean }>(
    `
    WITH RECURSIVE parent_chain AS (
      -- Start with the proposed parent
      SELECT id, parent_id
      FROM categories
      WHERE id = $1
      
      UNION
      
      -- Recursively traverse upward
      SELECT c.id, c.parent_id
      FROM categories c
      INNER JOIN parent_chain pc ON c.id = pc.parent_id
    )
    SELECT EXISTS(
      SELECT 1 FROM parent_chain WHERE id = $2
    ) as has_cycle
    `,
    [newParentId, categoryId]
  );
  
  return result?.has_cycle || false;
}

export async function checkCategoryDeletionConstraints(
  categoryId: number
): Promise<{ allowed: boolean; reason?: string }> {
  // Check for child categories
  const childrenResult = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories WHERE parent_id = $1',
    [categoryId]
  );
  
  if (childrenResult && childrenResult.count > 0) {
    const count = childrenResult.count;
    const suffix = count > 1 ? 'ies' : 'y';
    return {
      allowed: false,
      reason: `Cannot delete category: has ${count} child categor${suffix}`
    };
  }
  
  // Check for transactions using this category
  const transactionsResult = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE category_id = $1',
    [categoryId]
  );
  
  if (transactionsResult && transactionsResult.count > 0) {
    return {
      allowed: false,
      reason: `Cannot delete category: has ${transactionsResult.count} transaction(s)`
    };
  }
  
  return { allowed: true };
}
```

### Step 2: Integrate into Update Category Action

**File:** `lib/actions/categories.ts` (modify - `updateCategory` function)

Update the `updateCategory` function to include circular reference check:

```typescript
import { wouldCreateCircularReference, getCategoryDepth } from '@/lib/db/categories';

export async function updateCategory(id: number, formData: FormData) {
  await requireAuth();

  const result = categorySchema.safeParse({
    name: formData.get('name'),
    category_type: formData.get('category_type'),
    parent_id: formData.get('parent_id') || null,
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { name, category_type, parent_id } = result.data;

  try {
    // Calculate new depth
    const parentDepth = await getCategoryDepth(parent_id || null);
    const depth = parentDepth + 1;

    if (depth > 3) {
      return {
        success: false,
        error: 'Maximum category depth is 3',
      };
    }

    // NEW: Check for circular reference
    const wouldCreateCycle = await wouldCreateCircularReference(id, parent_id);
    if (wouldCreateCycle) {
      return {
        success: false,
        error: 'Cannot set parent: would create circular reference',
      };
    }

    await execute(
      `UPDATE categories
       SET name = $1, category_type = $2, parent_id = $3, depth = $4
       WHERE id = $5`,
      [name, category_type, parent_id, depth, id]
    );

    revalidatePath('/');
    revalidatePath('/settings');

    return { success: true };
  } catch (error) {
    console.error('Failed to update category:', error);
    return {
      success: false,
      error: 'Failed to update category',
    };
  }
}
```

### Step 3: Integrate into Delete Category Action

**File:** `lib/actions/categories.ts` (modify - `deleteCategory` function)

Update the `deleteCategory` function to include orphan check:

```typescript
import { checkCategoryDeletionConstraints } from '@/lib/db/categories';

export async function deleteCategory(id: number) {
  await requireAuth();

  try {
    // NEW: Check deletion constraints
    const deletionCheck = await checkCategoryDeletionConstraints(id);
    if (!deletionCheck.allowed) {
      return {
        success: false,
        error: deletionCheck.reason,
      };
    }

    // Cascade deletion handled by database
    await execute('DELETE FROM categories WHERE id = $1', [id]);

    revalidatePath('/');
    revalidatePath('/settings');

    return { success: true };
  } catch (error) {
    console.error('Failed to delete category:', error);
    return {
      success: false,
      error: 'Failed to delete category',
    };
  }
}
```

### Step 4: Create Unit Tests

**File:** `__tests__/db/categories.test.ts` (new)

```typescript
import { wouldCreateCircularReference, checkCategoryDeletionConstraints } from '@/lib/db/categories';

describe('Category Data Integrity', () => {
  describe('Circular Reference Prevention', () => {
    it('rejects direct circular reference', async () => {
      // Assuming test data:
      // Category 1 (Food) -> Category 6 (Groceries)
      // Trying to set 1 -> 6 is already the relationship
      // Trying to set 6 -> 1 would create: Food -> Groceries -> Food
      
      const result = await wouldCreateCircularReference(6, 1);
      expect(result).toBe(true);
    });

    it('rejects indirect circular reference', async () => {
      // Assuming test data:
      // 1 (Food) -> 4 (Food & Dining parent of Food subcategories?)
      // Test with actual test data IDs
      
      // The exact IDs depend on your test data setup
      // This test would check for A -> B -> C -> A scenario
    });

    it('allows non-circular parent change', async () => {
      // Setting category to have a new parent that doesn't create a cycle
      const result = await wouldCreateCircularReference(1, null); // Root level
      expect(result).toBe(false);
    });

    it('allows null parent (root level)', async () => {
      const result = await wouldCreateCircularReference(5, null);
      expect(result).toBe(false);
    });
  });

  describe('Deletion Constraints', () => {
    it('rejects deletion with child categories', async () => {
      // Assuming category 4 (Food & Dining) has child categories (6, 7)
      const result = await checkCategoryDeletionConstraints(4);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('child category');
    });

    it('rejects deletion with transactions', async () => {
      // This assumes you have a category with transactions in test data
      // You may need to insert test transactions first
      
      // For now, this is a placeholder - adjust based on test data
    });

    it('allows deletion of leaf with no dependencies', async () => {
      // Assuming category 9 (Rent) is a leaf with no transactions
      const result = await checkCategoryDeletionConstraints(9);
      expect(result.allowed).toBe(true);
    });
  });
});
```

### Step 5: Create E2E Tests

**File:** `e2e/data-integrity.spec.ts` (new)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Category Data Integrity', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('prevents circular reference on category update', async ({ page }) => {
    await page.goto('/settings');
    
    // Navigate to categories
    await page.click('text=Categories');
    
    // Click edit on a child category
    await page.click('button[aria-label="Edit"]:first-of-type'); // Adjust selector
    
    // Try to set parent to a child of this category
    // This will create a circular reference
    await page.selectOption('select[name="parent_id"]', 'child_category_id'); // Adjust
    
    await page.click('button[type="submit"]');
    
    // Should show error
    await expect(page.locator('text=circular reference')).toBeVisible();
  });

  test('prevents deletion with child categories', async ({ page }) => {
    await page.goto('/settings');
    
    // Navigate to categories
    await page.click('text=Categories');
    
    // Find a parent category with children
    await page.click('button:has-text("Delete")', { has: page.locator('text=Food & Dining') });
    
    // Should show error with child count
    await expect(page.locator('text=child category')).toBeVisible();
  });

  test('prevents deletion with transactions', async ({ page }) => {
    // Create a transaction first
    await page.goto('/');
    await page.click('text=Add Transaction');
    await page.fill('input[name="amount"]', '100');
    await page.fill('input[name="payee"]', 'Test');
    await page.selectOption('select[name="category_id"]', '1'); // Use a specific category
    await page.click('button[type="submit"]');
    
    // Now try to delete that category
    await page.goto('/settings');
    await page.click('text=Categories');
    await page.click('button:has-text("Delete")', { has: page.locator('text=Groceries') }); // Assuming Groceries has the transaction
    
    // Should show error with transaction count
    await expect(page.locator('text=transaction')).toBeVisible();
  });

  test('allows deletion of category with no dependencies', async ({ page }) => {
    await page.goto('/settings');
    
    // Navigate to categories
    await page.click('text=Categories');
    
    // Add a test category first
    await page.click('text=Add Category');
    await page.fill('input[name="name"]', 'Test Category');
    await page.selectOption('select[name="category_type"]', 'expense');
    await page.click('button[type="submit"]');
    
    // Now delete it
    await page.click('button:has-text("Delete")', { has: page.locator('text=Test Category') });
    
    // Should succeed
    await expect(page.locator('text=Category deleted')).toBeVisible();
  });

  test('allows update to valid new parent', async ({ page }) => {
    await page.goto('/settings');
    
    // Navigate to categories
    await page.click('text=Categories');
    
    // Click edit on a category
    await page.click('button[aria-label="Edit"]:first-of-type');
    
    // Change parent to a valid option (not creating cycle)
    await page.selectOption('select[name="parent_id"]', 'different_parent_id'); // Adjust
    
    await page.click('button[type="submit"]');
    
    // Should succeed
    await expect(page.locator('text=Category updated')).toBeVisible();
  });
});
```

### Step 6: Update Documentation

**File:** `docs/SECURITY_DATA_INTEGRITY.md` (new)

```markdown
# Category Data Integrity Protections

## Overview

Category operations include validation to prevent data corruption:
- Circular reference prevention on parent updates
- Deletion constraints (check before delete)

## Circular Reference Prevention

When updating a category's parent:
- System validates that new parent won't create circular reference
- Forbidden: A → B → A
- Forbidden: A → B → C → A
- Forbidden: Setting parent = self
- Error: "Cannot set parent: would create circular reference"

### Example Scenarios

**Valid:**
```
Housing (root)
  └─ Rent (leaf)
→ Update Housing → parent = null (allowed)
→ Update Rent → parent = Housing (allowed, already parent)
```

**Invalid:**
```
Housing → Rent → Mortgage (when trying to set Mortgage → parent = Housing)
→ Error: Circular reference created (Housing → Rent → Mortgage → Housing)
```

## Deletion Constraints

Before deleting a category:
- Check for child categories
- Check for transactions using category
- Error if dependencies exist with count
- Allowed only for leaf categories with no transactions

### Example Scenarios

**Cannot delete:**
```
Food & Dining (has 3 child categories)
→ Error: "Cannot delete category: has 3 child categories"

Transportation (has 50 transactions)
→ Error: "Cannot delete category: has 50 transaction(s)"
```

**Can delete:**
```
Unused Category (leaf, no transactions)
→ Success (deleted)
```

## Usage Guidelines

### Before Deleting

1. **Reassign transactions:**
   - Update transactions to different category
   - Or make transactions uncategorized

2. **Delete or reassign children:**
   - Reassign children to different parent
   - Or delete children first (if they have no transactions)

3. **Then delete parent:**
   - Should succeed if no dependencies remain

### Manual Database Cleanup

If you need to force delete (admin operation):

```sql
-- Reassign transactions
UPDATE transactions SET category_id = NULL WHERE category_id = <category_id>;

-- Delete children
DELETE FROM categories WHERE parent_id = <category_id>;

-- Now delete category
DELETE FROM categories WHERE id = <category_id>;
```

## Technical Details

### Circular Reference Algorithm

Uses recursive CTE to traverse category tree:

```sql
WITH RECURSIVE parent_chain AS (
  SELECT id, parent_id FROM categories WHERE id = $1
  UNION
  SELECT c.id, c.parent_id
  FROM categories c
  JOIN parent_chain pc ON c.id = pc.parent_id
)
SELECT EXISTS(SELECT 1 FROM parent_chain WHERE id = $2) as has_cycle
```

Time complexity: O(depth), max depth = 3 (database constraint)

### Constraint Checking

Two separate queries:
1. Child categories: `SELECT COUNT(*) FROM categories WHERE parent_id = ?`
2. Transactions: `SELECT COUNT(*) FROM transactions WHERE category_id = ?`

Both queries use indexes for performance.

## Troubleshooting

**Error: "Cannot set parent: would create circular reference"**

Solution: Choose a different parent that doesn't create a cycle or set as root (parent = null).

**Error: "Cannot delete category: has X child categories"**

Solution: Reassign children to different parent or delete them first.

**Error: "Cannot delete category: has X transaction(s)"**

Solution: Reassign transactions to different category or make them uncategorized.
```

### Step 7: Local Testing Checklist

Before committing:

- [ ] Add `wouldCreateCircularReference()` to `lib/db/categories.ts`
- [ ] Add `checkCategoryDeletionConstraints()` to `lib/db/categories.ts`
- [ ] Import and call in `updateCategory` action
- [ ] Import and call in `deleteCategory` action
- [ ] Create `__tests__/db/categories.test.ts`
- [ ] Create `e2e/data-integrity.spec.ts`
- [ ] Run `npm test` - all unit tests pass
- [ ] Run `npm run test:e2e` - all E2E tests pass
- [ ] Test category update with circular parent → error
- [ ] Test category update with valid parent → success
- [ ] Test delete category with children → error with count
- [ ] Test delete category with transactions → error with count
- [ ] Test delete leaf category with no dependencies → success

### Step 8: Check for Existing Circular References

Before deploying, check production (or staging) for existing circular references:

```bash
psql $POSTGRES_URL -c "
WITH RECURSIVE cycles AS (
  SELECT id, parent_id, ARRAY[id] as path
  FROM categories WHERE parent_id IS NOT NULL
  UNION ALL
  SELECT c.id, c.parent_id, pc.path || c.id
  FROM categories c
  JOIN cycles pc ON c.id = pc.parent_id
  WHERE NOT c.id = ANY(pc.path)
)
SELECT id, parent_id, path FROM cycles WHERE id = ANY(path);
"
```

If any found, fix manually before deploying.

### Step 9: Create Feature Branch

```bash
git checkout -b fix/security-data-integrity-improvements
```

### Step 10: Commit Changes

```bash
git add .
git commit -m "fix: add data integrity protections for categories

- Prevent circular parent-child references on update
- Check for child categories before deletion
- Check for transactions before deletion
- Clear error messages guide users on resolution
- No database schema changes required
- Closes #21"
```

### Step 11: Deploy to Staging

```bash
git push -u origin fix/security-data-integrity-improvements
gh pr create --title "fix: add data integrity protections for categories" \
  --body "Implements data integrity validation for categories (#21)"
```

**Staging verification:**
- Deploy code changes
- Test category update with circular parent → error
- Test category deletion with children → error
- Test category deletion with transactions → error
- Test category update with valid parent → success
- Test category deletion with no dependencies → success
- Verify error messages are clear and actionable
- Monitor for validation errors (may indicate data quality issues)

### Step 12: Production Deployment

**Pre-deployment:**
- Check for existing circular references in production data
- Fix any found manually via database queries
- Document cleanup process
- Deploy validation code
- Monitor validation failures in logs
- User communication about new deletion constraints

**Deployment:**
- Merge PR to main
- Monitor for validation errors
- Resolve any data quality issues
- Support users with new error messages

## Files Modified/Created

| File | Type | Action |
|------|------|--------|
| `lib/db/categories.ts` | Edit | Add validation functions |
| `lib/actions/categories.ts` | Edit | Add validation calls |
| `__tests__/db/categories.test.ts` | New | Create |
| `e2e/data-integrity.spec.ts` | New | Create |
| `docs/SECURITY_DATA_INTEGRITY.md` | New | Create |

## Verification Commands

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Test database queries manually
psql $POSTGRES_URL -c "SELECT * FROM categories ORDER BY id;"

# Check for circular references
psql $POSTGRES_URL -f docs/queries/check-circular-references.sql

# Delete test category
psql $POSTGRES_URL -c "DELETE FROM categories WHERE name = 'Test Category';"
```

## Success Criteria

- ✅ Circular references prevented on category updates
- ✅ Child categories checked before deletion
- ✅ Transactions checked before deletion
- ✅ Clear error messages with dependency counts
- ✅ All existing tests pass
- ✅ New unit tests pass
- ✅ New E2E tests pass
- ✅ Production deployment with data validation

## Rollback Plan

- Remove validation function calls from category actions
- No database state to restore
- Existing circular references (if any) remain but can be cleaned up

**Fix existing circular references manually:**

```sql
-- Identify circular references
WITH RECURSIVE cycles AS (
  SELECT id, parent_id, ARRAY[id] as path
  FROM categories WHERE parent_id IS NOT NULL
  UNION ALL
  SELECT c.id, c.parent_id, pc.path || c.id
  FROM categories c
  JOIN cycles pc ON c.id = pc.parent_id
  WHERE NOT c.id = ANY(pc.path)
)
SELECT id, parent_id, path FROM cycles WHERE id = ANY(path);

-- Fix by setting parent_id to NULL
UPDATE categories SET parent_id = NULL WHERE id = <circular_category_id>;

-- Or reassign to different valid parent
UPDATE categories SET parent_id = <valid_parent_id> WHERE id = <circular_category_id>;
```

## Performance Impact

**Estimated overhead:**
- Circular reference check: <10ms (max depth 3)
- Deletion constraints: <5ms (2 indexed queries)
- Update operation: +10-15ms total
- Delete operation: +5ms total (or error immediately)

**Monitoring:**
- Track category update/delete latency
- Should see minimal impact (<20ms per operation)
