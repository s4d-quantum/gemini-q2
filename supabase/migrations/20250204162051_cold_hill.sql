/*
  # Restructure TAC Codes Table
  
  1. Changes
    - Drop existing TAC codes table
    - Create new TAC codes table with updated structure
    - Add appropriate indexes and constraints
    - Enable RLS and add policies
  
  2. New Structure
    - tac_code (CHAR(8)) - The TAC/Type Allocation Code
    - manufacturer (TEXT) - Manufacturer name
    - model_name (TEXT) - Model name
    - model_no (TEXT) - Model number
    - manufacturer_id (TEXT) - Reference code (e.g., "CAT3")
*/

-- Drop existing table and dependencies
DROP TABLE IF EXISTS cellular_devices CASCADE;
DROP TABLE IF EXISTS tac_codes CASCADE;

-- Create new TAC codes table
CREATE TABLE tac_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tac_code CHAR(8) NOT NULL,
  manufacturer TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_no TEXT,
  manufacturer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT tac_code_format CHECK (tac_code ~ '^[0-9]{8}$')
);

-- Add indexes for performance
CREATE UNIQUE INDEX idx_tac_codes_tac ON tac_codes(tac_code);
CREATE INDEX idx_tac_codes_manufacturer ON tac_codes(manufacturer);
CREATE INDEX idx_tac_codes_model ON tac_codes(model_name);
CREATE INDEX idx_tac_codes_manufacturer_id ON tac_codes(manufacturer_id);

-- Enable RLS
ALTER TABLE tac_codes ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can read TAC codes"
  ON tac_codes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create TAC codes"
  ON tac_codes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Recreate cellular devices table
CREATE TABLE cellular_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imei TEXT NOT NULL UNIQUE,
  tac_id UUID NOT NULL REFERENCES tac_codes(id),
  color TEXT,
  storage_gb INTEGER,
  grade_id SMALLINT REFERENCES product_grades(id),
  status device_status NOT NULL DEFAULT 'in_stock',
  location_id UUID REFERENCES storage_locations(id),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT imei_format CHECK (imei ~ '^[0-9]{15}$')
);

-- Add indexes for cellular devices
CREATE INDEX idx_cellular_devices_imei ON cellular_devices(imei);
CREATE INDEX idx_cellular_devices_status ON cellular_devices(status);

-- Enable RLS for cellular devices
ALTER TABLE cellular_devices ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for cellular devices
CREATE POLICY "Users can read cellular devices"
  ON cellular_devices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create cellular devices"
  ON cellular_devices FOR INSERT
  TO authenticated
  WITH CHECK (true);
