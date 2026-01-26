-- Migration: Add session_version for session invalidation
-- Date: 2026-01-25
-- Purpose: Enable session invalidation on security events (password changes, suspicious activity)

-- Add session_version column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 1 NOT NULL;

-- Add index for faster session version lookups
CREATE INDEX IF NOT EXISTS idx_users_session_version ON users(id, session_version);

-- Add comment explaining the column
COMMENT ON COLUMN users.session_version IS 'Incremented on password changes and security events to invalidate existing sessions';
