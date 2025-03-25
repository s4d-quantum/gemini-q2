/*
  # Inventory Schema Setup

  1. New Tables
    - `tac_codes` - Device identification codes
    - `cellular_devices` - IMEI-based devices
    - `serial_devices` - Serial number devices
    - `parts` - Repair parts inventory
    - `accessories` - Device accessories

  2. Security
    - Enable RLS on all tables
    - Add policies for inventory management
    - Track all changes with created_by/updated_by

  3. Notes
    - Using ENUM types for status
    - Full audit trail with timestamps
    - Proper foreign key relationships
*/

-- Create ENUM types for device status
CREATE TYPE device_status AS ENUM (
  'in_stock',
  'sold',
  'returned',
  'quarantine',
  'repair',
  'qc_required',
  'qc_failed'
);

-- TAC Codes table
CREATE TABLE tac_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tac_code CHAR(8) NOT NULL UNIQUE,
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id),
  model_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT tac_code_format CHECK (tac_code ~ '^[0-9]{8}$')
);

CREATE INDEX idx_tac_codes_tac ON tac_codes(tac_code);

-- Cellular Devices (IMEI)
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

CREATE INDEX idx_cellular_devices_imei ON cellular_devices(imei);
CREATE INDEX idx_cellular_devices_status ON cellular_devices(status);

-- Serial Devices
CREATE TABLE serial_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  serial_number TEXT NOT NULL UNIQUE,
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id),
  model_name TEXT NOT NULL,
  color TEXT,
  grade_id SMALLINT REFERENCES product_grades(id),
  status device_status NOT NULL DEFAULT 'in_stock',
  location_id UUID REFERENCES storage_locations(id),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_serial_devices_serial ON serial_devices(serial_number);
CREATE INDEX idx_serial_devices_status ON serial_devices(status);

-- Parts
CREATE TABLE parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT NOT NULL UNIQUE,
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  location_id UUID REFERENCES storage_locations(id),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT positive_quantity CHECK (quantity >= 0)
);

CREATE INDEX idx_parts_sku ON parts(sku);

-- Accessories
CREATE TABLE accessories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT NOT NULL UNIQUE,
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id),
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  location_id UUID REFERENCES storage_locations(id),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT positive_quantity CHECK (quantity >= 0)
);

CREATE INDEX idx_accessories_sku ON accessories(sku);

-- Enable RLS
ALTER TABLE tac_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cellular_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE serial_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessories ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- TAC Codes
CREATE POLICY "Users can read TAC codes"
  ON tac_codes FOR SELECT
  TO authenticated
  USING (true);

-- Cellular Devices
CREATE POLICY "Users can read cellular devices"
  ON cellular_devices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage cellular devices"
  ON cellular_devices FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

-- Serial Devices
CREATE POLICY "Users can read serial devices"
  ON serial_devices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage serial devices"
  ON serial_devices FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

-- Parts
CREATE POLICY "Users can read parts"
  ON parts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage parts"
  ON parts FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

-- Accessories
CREATE POLICY "Users can read accessories"
  ON accessories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage accessories"
  ON accessories FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));
