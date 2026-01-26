# Remove Hardcoded Admin Credentials Design Document

**Issue:** #20 - [MEDIUM] Remove Hardcoded Admin Credentials
**Date:** 2026-01-26
**Severity:** MEDIUM
**Status:** Design Phase

## Overview

Replace hardcoded admin credentials in database initialization script with randomly generated password. Eliminates default credential attacks while maintaining simplicity.

## Problem Statement

**CWE-798:** Use of Hard-coded Credentials

The database initialization script (`scripts/init-db.sql`) contains hardcoded admin credentials:

```sql
-- password: admin123
INSERT INTO users (username, password_hash) VALUES
  ('admin', '$2b$12$33IAwrMlVq40YQ3xN.sf4.BvKPHmM8Dx/.XLCryjf/ONDw7cDOfGq')
```

### Security Risks

1. **Default credential attacks:** Attackers know admin/admin123 is the default
2. **Credential exposure in version control:** Hash visible in git history
3. **Automated attacks:** Bots scan for default admin credentials
4. **Production deployments:** Default credentials often forgotten in production
5. **Compliance violation:** Hardcoded secrets violate security best practices

### Attack Scenario

```bash
# Attacker scans for known vulnerabilities
curl -X POST https://target.com/login \
  -d 'username=admin&password=admin123'

# If credentials unchanged, attacker gains access
```

## Solution Architecture

### Approach: Random Password Generation on Initialization

Generate cryptographically secure random password during database initialization, display to console with prominent security warning.

**Mechanism:**
1. Use PostgreSQL's `gen_random_bytes()` for secure randomness
2. Encode as base64 for readable password format
3. Hash with bcrypt (cost factor 12)
4. Insert into database
5. Display username and password to console
6. Show warning to change immediately

### Components

1. **Modified init-db.sql** (`scripts/init-db.sql`)
   - Replace hardcoded password with DO block
   - Generate 16-character random password
   - Display credentials via RAISE NOTICE
   - Only generates once (ON CONFLICT clause)

2. **Documentation Updates**
   - Update README with new initialization process
   - Document password generation behavior
   - Include sample output for reference

3. **Optional Enhancement** (out of scope for MVP)
   - Add `must_change_password` column for enforcement
   - Admin override workflow

### Password Generation Algorithm

```sql
-- Generate 12 random bytes
SELECT encode(gen_random_bytes(12), 'base64');

-- Remove special characters for better compatibility
SELECT regexp_replace(base64_string, '[^a-zA-Z0-9]', '', 'g');

-- Final result: 16-character alphanumeric password
-- Example: abcXYZ123def456, 7mK2nL9pQ5rS3tU8
```

**Properties:**
- **Entropy:** 12 random bytes × 8 bits/byte = 96 bits of entropy
- **Length:** 16 characters (after base64 encoding and special char removal)
- **Format:** Alphanumeric only (no special chars for better compatibility)
- **Uniqueness:** Cryptographically random, statistically impossible to guess

### Console Output Example

```
========================================
ADMIN USER CREDENTIALS GENERATED
Username: admin
Password: abcXYZ123def456
========================================
⚠️  CHANGE THIS PASSWORD IMMEDIATELY! ⚠️
========================================
```

### Security Properties

**Before:**
- ❌ Default credentials known: admin/admin123
- ❌ Automated default credential attacks possible
- ❌ Credentials stored in version control
- ❌ Same password across all installations

**After:**
- ✅ Unique random password per installation
- ✅ No default credential attacks
- ✅ Credentials only in console output (not committed)
- ✅ Cryptographically secure (96 bits entropy)
- ✅ Only developers see password (console)

### Flow Comparison

**Before:**
```
Developer: psql -f scripts/init-db.sql
→ Script uses hardcoded password
→ Database initialized with admin/admin123
→ ❌ Password visible in git history
```

**After:**
```
Developer: psql -f scripts/init-db.sql
→ DO block generates random password
→ RAISE NOTICE displays credentials to console
→ ✓ Password only in console, not in code
→ ✓ Unique per installation
```

### Limitations and Trade-offs

| Limitation | Mitigation |
|------------|------------|
| Password appears in console logs | Developers should clear logs, use secure terminals |
| No enforcement of password change | Add `must_change_password` column in future enhancement |
| Development reproducibility reduced | Document that each dev environment has different password |
| Lost password requires reset | Document password reset process |

## Implementation Scope

### In Scope
1. Modify `scripts/init-db.sql` to generate random password
2. Ensure password only generated once (ON CONFLICT)
3. Display credentials prominently with security warning
4. Update documentation with new initialization process
5. Provide password reset instructions

### Out of Scope
- `must_change_password` enforcement (future enhancement)
- Admin reset workflow (use database direct access)
- Password change UI (assume existing)
- Environment variable override (for reproducible dev setups)
- Automated email delivery of credentials

### Future Enhancements

After MVP, consider:
1. **Add `must_change_password` column:**
   - Forces password change on first login
   - Redirects to password change page
   - Prevents use of default credentials

2. **Admin reset workflow:**
   - Admin utility script for password reset
   - `npm run reset-admin-password` command
   - Security questions or verification

3. **Environment variable override:**
   ```bash
   ADMIN_PASSWORD="dev123" psql -f scripts/init-db.sql
   ```
   - Allows reproducible development setups
   - Still uses random if not set

4. **Automated delivery:**
   - Email credentials via SendGrid/Mailgun
   - Store in environment variable (AWS Secrets Manager)
   - Secure storage (1Password, HashiCorp Vault)

## Testing Strategy

### Manual Testing

1. **Initial initialization:**
   ```bash
   psql $DATABASE_URL -f scripts/init-db.sql
   ```
   - Verify random password displayed in console
   - Verify warning message displayed
   - Confirm password works for login
   - Reset database and re-run to verify uniqueness

2. **Re-run protection:**
   ```bash
   # Run initialization again
   psql $DATABASE_URL -f scripts/init-db.sql
   ```
   - Verify password does NOT change (ON CONFLICT)
   - Verify existing admin account unchanged
   - Verify no duplicate admin accounts

3. **Password strength:**
   - Check generated password is 16 characters
   - Verify alphanumeric only (no special chars)
   - Test login with generated credentials
   - Change password after login

### Database Verification

```sql
-- Check admin user created
SELECT * FROM users WHERE username = 'admin';

-- Verify password hash is bcrypt (starts with $2b$)
SELECT username, password_hash FROM users WHERE username = 'admin';

-- Verify only one admin account
SELECT COUNT(*) FROM users WHERE username = 'admin';
```

## Migration and Deployment

### No Database Migration Required

This is purely a script modification. No database schema changes.

### Deployment Steps

1. **Staging:**
   - Update `scripts/init-db.sql` in repository
   - Test initialization on staging database:
     ```bash
     DROP DATABASE staging_db;
     CREATE DATABASE staging_db;
     psql $STAGING_DB_URL -f scripts/init-db.sql
     ```
   - Verify credentials displayed
   - Test login with generated password
   - Document for staging team

2. **Production:**
   - Merge PR with script changes
   - **Existing databases unaffected** (admin accounts already configured)
   - New database installations use new script
   - Update deployment documentation
   - Communication to engineering team

### Rollback Plan

If issues arise:

1. **Revert script:**
   ```bash
   git revert <commit-hash>
   ```
   Use previous version with hardcoded credentials.

2. **Admin password reset:**
   If admin password lost or script fails:
   ```sql
   -- Generate new password hash
   -- Using bcrypt in node or Python:
   # Node: bcrypt.hash('newpassword', 12)
   # Python: bcrypt.hashpw(b'newpassword', bcrypt.gensalt(12))
   
   UPDATE users 
   SET password_hash = '$2b$12$...' 
   WHERE username = 'admin';
   ```

3. **Alternative:** Use password reset flow if available

### Password Reset Process

If admin password is lost:

**Option 1: Direct database reset**
```javascript
// Generate new hash
const bcrypt = require('bcrypt');
const hash = bcrypt.hash('newpassword', 12);

// Update database
psql $DATABASE_URL -c "UPDATE users SET password_hash = '$hash' WHERE username = 'admin';"
```

**Option 2: Reset script** (create in future)
```bash
npm run reset-admin-password
# Prompts for new password
# Updates database
```

## Alternatives Considered

### Option 1: Environment Variable for Password
- **Pros:** Reproducible across environments
- **Cons:** Secrets management required, still needs delivery
- **Rejected:** Adds complexity, no delivery mechanism

### Option 2: Prompt User for Password
- **Pros:** User control over password
- **Cons:** Interactive scripts can't be automated
- **Rejected:** Breaks CI/CD pipelines

### Option 3: External Secret Management
- **Pros:** Enterprise-grade security
- **Cons:** External dependency, infrastructure cost
- **Rejected:** Overkill for MVP

### Option 4: Keep Hardcoded Password (Current)
- **Pros:** Simplest
- **Cons:** Security risk
- **Rejected:** Vulnerability must be fixed

## Success Criteria

- ✅ Hardcoded credentials removed from `scripts/init-db.sql`
- ✅ Cryptographically secure random password generated
- ✅ Credentials displayed to console with prominent warning
- ✅ Password works on first login
- ✅ Re-running initialization doesn't change password (ON CONFLICT)
- ✅ Documentation updated with new initialization process
- ✅ Production unaffected (only new database installations)
- ✅ Password reset process documented

## Security Impact

**Before:**
- **Risk:** HIGH - Default credentials publicly known
- **CWE:** CWE-798
- **Attack vector:** Automated credential stuffing
- **Exposure:** Version control, default passwords

**After:**
- **Risk:** LOW - Unique credentials per installation
- **CWE:** Fixed
- **Attack vector:** Brute-force required (96 bits entropy)
- **Exposure:** Console output only

**Quantitative improvement:**
- Before: 1 known credential (admin/admin123)
- After: 2^96 possible passwords (statistically impossible to brute-force)
- **Security gain:** ~10^28× improvement

## References

- Issue: #20 - [MEDIUM] Remove Hardcoded Admin Credentials
- CWE-798: Use of Hard-coded Credentials
- NIST SP 800-132: Recommendation for Password-Based Key Derivation
- OWASP Hard-coded Secret Key: https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html
- PostgreSQL gen_random_bytes(): https://www.postgresql.org/docs/current/functions-genetic.html
