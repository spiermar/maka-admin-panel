# Audit Logging and Security Monitoring Implementation Plan

**Issue:** #19 - [MEDIUM] Implement Audit Logging and Security Monitoring
**Design:** docs/plans/2026-01-26-audit-logging-design.md
**Estimated Time:** 3-4 hours
**Priority:** MEDIUM

## Overview

Implement audit logging focused on authentication events. Create PostgreSQL table, logger utility, and integrate into authentication Server Actions.

## Implementation Steps

### Step 1: Create Database Migration

**File:** `lib/db/migrations/003_add_audit_log.sql` (new)

```sql
-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  resource VARCHAR(50) NOT NULL,
  resource_id INTEGER,
  success BOOLEAN NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_success ON audit_log(success, created_at);

-- Comment for documentation
COMMENT ON TABLE audit_log IS 'Immutable audit log of security-relevant events';
COMMENT ON COLUMN audit_log.details IS 'JSONB field for flexible context (e.g., username, reason, metadata)';
```

### Step 2: Create Audit Logger Utility

**File:** `lib/audit/logger.ts` (new)

```typescript
import { execute } from '@/lib/db';
import { logSecureError } from '@/lib/utils/error-handler';
import { cookies } from 'next/headers';

export interface AuditEvent {
  userId?: number;
  action: 'login' | 'logout' | 'login_failed' | 'session_created' | 'session_destroyed';
  resource: 'authentication' | 'session';
  resourceId?: number;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

async function getClientIp(): Promise<string | undefined> {
  try {
    const headers = await headers();
    
    // Check for forwarded IP (behind proxy/load balancer)
    const forwardedFor = headers.get('x-forwarded-for');
    if (forwardedFor) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return forwardedFor.split(',')[0].trim();
    }
    
    // Check for real IP header
    const realIp = headers.get('x-real-ip');
    if (realIp) {
      return realIp;
    }
    
    // Fallback to connection address (not available in Server Actions)
    return undefined;
  } catch {
    return undefined;
  }
}

async function getUserAgent(): Promise<string | undefined> {
  try {
    const headers = await headers();
    return headers.get('user-agent') || undefined;
  } catch {
    return undefined;
  }
}

export async function logAuditEvent(event: AuditEvent) {
  try {
    const ipAddress = event.ipAddress || await getClientIp();
    const userAgent = event.userAgent || await getUserAgent();
    
    await execute(
      `INSERT INTO audit_log (user_id, action, resource, resource_id, success, ip_address, user_agent, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        event.userId,
        event.action,
        event.resource,
        event.resourceId,
        event.success,
        ipAddress,
        userAgent,
        event.details ? JSON.stringify(event.details) : null,
      ]
    );
  } catch (error) {
    // Log to secure handler - don't break authentication flow
    logSecureError('audit-log-error', error);
  }
}
```

**Key implementation details:**
- Extracts IP from x-forwarded-for header (proxy support)
- Extracts user agent from headers
- Errors logged but don't throw (don't break auth)
- JSONB details field for flexible context

### Step 3: Integrate into Authentication Actions

**File:** `lib/actions/auth.ts` (modify)

Import and use audit logger:

```typescript
import { logAuditEvent } from '@/lib/audit/logger';

export async function login(prevState: any, formData: FormData) {
  const result = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  if (!result.success) {
    await logAuditEvent({
      action: 'login_failed',
      resource: 'authentication',
      success: false,
      details: { reason: 'validation_failed' }
    });
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  const { username, password } = result.data;

  const user = await queryOne<User>(
    'SELECT id, username, password_hash, session_version FROM users WHERE username = $1',
    [username]
  );

  if (!user) {
    await logAuditEvent({
      action: 'login_failed',
      resource: 'authentication',
      success: false,
      details: { username, reason: 'user_not_found' }
    });
    return { success: false, error: 'Invalid username or password' };
  }

  // ... timing-safe wrapper checks ...

  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    await logAuditEvent({
      userId: user.id,
      action: 'login_failed',
      resource: 'authentication',
      success: false,
      details: { username, reason: 'invalid_password' }
    });
    // ... rate limiting logic ...
    return { success: false, error: 'Invalid username or password' };
  }

  try {
    // Create session
    const oldSession = await getSession();
    await oldSession.destroy();

    const session = await getSession();
    session.userId = user.id;
    session.username = user.username;
    session.sessionVersion = user.session_version || 1;
    await session.save();

    // Log successful login
    await logAuditEvent({
      userId: user.id,
      action: 'login',
      resource: 'authentication',
      success: true,
      details: { username }
    });

    return { success: true };
  } catch (error) {
    logSecureError('login-session-error', error);
    return {
      success: false,
      error: 'Authentication failed',
    };
  }
}

export async function logout() {
  try {
    const session = await getSession();
    
    await logAuditEvent({
      userId: session.userId,
      action: 'logout',
      resource: 'authentication',
      success: true,
      details: { username: session.username }
    });
    
    session.destroy();
    redirect('/login');
  } catch (error) {
    logSecureError('logout-error', error);
    redirect('/login');
  }
}
```

**Changes made:**
- Added `logAuditEvent()` calls on login success/failure
- Added `logAuditEvent()` call on logout
- Included contextual details (reason, username)
- Logging failures don't break authentication flow

### Step 4: Add Session Logging (Optional Enhancement)

For completeness, you can also log session creation/destruction:

```typescript
// In login, after session.save():
await logAuditEvent({
  userId: user.id,
  action: 'session_created',
  resource: 'session',
  success: true,
  details: { username }
});

// In logout, after session.destroy():
await logAuditEvent({
  userId: session.userId,
  action: 'session_destroyed',
  resource: 'session',
  success: true,
  details: { username: session.username }
});
```

### Step 5: Create Unit Tests

**File:** `__tests__/audit/logger.test.ts` (new)

```typescript
import { logAuditEvent } from '@/lib/audit/logger';

describe('Audit Logging', () => {
  beforeAll(async () => {
    // Clean up test data
    await execute('DELETE FROM audit_log WHERE user_id = -1');
  });

  it('logs successful authentication', async () => {
    await logAuditEvent({
      userId: -1,
      action: 'login',
      resource: 'authentication',
      success: true,
      ipAddress: '192.168.1.1',
      userAgent: 'Test Agent',
      details: { username: 'testuser' }
    });

    const result = await queryOne(
      'SELECT * FROM audit_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [-1]
    );

    expect(result).toBeDefined();
    expect(result.action).toBe('login');
    expect(result.success).toBe(true);
    expect(result.ip_address).toBe('192.168.1.1');
    expect(result.user_agent).toBe('Test Agent');
  });

  it('logs failed authentication', async () => {
    await logAuditEvent({
      action: 'login_failed',
      resource: 'authentication',
      success: false,
      details: { username: 'invaliduser', reason: 'user_not_found' }
    });

    const result = await queryOne(
      'SELECT * FROM audit_log WHERE action = $1 AND success = $2 ORDER BY created_at DESC LIMIT 1',
      ['login_failed', false]
    );

    expect(result).toBeDefined();
    expect(result.action).toBe('login_failed');
    expect(result.success).toBe(false);
  });

  it('handles logging errors gracefully', async () => {
    // Mock execute to throw error
    const originalExecute = require('@/lib/db').execute;
    require('@/lib/db').execute = jest.fn().mockRejectedValue(new Error('DB Error'));

    // Should not throw
    await expect(
      logAuditEvent({
        action: 'login',
        resource: 'authentication',
        success: true,
      })
    ).resolves.not.toThrow();

    // Restore
    require('@/lib/db').execute = originalExecute;
  });
});
```

### Step 6: Create E2E Tests

**File:** `e2e/audit-logging.spec.ts` (new)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Audit Logging', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('logs successful login', async ({ page }) => {
    // Check audit log table (would need to access database directly)
    // In E2E tests, you might verify via admin dashboard or API endpoint
    // For now, this is a placeholder for E2E verification
  });

  test('logs failed login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Verify error shown
    await expect(page.locator('text=Invalid')).toBeVisible();

    // Verify audit log created (via DB check or API)
  });

  test('logs logout', async ({ page }) => {
    await page.goto('/logout');
    await page.waitForURL('/login');

    // Verify audit log created
  });
});
```

**Note:** E2E tests require database access or API endpoint to verify audit logs. This is a simplified structure.

### Step 7: Create Security Monitoring Queries

**File:** `docs/queries/security-monitoring.sql` (new)

Create a collection of useful SQL queries for security monitoring:

```sql
-- Failed login attempts per IP (last 24 hours)
SELECT
  ip_address,
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt,
  MIN(created_at) as first_attempt
FROM audit_log
WHERE
  action = 'login_failed'
  AND ip_address IS NOT NULL
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY COUNT(*) DESC
LIMIT 20;

-- Failed login attempts per user (last 24 hours)
SELECT
  u.username,
  COUNT(*) as failed_attempts,
  MAX(al.created_at) as last_attempt
FROM audit_log al
JOIN users u ON al.user_id = u.id
WHERE
  al.action = 'login_failed'
  AND al.created_at > NOW() - INTERVAL '24 hours'
GROUP BY u.username
HAVING COUNT(*) > 3
ORDER BY COUNT(*) DESC;

-- Successful logins per IP (last 7 days)
SELECT
  ip_address,
  COUNT(*) as logins,
  MAX(created_at) as last_login
FROM audit_log
WHERE
  action = 'login'
  AND success = true
  AND ip_address IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY ip_address
ORDER BY COUNT(*) DESC
LIMIT 20;

-- Recent authentication events (last 100)
SELECT
  created_at,
  action,
  success,
  u.username,
  ip_address,
  user_agent,
  details
FROM audit_log al
LEFT JOIN users u ON al.user_id = u.id
WHERE
  resource = 'authentication'
ORDER BY created_at DESC
LIMIT 100;
```

### Step 8: Update Documentation

**File:** `docs/SECURITY_AUDIT_LOGGING.md` (new)

```markdown
# Audit Logging and Security Monitoring

## Overview

The application maintains an immutable audit log of authentication events for security monitoring and forensic analysis.

## Audit Events

### Authentication Events

| Action | Description |
|--------|-------------|
| `login` | Successful user authentication |
| `login_failed` | Failed login attempt |
| `logout` | User logout |
| `session_created` | Session establishment |
| `session_destroyed` | Session termination |

## Schema

Table: `audit_log`

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `user_id` | INTEGER | User reference (nullable for failed attempts) |
| `action` | VARCHAR(50) | Event type |
| `resource` | VARCHAR(50) | Resource type (authentication, session) |
| `resource_id` | INTEGER | Resource ID |
| `success` | BOOLEAN | Event outcome |
| `ip_address` | VARCHAR(45) | Client IP address |
| `user_agent` | TEXT | Client user agent |
| `details` | JSONB | Contextual details |
| `created_at` | TIMESTAMP | Event timestamp |

## Security Monitoring

### Daily Checks

1. **Failed login attempts per IP**: >10 failed attempts in 24h
2. **Failed login attempts per user**: >5 failed attempts in 24h
3. **Unusual locations**: Successful logins from new IP addresses
4. **Failed login rate**: >50% failure rate indicates attack

### Queries

See `docs/queries/security-monitoring.sql` for pre-built queries.

## Compliance

### SOC 2
- CC6.3: Monitor for anomalies
- CC7.2: Test system logs

### GDPR
- Article 30: Records of processing
- Article 33: Breach notification (audit logs)

### PCI DSS
- Requirement 10: Audit trails
- Requirement 10.2: Audit components
- Requirement 10.2.3: Success/failure indication

## Privacy

Audit logs contain personal data (IP addresses):
- Retention policy: 90 days (configurable)
- Access restricted to authorized personnel
- Anonymization available for archiving

## Maintenance

### Log Rotation
```sql
-- Delete logs older than retention period
DELETE FROM audit_log
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Archive Logs (Optional)
```sql
-- Export to CSV then delete
COPY (
  SELECT * FROM audit_log
  WHERE created_at < NOW() - INTERVAL '90 days'
) TO '/path/to/audit_log_archive.csv' WITH CSV HEADER;

DELETE FROM audit_log
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Table Cleanup
```sql
-- Vacuum to reclaim space
VACUUM FULL audit_log;
```
```

### Step 9: Local Testing Checklist

Before committing:

- [ ] Create `lib/db/migrations/003_add_audit_log.sql`
- [ ] Run migration: `psql $POSTGRES_URL -f lib/db/migrations/003_add_audit_log.sql`
- [ ] Verify table created: `psql $POSTGRES_URL -c "\d audit_log"`
- [ ] Create `lib/audit/logger.ts`
- [ ] Integrate into `lib/actions/auth.ts`
- [ ] Create `__tests__/audit/logger.test.ts`
- [ ] Create `e2e/audit-logging.spec.ts`
- [ ] Create security queries in `docs/queries/security-monitoring.sql`
- [ ] Create documentation in `docs/SECURITY_AUDIT_LOGGING.md`
- [ ] Run `npm test` - all unit tests pass
- [ ] Run `npm run test:e2e` - all E2E tests pass
- [ ] Test login → check audit_log table for entry
- [ ] Test failed login → check audit_log table for entry
- [ ] Test logout → check audit_log table for entry
- [ ] Verify IP address captured correctly
- [ ] Verify user agent captured correctly

### Step 10: Create Feature Branch

```bash
git checkout -b feat/security-add-audit-logging
```

### Step 11: Commit Changes

```bash
git add .
git commit -m "feat: add audit logging for authentication events

- Create audit_log table with indexes
- Implement audit logger utility
- Log login, logout, and failed login attempts
- Store IP address, user agent, and contextual details
- Support forensics and compliance requirements
- Closes #19"
```

### Step 12: Deploy to Staging

```bash
git push -u origin feat/security-add-audit-logging
gh pr create --title "feat: add audit logging for authentication events" \
  --body "Implements audit logging for security monitoring (#19)"
```

**Staging verification:**
- Run migration in staging: `psql $STAGING_DB_URL -f lib/db/migrations/003_add_audit_log.sql`
- Deploy code changes
- Test login/logout flows
- Query audit_log table to verify entries:
  ```sql
  SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10;
  ```
- Verify IP addresses and user agents captured
- Monitor log growth rate

### Step 13: Production Deployment

**Pre-deployment:**
- Staging tests pass
- Document audit log retention policy
- Set up log rotation/cleanup job (cron job or database job)
- Monitor disk space for audit log growth

**Deployment:**
- Merge PR
- Run migration in production
- Monitor audit log growth rate
- Set up security monitoring queries to run daily
- Review audit logs for suspicious patterns
- Add security queries to monitoring dashboard (if available)

## Files Modified/Created

| File | Type | Action |
|------|------|--------|
| `lib/db/migrations/003_add_audit_log.sql` | New | Create |
| `lib/audit/logger.ts` | New | Create |
| `lib/actions/auth.ts` | Edit | Add audit logging |
| `__tests__/audit/logger.test.ts` | New | Create |
| `e2e/audit-logging.spec.ts` | New | Create |
| `docs/queries/security-monitoring.sql` | New | Create |
| `docs/SECURITY_AUDIT_LOGGING.md` | New | Create |

## Verification Commands

```bash
# Run migration
psql $POSTGRES_URL -f lib/db/migrations/003_add_audit_log.sql

# Verify table structure
psql $POSTGRES_URL -c "\d audit_log"

# Check indexes
psql $POSTGRES_URL -c "\di idx_audit_log*"

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Check audit log entries
psql $POSTGRES_URL -c "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10;"

# Failed logins per IP
psql $POSTGRES_URL -f docs/queries/security-monitoring.sql
```

## Success Criteria

- ✅ Audit log table created with appropriate indexes
- ✅ All authentication events logged (login, logout, login_failed)
- ✅ Audit entries contain IP address, user agent, details
- ✅ Audit logging failures handled gracefully
- ✅ All existing tests pass
- ✅ New audit logger tests pass
- ✅ New E2E tests pass
- ✅ Production deployment with monitoring
- ✅ Audit logs queryable for forensics
- ✅ Security queries documented and accessible

## Rollback Plan

If issues arise:

1. **Performance issues:** Remove audit logging calls from auth actions
2. **Compliance concerns:** Audit logs already created - can anonymize via SQL
3. **Complete removal:** Drop table and revert code changes
   ```sql
   DROP TABLE audit_log CASCADE;
   DROP INDEX IF EXISTS idx_audit_log_created_at;
   DROP INDEX IF EXISTS idx_audit_log_user_id;
   DROP INDEX IF EXISTS idx_audit_log_success;
   ```

## Performance Impact

**Estimated overhead:**
- Each audit log: ~1-5ms (INSERT query)
- Login flow: +1-5ms latency
- Negligible impact on user experience

**Storage:**
- Estimated growth: 100-1000 entries/day
- Estimated disk space: 10-100 MB/month
- Retention policy: 90 days → 1-10 GB max

## Future Enhancements

- Extend to transaction/account/category events
- Real-time alerting (email, Slack) on suspicious activity
- Admin dashboard for viewing audit logs
- Integration with SIEM (Splunk, ELK Stack)
- Automated log analysis and anomaly detection
- IP geolocation tracking
- Session hijacking detection (concurrent sessions from different IPs)
- Compliance report generation (SOC 2, GDPR, PCI DSS)
