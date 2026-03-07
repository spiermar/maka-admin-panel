-- Migration: Create unit occupancy status history
-- Date: 2026-03-07
-- Purpose: Add effective-date occupancy scheduling with overlap prevention

CREATE TABLE IF NOT EXISTS unit_occupancy_statuses (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  status unit_status NOT NULL CHECK (status IN ('Occupied', 'Vacant', 'Unavailable')),
  effective_date DATE NOT NULL,
  unavailable_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (unit_id, effective_date),
  CHECK (
    (status = 'Unavailable') OR unavailable_reason IS NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_unit_occupancy_statuses_unit_effective_date
  ON unit_occupancy_statuses (unit_id, effective_date DESC);
