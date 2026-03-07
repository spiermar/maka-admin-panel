-- Migration: Create rentals inventory tables
-- Date: 2026-03-07
-- Purpose: Add Property -> Unit inventory model for residential rentals

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unit_status') THEN
    CREATE TYPE unit_status AS ENUM ('Occupied', 'Vacant', 'Unavailable');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_number VARCHAR(50) NOT NULL,
  building_label VARCHAR(100),
  unit_type VARCHAR(100) NOT NULL,
  bedrooms DECIMAL(4,1) NOT NULL CHECK (bedrooms >= 0),
  bathrooms DECIMAL(4,1) NOT NULL CHECK (bathrooms >= 0),
  status unit_status NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (property_id, unit_number)
);

CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
