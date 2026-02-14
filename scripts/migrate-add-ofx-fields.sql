-- Migration: Add OFX import fields to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ofx_fitid VARCHAR(255);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ofx_memo VARCHAR(500);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ofx_refnum VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_transactions_ofx_fitid ON transactions(ofx_fitid);