# Session Security

This document explains the session security implementation and best practices.

## Overview

The application uses [iron-session](https://github.com/vvo/iron-session) for encrypted, cookie-based sessions. This document covers the security measures implemented to protect user sessions.

## Security Features

### 1. Session Secret Validation

**Implementation:** Validates `SESSION_SECRET` on application startup.

**Checks:**
- ✅ Secret must exist (not undefined)
- ✅ Secret must be at least 32 characters long
- ✅ Production: Detects and rejects weak/default secrets

**Error Messages:**
```
SESSION_SECRET environment variable is required.
Generate one with: openssl rand -base64 32

SESSION_SECRET must be at least 32 characters long.
Current length: 16. Generate a secure secret with: openssl rand -base64 32

Default or weak SESSION_SECRET detected in production environment.
Generate a secure secret with: openssl rand -base64 32
```

**Why:** A weak or missing session secret compromises all session encryption. The validation prevents application startup with insecure configuration.

### 2. Secure Cookie Configuration

**Settings:**
```typescript
cookieOptions: {
  secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
  httpOnly: true,                                 // Prevents JavaScript access
  sameSite: 'strict',                             // CSRF protection
  maxAge: 60 * 60 * 24 * 7,                      // 1 week expiration
  path: '/',                                      // Explicit path restriction
  domain: process.env.COOKIE_DOMAIN,             // Optional domain restriction
}
```

**Security Benefits:**

**`httpOnly: true`**
- Prevents XSS attacks from stealing session cookies
- JavaScript cannot access the cookie via `document.cookie`

**`secure: true` (production)**
- Forces cookies to only be sent over HTTPS
- Prevents man-in-the-middle attacks from intercepting session cookies
- Disabled in development to allow HTTP on localhost

**`sameSite: 'strict'`**
- Strongest CSRF protection
- Cookie not sent on cross-site requests (even GET)
- Prevents session riding attacks
- Note: May affect legitimate cross-site navigation (e.g., links from emails)

**`path: '/'`**
- Explicitly restricts cookie to application root
- Prevents cookie from being sent to unintended paths

**`domain` (optional)**
- Restricts cookie to specific domain
- Can be configured for subdomain sharing (e.g., `.example.com`)
- If not set, defaults to exact domain match

**`maxAge: 1 week`**
- Sessions expire after 7 days of inactivity
- Reduces window for session hijacking
- Users must re-authenticate after expiration

### 3. Session Fixation Protection

**Problem:** Reusing session IDs before authentication allows attackers to hijack sessions.

**Attack Scenario:**
1. Attacker gets a valid session ID from the application
2. Attacker tricks victim into using that session ID
3. Victim logs in with the fixed session ID
4. Attacker now has authenticated session access

**Solution:** Session ID regeneration on login.

**Implementation:**
```typescript
// Destroy old session
const oldSession = await getSession();
await oldSession.destroy();

// Create new session with fresh ID
const session = await getSession();
session.userId = user.id;
session.username = user.username;
await session.save();
```

**Protection:** Every successful login creates a completely new session with a new session ID, invalidating any pre-existing session.

### 4. Session Versioning & Invalidation

**Problem:** No way to invalidate sessions on security events (password changes, suspicious activity).

**Solution:** Session versioning with database-backed validation.

**How It Works:**

1. **Database Column:** Users table has `session_version` column (default: 1)

2. **Session Storage:** Session stores user's `session_version` on login

3. **Validation:** Every authenticated request checks if session version matches database:
   ```typescript
   if (user.session_version !== session.sessionVersion) {
     session.destroy();
     redirect('/login');
   }
   ```

4. **Invalidation:** Incrementing `session_version` invalidates all active sessions:
   ```typescript
   await invalidateUserSessions(userId);
   ```

**Use Cases:**
- ✅ Password changes
- ✅ Account compromise detection
- ✅ User-initiated "log out all devices"
- ✅ Security policy changes
- ✅ Suspicious activity detection

**Example:**
```typescript
import { invalidateUserSessions } from '@/lib/auth/session-invalidation';

// After password change
async function changePassword(userId: number, newPassword: string) {
  await updatePassword(userId, newPassword);
  await invalidateUserSessions(userId); // Log out all devices
}
```

## Rate Limiting and Brute Force Protection

To protect against authentication attacks, the application implements two layers of protection:

### Layer 1: Rate Limiting (In-Memory)

Rate limiting prevents rapid-fire login attempts using an in-memory LRU cache.

**Implementation:** `lib/auth/rate-limit.ts`

**Configuration:**
- Max attempts: 5 per minute per user/identifier
- TTL: 60 seconds (1 minute)
- Cache size: 500 entries (LRU eviction when full)

**How It Works:**
```typescript
import { checkRateLimit, resetRateLimit } from '@/lib/auth/rate-limit';

// Check if rate limited
const rateLimit = checkRateLimit(`login:user:${userId}`, 5);
if (!rateLimit.allowed) {
  return { error: 'Too many login attempts. Please try again later.' };
}

// Reset on successful login
resetRateLimit(`login:user:${userId}`);
```

**Security Benefits:**
- ✅ Prevents brute-force attacks from single IP/bot
- ✅ Fast enforcement (in-memory, no DB query)
- ✅ Automatically resets after TTL
- ✅ Different identifiers prevent circumvention

**Limitations:**
- Lost on server restart (but complemented by Account Lockout)
- In-memory (not distributed for horizontal scaling)

### Layer 2: Progressive Account Lockout (Database)

Account lockout provides persistent protection that survives server restarts and tracks cumulative failed attempts.

**Implementation:** `lib/auth/account-lockout.ts`

**Progressive Lockout Rules:**
| Failed Attempts | Lock Duration | Rationale |
|----------------|---------------|-----------|
| 5 | 5 minutes | Initial deterrent, quick reset |
| 10 | 30 minutes | Moderate for persistent attackers |
| 15 | 24 hours (1440 min) | Strong deterrent, requires admin help |
| Reset | 0 | Successful login clears counter |

**How It Works:**
```typescript
import {
  getAccountLockoutStatus,
  incrementFailedAttempts,
  resetFailedAttempts,
} from '@/lib/auth/account-lockout';

// Check if account locked first
const lockoutStatus = await getAccountLockoutStatus(userId);
if (lockoutStatus.isLocked) {
  const minutesUntil = Math.ceil(
    (lockoutStatus.lockedUntil!.getTime() - Date.now()) / (60 * 1000)
  );
  return { error: `Account temporarily locked. Try again in ${minutesUntil} minutes.` };
}

// On failed password
await incrementFailedAttempts(userId);

// On successful login
await resetFailedAttempts(userId);
```

**Database Schema:**
```sql
ALTER TABLE users
  ADD COLUMN failed_login_attempts INTEGER DEFAULT 0,
  ADD COLUMN locked_until TIMESTAMP;

CREATE INDEX idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX idx_users_failed_attempts ON users(failed_login_attempts) WHERE failed_login_attempts > 0;
```

**Security Benefits:**
- ✅ Persistent protection (survives server restarts)
- ✅ Progressive escalation (harder attacks trigger longer locks)
- ✅ Prevents distributed attacks (account-level, not IP-level)
- ✅ Database query is fast (indexed)

### Dual-Layer Protection

Combined, these layers provide defense-in-depth:

1. **Immediate Protection:** Rate limit blocks rapid attempts from single source
2. **Persistent Protection:** Account lockout tracks cumulative attempts across multiple sources
3. **Fast Reset:** Successful login immediately resets both rate limit and failed attempts
4. **Generic Messages:** "Invalid username or password" prevents account enumeration

**Example Attack Scenarios:**

**Single IP Brute-Force:**
```
Attacker from IP X → 5 rapid attempts → Rate limit blocks
                                    → Account NOT locked (not 5+ failures)
```

**Distributed Attack (Botnet):**
```
Attacker from IP 1-10 → Each IP makes 5 attempts → Rate limit NOT triggered
                                     → Account locks (15+ cumulative failures)
```

**Slow-Paced Attack (1 attempt/minute):**
```
Attacker from IP X → 15 attempts over 15 minutes → Rate limit resets
                                              → Account locks (threshold reached)
```

### Managing Locked Accounts

**Check Locked Accounts:**
```sql
SELECT id, username, failed_login_attempts, locked_until
FROM users
WHERE locked_until > NOW()
ORDER BY locked_until DESC;
```

**Unlock an Account:**
```sql
UPDATE users
SET failed_login_attempts = 0, locked_until = NULL
WHERE username = 'locked_user';
```

**Reset All Lockouts (Emergency):**
```sql
UPDATE users SET failed_login_attempts = 0, locked_until = NULL;
```

**Monitor Suspicious Activity:**
```sql
SELECT username, failed_login_attempts, locked_until
FROM users
WHERE failed_login_attempts > 3
ORDER BY failed_login_attempts DESC;
```

### Database Migration

**Migration File:** `lib/db/migrations/002_add_account_lockout.sql`

**Run Migration:**
```bash
psql $DATABASE_URL -f lib/db/migrations/002_add_account_lockout.sql
```

**What It Does:**
1. Adds `failed_login_attempts` column (default: 0)
2. Adds `locked_until` column (nullable)
3. Creates indexes for lockout and failed attempts queries

**Rollback:**
```sql
DROP INDEX IF EXISTS idx_users_locked_until;
DROP INDEX IF EXISTS idx_users_failed_attempts;
ALTER TABLE users DROP COLUMN IF EXISTS failed_login_attempts;
ALTER TABLE users DROP COLUMN IF EXISTS locked_until;
```

**Existing Users:** Start with `failed_login_attempts = 0`, no lockouts. All accounts active.

## Session Lifecycle

### Login Flow
1. User submits credentials
2. Validate username/password
3. **Destroy existing session** (prevent fixation)
4. Create new session
5. Store user ID, username, and session version
6. Save session (encrypted cookie sent to client)

### Authenticated Request Flow
1. Client sends request with session cookie
2. `requireAuth()` decrypts session
3. Check if `userId` exists
4. **Validate session version** against database
5. If version mismatch, destroy session and redirect to login
6. Return authenticated user data

### Logout Flow
1. User clicks logout
2. Server calls `session.destroy()`
3. Session cookie cleared
4. Redirect to login page

## Environment Variables

### Required

**`SESSION_SECRET`**
- **Purpose:** Encryption key for session cookies
- **Requirements:** Minimum 32 characters, cryptographically random
- **Generation:** `openssl rand -base64 32`
- **Security:** Keep secret, never commit to version control
- **Example:** `Gx8jK2nP9qR5tU7vW0xY1zA3bC4dE6fH8iJ0kL2mN4o=`

### Optional

**`COOKIE_DOMAIN`**
- **Purpose:** Restrict session cookie to specific domain
- **Format:** Domain name (e.g., `.example.com` for all subdomains)
- **When to Use:**
  - Multi-subdomain applications
  - Prevent cookie leakage to other domains
- **Default:** If not set, cookie restricted to exact domain match
- **Examples:**
  - `COOKIE_DOMAIN=.example.com` - Shares cookie across `app.example.com`, `api.example.com`
  - `COOKIE_DOMAIN=example.com` - Only `example.com`, not subdomains
  - Not set - Only exact domain that set the cookie

## Database Migration

### Running the Migration

The session versioning feature requires adding a `session_version` column to the `users` table.

**Migration File:** `lib/db/migrations/001_add_session_version.sql`

**Manual Execution:**
```bash
psql $DATABASE_URL -f lib/db/migrations/001_add_session_version.sql
```

**What It Does:**
1. Adds `session_version INTEGER DEFAULT 1 NOT NULL` column
2. Creates index for faster lookups: `idx_users_session_version`
3. Adds column comment for documentation

**Rollback:**
```sql
DROP INDEX IF EXISTS idx_users_session_version;
ALTER TABLE users DROP COLUMN IF EXISTS session_version;
```

**Note:** Existing users will have `session_version = 1` after migration. All existing sessions remain valid.

## API Reference

### Session Management

**`getSession()`**
```typescript
const session = await getSession();
// Returns: SessionData with userId, username, sessionVersion
```

**`requireAuth()`**
```typescript
const user = await requireAuth();
// Returns: SessionData or redirects to /login
// Validates session version automatically
```

**`getCurrentUser()`**
```typescript
const user = await getCurrentUser();
// Returns: SessionData | null (no redirect)
```

### Session Invalidation

**`invalidateUserSessions(userId)`**
```typescript
import { invalidateUserSessions } from '@/lib/auth/session-invalidation';

await invalidateUserSessions(123);
// Invalidates all sessions for user ID 123
```

**`invalidateAllSessions()`**
```typescript
import { invalidateAllSessions } from '@/lib/auth/session-invalidation';

await invalidateAllSessions();
// WARNING: Logs out ALL users. Emergency use only.
```

**`getUserSessionVersion(userId)`**
```typescript
import { getUserSessionVersion } from '@/lib/auth/session-invalidation';

const version = await getUserSessionVersion(123);
// Returns: Current session version (for debugging/audit)
```

## Security Best Practices

### For Developers

1. **Never Log Session Data**
   - Session cookies contain encrypted user data
   - Logging session data may expose sensitive information
   - Only log session events (login, logout, validation failure)

2. **Always Use `requireAuth()`**
   - Don't manually check `session.userId`
   - `requireAuth()` includes session version validation
   - Provides consistent security checks

3. **Invalidate Sessions on Security Events**
   ```typescript
   // Password change
   await invalidateUserSessions(userId);

   // Account lockout
   await invalidateUserSessions(userId);

   // Suspicious activity detected
   await invalidateUserSessions(userId);
   ```

4. **Set Appropriate Cookie Domain**
   - Don't set `COOKIE_DOMAIN` if not needed
   - Be specific: `.example.com` shares with ALL subdomains
   - Test thoroughly when changing domain configuration

5. **Monitor Session Metrics**
   - Track login/logout events
   - Monitor session invalidation frequency
   - Alert on unusual session patterns

### For Operations

1. **Generate Strong Secrets**
   ```bash
   # Generate SESSION_SECRET
   openssl rand -base64 32

   # Verify length
   echo -n "$SESSION_SECRET" | wc -c
   # Should be >= 32
   ```

2. **Rotate Session Secrets**
   - Plan for SECRET rotation in case of compromise
   - Rotating SECRET invalidates ALL sessions
   - Users must re-authenticate after rotation

3. **HTTPS in Production**
   - Session cookies marked `secure` in production
   - Requires valid SSL/TLS certificate
   - Prevents session interception

4. **Database Backups**
   - Session versions stored in database
   - Backup/restore affects session validity
   - Document session behavior after restore

## Compliance

### OWASP Guidelines

✅ **A02:2021 – Cryptographic Failures**
- Strong session secret validation (32+ characters)
- Encrypted session cookies (iron-session)

✅ **A07:2021 – Identification and Authentication Failures**
- Session fixation protection
- Session invalidation on security events
- Secure cookie configuration

### PCI DSS

✅ **Requirement 8.2.3:** Strong authentication
- Session versioning enables multi-factor recovery
- Session invalidation on password change

✅ **Requirement 6.5.10:** Broken authentication
- Session fixation prevention
- Secure session management

### SOC 2

✅ **CC6.6:** Logical and physical access controls
- Session timeout (1 week)
- Session invalidation mechanisms
- Secure cookie flags

## Troubleshooting

### "SESSION_SECRET environment variable is required"

**Cause:** `SESSION_SECRET` not set in `.env.local`

**Fix:**
```bash
# Generate secret
openssl rand -base64 32

# Add to .env.local
echo "SESSION_SECRET=<generated-secret>" >> .env.local
```

### "SESSION_SECRET must be at least 32 characters long"

**Cause:** Session secret too short

**Fix:** Generate a new secret with `openssl rand -base64 32`

### "Default or weak SESSION_SECRET detected in production"

**Cause:** Using example/default secret in production

**Fix:** Generate a unique secret for production environment

### Sessions Invalidated After Database Restore

**Cause:** Database restore may reset `session_version` values

**Impact:** All users logged out

**Prevention:**
- Document session behavior in restore procedures
- Consider `session_version` in backup/restore scripts

### Cookie Not Being Set

**Possible Causes:**
1. `COOKIE_DOMAIN` mismatch with actual domain
2. HTTPS required but not available
3. `sameSite: 'strict'` blocking cross-site requests

**Debug:**
```typescript
// Temporarily log session options (development only!)
console.log('Session options:', sessionOptions);
```

## Future Improvements

1. **Session Activity Tracking**
   - Log last active timestamp
   - Implement sliding expiration
   - Track concurrent sessions per user

2. **Session Metadata**
   - Store IP address, user agent
   - Detect suspicious session usage
   - Show "active sessions" to users

3. **Redis Session Store**
   - Current: Cookie-based (encrypted, stateless)
   - Future: Redis for server-side session storage
   - Benefits: Instant invalidation, better control

4. **Remember Me Functionality**
   - Separate long-lived refresh tokens
   - Short-lived session tokens
   - Better balance of security and UX

## References

- [iron-session Documentation](https://github.com/vvo/iron-session)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN - HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [CWE-384: Session Fixation](https://cwe.mitre.org/data/definitions/384.html)
- [CWE-613: Insufficient Session Expiration](https://cwe.mitre.org/data/definitions/613.html)
