-- Add account lockout columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;

-- Index for lockout queries
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;

-- Index for failed attempts tracking
CREATE INDEX IF NOT EXISTS idx_users_failed_attempts ON users(failed_login_attempts) WHERE failed_login_attempts > 0;
