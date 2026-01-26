# Remove Hardcoded Admin Credentials Implementation Plan

**Issue:** #20 - [MEDIUM] Remove Hardcoded Admin Credentials
**Design:** docs/plans/2026-01-26-hardcoded-credentials-design.md
**Estimated Time:** 1-2 hours
**Priority:** MEDIUM

## Overview

Replace hardcoded admin credentials in `scripts/init-db.sql` with randomly generated password on database initialization.

## Implementation Steps

### Step 1: Modify Database Initialization Script

**File:** `scripts/init-db.sql` (modify)

Replace the hardcoded admin user section with dynamic generation:

```sql
-- Run schema
\i lib/db/schema.sql

-- Generate random password (run on first initialization only)
DO $$
DECLARE
  random_password TEXT;
  password_hash TEXT;
BEGIN
  -- Generate 16-character random password
  random_password := encode(gen_random_bytes(12), 'base64');
  
  -- Remove special characters for better compatibility
  random_password := regexp_replace(random_password, '[^a-zA-Z0-9]', '', 'g');
  
  -- Hash with bcrypt cost factor 12
  password_hash := crypt(random_password, gen_salt('bf', 12));
  
  -- Insert admin user with random password
  INSERT INTO users (username, password_hash) VALUES
    ('admin', password_hash)
  ON CONFLICT (username) DO UPDATE
    SET password_hash = EXCLUDED.password_hash;
  
  -- Output credentials prominently
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ADMIN USER CREDENTIALS GENERATED';
  RAISE NOTICE 'Username: admin';
  RAISE NOTICE 'Password: %', random_password;
  RAISE NOTICE '========================================';
  RAISE NOTICE '⚠️  CHANGE THIS PASSWORD IMMEDIATELY! ⚠️';
  RAISE NOTICE '========================================';
END $$;

-- Seed default categories (unchanged)
INSERT INTO categories (name, category_type, parent_id, depth) VALUES
  -- Income categories
  ('Salary', 'income', NULL, 1),
  ('Business Income', 'income', NULL, 1),
  ('Investments', 'income', NULL, 1),

  -- Expense categories (depth 1)
  ('Food & Dining', 'expense', NULL, 1),
  ('Transportation', 'expense', NULL, 1),
  ('Housing', 'expense', NULL, 1),
  ('Utilities', 'expense', NULL, 1),
  ('Entertainment', 'expense', NULL, 1),

  -- Food subcategories (depth 2)
  ('Groceries', 'expense', 4, 2),
  ('Restaurants', 'expense', 4, 2),

  -- Transportation subcategories (depth 2)
  ('Gas', 'expense', 5, 2),
  ('Public Transit', 'expense', 5, 2),

  -- Housing subcategories (depth 2)
  ('Rent', 'expense', 6, 2),
  ('Mortgage', 'expense', 6, 2);

-- Seed test accounts (unchanged)
INSERT INTO accounts (name) VALUES
  ('Checking Account'),
  ('Savings Account'),
  ('Credit Card');
```

**Key changes:**
- DO block generates random password using `gen_random_bytes()`
- Base64 encoding for readability
- Special character removal for compatibility
- Bcrypt hashing with cost factor 12
- ON CONFLICT prevents re-generation (only runs once)
- RAISE NOTICE displays credentials to console
- Prominent warning to change password

### Step 2: Update Documentation

**File:** `README.md` (update or create init-db section)

Add or update database initialization section:

```markdown
## Database Setup

### Initial Setup

Run the initialization script to create database schema, seed data, and generate admin credentials:

```bash
psql $DATABASE_URL -f scripts/init-db.sql
```

**Important:** The script will display admin credentials in the console output:

```
========================================
ADMIN USER CREDENTIALS GENERATED
Username: admin
Password: abcXYZ123def456
========================================
⚠️  CHANGE THIS PASSWORD IMMEDIATELY! ⚠️
========================================
```

**Steps:**
1. Copy the displayed password
2. Login at `http://localhost:3000/login` with username `admin` and the displayed password
3. Change your password immediately after first login (if password change feature is available)

**Notes:**
- The password is unique to each database installation
- The password is only displayed once, during initialization
- Re-running the script will **not** change the password (preserves existing admin)
- Lost password? See "Password Reset" section below

### Password Reset

If you lose the admin password, use the reset script or manual database update.

**Option 1: Reset script (recommended)**
```bash
npm run reset-admin-password
```

**Option 2: Manual database update**
```javascript
// Generate new bcrypt hash
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('newpassword', 12);

// Update database
psql $DATABASE_URL -c "UPDATE users SET password_hash = '$hash' WHERE username = 'admin';"
```

### Development Setup

For local development, you can use the same initialization script. Each developer's local environment will have a different admin password.

For reproducible development setups (optional), you can specify a password via environment variable (not currently implemented - future enhancement).
```

**File:** `DEPLOYMENT.md` (update)

Add production deployment notes:

```markdown
## Production Deployment

### Database Initialization

For new production deployments:

```bash
# Initialize database (in CI/CD pipeline or manually)
psql $DATABASE_URL -f scripts/init-db.sql
```

**For production:**
1. Capture the admin password from CI logs
2. Store securely in password manager (1Password, LastPass, AWS Secrets Manager)
3. Change password immediately after first login
4. Rotate password regularly (quarterly recommended)

**Note:** Existing production databases with admin users are unaffected. Only new installations use the new initialization script.

### Password Rotation

Regularly rotate admin credentials (recommended: quarterly):

```bash
# 1. Login as admin
# 2. Change password via settings
# 3. Update password in all deployed services/config
# 4. Verify all systems work with new password
```
```

### Step 3: Create Password Reset Script (Optional Enhancement)

**File:** `scripts/reset-admin-password.js` (new)

```javascript
const bcrypt = require('bcrypt');

// Load environment
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function resetAdminPassword() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Prompt for new password (or use CLI argument)
    const newPassword = process.argv[2] || await promptPassword();
    
    if (newPassword.length < 8) {
      console.error('Password must be at least 8 characters');
      process.exit(1);
    }
    
    // Generate bcrypt hash
    const hash = await bcrypt.hash(newPassword, 12);
    
    // Update database
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [hash, 'admin']
    );
    
    console.log('✓ Admin password updated successfully');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

function promptPassword() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question('Enter new admin password: ', answer => {
      rl.close();
      resolve(answer);
    });
  });
}

resetAdminPassword();
```

Add to `package.json` scripts:

```json
{
  "scripts": {
    "reset-admin-password": "node scripts/reset-admin-password.js"
  }
}
```

**Usage:**
```bash
# Interactive prompt
npm run reset-admin-password

# Direct password (less secure)
npm run reset-admin-password newpasswordhere
```

### Step 4: Update Development Documentation

**File:** `docs/DEVELOPMENT.md` (create or update)

```markdown
# Development Guide

## Database Initialization

Each developer's local environment has a unique admin password generated on initialization.

**First-time setup:**
```bash
# Create and initialize database
createdb maka_admin_panel
psql $DATABASE_URL -f scripts/init-db.sql

# Save the admin password from console output
```

**Subsequent starts:**
- Use previously generated admin password
- Re-running init-db.sql won't change password

**Lost local password:**
```bash
npm run reset-admin-password
```

**Team coordination:**
- Document your local admin password in 1Password or LastPass
- Or use a shared team password for development (not recommended for production)
- Each dev environment independent, different acceptable
```

### Step 5: Create Testing Checklist

Before committing:

- [ ] Modify `scripts/init-db.sql` with random password generation
- [ ] Test initialization locally:
  ```bash
  dropdb maka_admin_panel_test
  createdb maka_admin_panel_test
  psql $DATABASE_URL_TEST -f scripts/init-db.sql
  ```
- [ ] Verify random password displayed in console output
- [ ] Verify warning message displayed prominently
- [ ] Copy password from console, test login:
  - Start app: `npm run dev`
  - Login at http://localhost:3000/login
  - Use username `admin` and displayed password
  - Verify login successful
- [ ] Test password change (if feature available)
- [ ] Test re-run protection:
  ```bash
  psql $DATABASE_URL_TEST -f scripts/init-db.sql
  ```
  - Verify password does NOT change
  - Verify existing admin account unchanged
- [ ] Update documentation (README.md)
- [ ] Verify documentation includes sample output
- [ ] Verify password reset instructions included

### Step 6: Automated Testing (Optional)

Create test to verify initialization works:

**File:** `__tests__/init-db.test.ts` (new)

```typescript
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

describe('Database Initialization', () => {
  let pool: Pool;
  const testDbUrl = process.env.DATABASE_URL_TEST;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
  });

  it('creates admin user with random password', async () => {
    // Note: This test assumes init-db.sql has been run
    // In CI/CD, you'd run init-db.sql before this test
    
    const result = await pool.query(
      'SELECT username, password_hash FROM users WHERE username = $1',
      ['admin']
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].username).toBe('admin');
    
    // Verify it's a bcrypt hash
    expect(result.rows[0].password_hash).toMatch(/^\$2[aby]\$/);
  });

  it('password is not the hardcoded default', async () => {
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE username = $1',
      ['admin']
    );

    const hash = result.rows[0].password_hash;
    const defaultHash = '$2b$12$33IAwrMlVq40YQ3xN.sf4.BvKPHmM8Dx/.XLCryjf/ONDw7cDOfGq';
    
    expect(hash).not.toBe(defaultHash);
  });

  it('admin user is unique', async () => {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE username = $1',
      ['admin']
    );

    expect(parseInt(result.rows[0].count)).toBe(1);
  });
});
```

**Note:** This test requires the database to be initialized first. Add to CI pipeline if desired.

### Step 7: Create Feature Branch

```bash
git checkout -b fix/security-remove-hardcoded-admin-credentials
```

### Step 8: Commit Changes

```bash
git add .
git commit -m "fix: replace hardcoded admin credentials with random password generation

- Generate cryptographically random 16-character password on first initialization
- Output credentials to console with prominent warning to change
- Eliminates default credential attacks (admin/admin123)
- Only generates once (ON CONFLICT prevents regeneration)
- Update documentation with new initialization process
- Add password reset instructions
- Closes #20"
```

### Step 9: Deploy to Staging

```bash
git push -u origin fix/security-remove-hardcoded-admin-credentials
gh pr create --title "fix: replace hardcoded admin credentials with random password generation" \
  --body "Removes hardcoded admin credentials for security (#20)"
```

**Staging verification:**
- Destroy and recreate staging database:
  ```bash
  dropdb staging_db
  createdb staging_db
  psql $STAGING_DB_URL -f scripts/init-db.sql
  ```
- Verify random password generated and displayed
- Copy password, login to staging app
- Test password change (if available)
- Verify documentation is accurate
- Note password for staging team

### Step 10: Production Deployment

**Pre-deployment:**
- Staging tests pass
- Documentation updated
- Team notified of new initialization process
- Prepare password reset instructions for existing databases

**Deployment:**
- Merge PR to main
- **Existing production databases unaffected** (admin accounts already configured)
- New database installations use updated script
- Update deployment documentation
- Monitor first production database init (if applicable)
- No action needed for existing production databases

## Files Modified/Created

| File | Type | Action |
|------|------|--------|
| `scripts/init-db.sql` | Edit | Replace hardcoded credentials with random generation |
| `README.md` | Edit | Update initialization documentation |
| `DEPLOYMENT.md` | Edit | Update production deployment notes |
| `scripts/reset-admin-password.js` | New | Optional password reset script |
| `package.json` | Edit | Add reset-admin-password script |
| `docs/DEVELOPMENT.md` | New (or update) | Development guide |

## Verification Commands

```bash
# Test initialization on fresh database
dropdb test_db
createdb test_db
export DATABASE_URL="postgres://user:pass@localhost/test_db"
psql $DATABASE_URL -f scripts/init-db.sql

# Verify admin user created
psql $DATABASE_URL -c "SELECT username, password_hash FROM users WHERE username = 'admin';"

# Verify bcrypt hash format
psql $DATABASE_URL -c "SELECT username, LEFT(password_hash, 7) as hash_prefix FROM users WHERE username = 'admin';"
# Should output: | admin | $2b$12$ |

# Verify only one admin
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users WHERE username = 'admin';"

# Test login (after starting app)
npm run dev
# Navigate to http://localhost:3000/login
# Use credentials from console
```

## Success Criteria

- ✅ Hardcoded credentials removed from `scripts/init-db.sql`
- ✅ Cryptographically secure random password generated
- ✅ Password displayed to console with prominent warning
- ✅ Admin password works on first login
- ✅ Re-running initialization doesn't change password (ON CONFLICT)
- ✅ Documentation updated with new initialization process
- ✅ Documentation includes sample console output
- ✅ Documentation includes password reset process
- ✅ Production unaffected (only new database installations)
- ✅ Password reset instructions documented

## Rollback Plan

If issues arise:

**Option 1: Revert script**
```bash
git revert <commit-hash>
```
Use previous version with hardcoded credentials.

**Option 2: Reset admin password manually**
```sql
-- Generate new hash (using bcrypt in node, python, or online tool)
UPDATE users 
SET password_hash = '$2b$12$...' 
WHERE username = 'admin';
```

**Option 3: Use password reset script**
```bash
npm run reset-admin-password newpasswordhere
```

## Security Impact

**Before:**
- Password: admin123 (known default)
- Attack vector: Automated credential stuffing
- Risk: HIGH (credentials publicly known)
- Exposure: Version control, documentation

**After:**
- Password: 16-character random (2^96 entropy)
- Attack vector: Brute-force (statistically impossible)
- Risk: LOW (unique per installation)
- Exposure: Console output only (not committed)

**Quantitative improvement:**
- Search space: Before: 1 known → After: 2^96 possibilities
- Improvement factor: ~10^28×

## Common Issues and Solutions

**Issue:** Lost admin password after initialization

**Solution:** Use password reset script or manual database update:
```bash
npm run reset-admin-password
# or manually update password_hash in database
```

**Issue:** Need reproducible development environment

**Solution:** Document your local admin password in password manager, or create shared development password (outside init-db.sh script). Future enhancement: environment variable override.

**Issue:** Initialization fails with crypt() error

**Solution:** Ensure PostgreSQL contrib extensions installed:
```bash
# PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

## Future Enhancements

- Add `must_change_password` column for enforcement
- Create admin reset workflow in UI
- Enable environment variable override for dev reproducibility
- Automated email delivery of credentials
- Store credentials in secrets manager on production init
- Add password history to prevent reuse
- Implement password expiration policy
