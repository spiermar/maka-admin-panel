# Account Administration

This document provides administrative workflows for managing user accounts, including unlocking locked accounts and monitoring security events.

## Account Lockout Management

### Checking Lockout Status

**View all currently locked accounts:**
```sql
SELECT id, username, failed_login_attempts, locked_until
FROM users
WHERE locked_until > NOW()
ORDER BY locked_until DESC;
```

**View accounts with failed login attempts:**
```sql
SELECT username, failed_login_attempts, locked_until
FROM users
WHERE failed_login_attempts > 3
ORDER BY failed_login_attempts DESC;
```

### Unlocking a Locked Account

**Unlock a specific user:**
```sql
UPDATE users
SET failed_login_attempts = 0, locked_until = NULL
WHERE username = 'locked_username';
```

**Unlock by user ID:**
```sql
UPDATE users
SET failed_login_attempts = 0, locked_until = NULL
WHERE id = <user_id>;
```

**Verify unlock succeeded:**
```sql
SELECT username, failed_login_attempts, locked_until
FROM users
WHERE username = 'locked_username';
```

### Emergency Reset (All Lockouts)

**Reset all account lockouts:**
```sql
UPDATE users SET failed_login_attempts = 0, locked_until = NULL;
```

**Warning:** This immediately unlocks ALL accounts, including those that may have legitimate security concerns. Use only in emergencies.

### Monitoring Security Events

**Daily security check:**
```sql
-- Accounts with recent failed login attempts
SELECT username,
       failed_login_attempts,
       locked_until,
       CASE
         WHEN locked_until > NOW() THEN 'LOCKED'
         WHEN failed_login_attempts >= 10 THEN 'HIGH RISK'
         WHEN failed_login_attempts >= 5 THEN 'MEDIUM RISK'
         ELSE 'NORMAL'
       END as status
FROM users
WHERE failed_login_attempts > 0
   OR locked_until > NOW()
ORDER BY failed_login_attempts DESC;
```

**Top 10 users by failed attempts:**
```sql
SELECT username, failed_login_attempts, locked_until
FROM users
WHERE failed_login_attempts > 0
ORDER BY failed_login_attempts DESC
LIMIT 10;
```

## Password Reset Workflow

### Manual Password Reset

If a user forgets their password:

1. **Generate a new password hash:**
```javascript
const bcrypt = require('bcrypt');
const password = 'NewSecurePassword123!';
const hash = await bcrypt.hash(password, 12);
console.log(hash);
```

2. **Update user's password in database:**
```sql
UPDATE users
SET password_hash = '$2b$12$...'  -- Insert generated hash
WHERE username = 'user_to_reset';
```

3. **Communicate new password to user via secure channel**
   - Email (encrypted if possible)
   - Phone call
   - In person

4. **Require user to change password on next login**
   - (Future enhancement: implement `must_change_password` column)

### Reset Admin Account

If you need to reset the admin password:

```sql
-- Generate hash for temporary password
-- Use bcrypt.hash('TempPass123!', 12)

UPDATE users
SET password_hash = '$2b$12$...'
WHERE username = 'admin';

-- Reset failed attempts to ensure login works
UPDATE users
SET failed_login_attempts = 0, locked_until = NULL
WHERE username = 'admin';
```

## Session Management

### Invalidate All User Sessions

A user reports account compromise or wants to log out all devices:

```sql
-- Increment session version to invalidate all existing sessions
-- (Requires session versioning feature as documented in SECURITY_SESSION.md)
UPDATE users
SET session_version = session_version + 1
WHERE username = 'compromised_user';
```

### Check Active Sessions

If you track session metadata:

```sql
-- View recent authentications
SELECT username, session_version, created_at
FROM users
ORDER BY created_at DESC;
```

## Account Creation and Deletion

### Create New User Account

```sql
INSERT INTO users (username, password_hash)
VALUES ('newuser', '$2b$12$...');
```

Generate a secure password hash using bcrypt with 12 salt rounds.

### Disable an Account

Two approaches:

**Option 1: Lock the account indefinitely**
```sql
UPDATE users
SET locked_until = NOW() + INTERVAL '10 years'
WHERE username = 'user_to_disable';
```

**Option 2: Change password (more secure)**
```sql
-- Generate a random, unknown password hash
UPDATE users
SET password_hash = '$2b$12$...'  -- Unknown password
WHERE username = 'user_to_disable';
```

**Option 3: (Future) Add `is_disabled` column**
```sql
UPDATE users SET is_disabled = true WHERE username = 'user_to_disable';
```

### Delete an Account

**Warning:** Deleting an account is irreversible and may cascade to related data.

```sql
-- Check for transactions first
SELECT COUNT(*) FROM transactions WHERE user_id = <user_id>;

-- Safe deletion if no dependencies
DELETE FROM users WHERE id = <user_id>;
```

## Security Incident Response

### Account Compromise Detected

1. **Lock the account immediately:**
```sql
UPDATE users
SET failed_login_attempts = 15, locked_until = NOW() + INTERVAL '10 years'
WHERE username = 'compromised_account';
```

2. **Invalidate all sessions:**
```sql
UPDATE users
SET session_version = session_version + 1
WHERE username = 'compromised_account';
```

3. **Reset password:**
```sql
UPDATE users
SET password_hash = '$2b$12$...'  -- New, unknown hash
WHERE username = 'compromised_account';
```

4. **Notify user via secure channel** (not email if account compromised)

5. **Document incident** in security logs or issue tracker

### Brute-Force Attack Detected

If you detect a brute-force attack pattern:

1. **Check for affected accounts:**
```sql
SELECT username, failed_login_attempts, locked_until
FROM users
WHERE failed_login_attempts > 5
ORDER BY failed_login_attempts DESC;
```

2. **Consider blocking the attacking IP** (at firewall/load balancer level)

3. **Temporarily tighten rate limiting** (increase lockout sensitivity)

4. **Monitor for distributed attacks** (multiple IPs targeting same accounts)

5. **Review audit logs** for additional suspicious activity

## Automated Tasks

### Scheduled Job: Clear Expired Lockouts

Create a database job or cron job to clean up expired lockouts (optional, as queries filter by `locked_until > NOW()` automatically):

```sql
-- Not strictly necessary, but can be run periodically
UPDATE users
SET failed_login_attempts = 0, locked_until = NULL
WHERE locked_until < NOW();
```

### Scheduled Job: Security Report

Weekly security report emailed to administrators:

```sql
-- Users with >5 failed attempts in last 7 days
SELECT username,
       failed_login_attempts,
       locked_until
FROM users
WHERE failed_login_attempts > 5
ORDER BY failed_login_attempts DESC;
```

## Troubleshooting

### User Cannot Login: "Account Temporarily Locked"

**Cause:** User exceeded failed login threshold and account is locked.

**Unlock:**
```sql
UPDATE users
SET failed_login_attempts = 0, locked_until = NULL
WHERE username = '<username>';
```

**Verify user still has access:**
- User should be able to login immediately after unlock
- If user forgot password, reset password instead

### User Cannot Login: "Too Many Login Attempts"

**Cause:** Rate limiting triggered (too many rapid attempts from user/IP).

**Resolution:**
- Wait 60 seconds for rate limit to expire automatically
- No manual intervention needed

### Admin Account Locked Out

If you lock yourself out:

1. **Direct database access required**
2. **Reset admin password:**
```sql
UPDATE users
SET password_hash = '$2b$12$...',
    failed_login_attempts = 0,
    locked_until = NULL
WHERE username = 'admin';
```

3. **Login with new password**
4. **Increase password complexity**
5. **Document what happened**

### Multiple Accounts Locked (Attack Pattern)**

If you see multiple accounts locked simultaneously:

1. **Check attack pattern:**
```sql
SELECT username, failed_login_attempts, locked_until
FROM users
WHERE locked_until > NOW()
ORDER BY locked_until DESC
LIMIT 20;
```

2. **Investigate commonalities:**
   - Same time period?
   - Similar username patterns?
   - Could indicate bot attack or credential leak

3. **Mitigation:**
   - Tighten passwords on affected accounts
   - Email users about suspicious activity
   - Block suspicious IPs at network level

4. **Monitor** for continued attacks

## Backup and Recovery

### Account Lockouts and Backups

**Important:** Account lockout state is included in database backups.

**After Restoring from Backup:**
- Locked accounts remain locked (as expected)
- Failed attempt counters preserved
- Users may need to wait for lockouts to expire or be manually unlocked

**If You Want to Reset All Lockouts After Restore:**
```sql
UPDATE users SET failed_login_attempts = 0, locked_until = NULL;
```

## Future Enhancements

Planned improvements to account administration:

1. **Admin Dashboard**
   - Web UI for managing lockouts
   - Visual charts of failed login trends
   - Bulk operations (unlock multiple accounts)

2. **Email Notifications**
   - Notify users of account lockouts
   - Notify users of failed login attempts
   - Security alerts for administrators

3. **Audit Logging**
   - Track all administrative actions
   - Log password resets and unlocks
   - Compliance evidence (SOC 2, GDPR)

4. **Self-Service Recovery**
   - Password reset via email link
   - Account unlock after identity verification
   - 2FA reset workflow

## Best Practices

1. **Never share passwords in plaintext** - Use secure channels or password managers

2. **Document all administrative actions** - Audit trail essential for security incidents

3. **Use principle of least privilege** - Only administrators with justification should run these commands

4. **Test password changes** - Verify user can login after operations

5. **Back up before bulk operations** - `UPDATE` without `WHERE` clause can be destructive

6. **Monitor abnormal patterns** - Proactive security monitoring beats reactive incident response

7. **Educate users** - Teach good password hygiene and recognize phishing

## References

- **Session Security:** `docs/SECURITY_SESSION.md`
- **Rate Limiting Implementation:** `lib/auth/rate-limit.ts`
- **Account Lockout Implementation:** `lib/auth/account-lockout.ts`
- **Database Schema:** `lib/db/schema.sql`
- **Security Best Practices:** `docs/SECURITY_HEADERS.md`
