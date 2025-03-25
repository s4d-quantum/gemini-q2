/*
  # Add planned devices table

  1. New Tables
    - `purchase_order_devices_planned`
      - `id` (uuid, primary key)
      - `purchase_order_id` (uuid, references purchase_orders)
      - `manufacturer_id` (uuid, references manufacturers)
      - `model_name` (text)
      - `storage_gb` (integer)
      - `color` (text)
      - `grade_id` (smallint, references product_grades)
      - `quantity` (integer)
      - `device_type` (text, either 'cellular' or 'serial')
      - `created_by` (uuid, references users)
      - `updated_by` (uuid, references users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users to read
    - Add policies for authenticated users to create
*/

-- Create planned devices table
CREATE TABLE purchase_order_devices_planned (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id),
  model_name TEXT NOT NULL,
  storage_gb INTEGER,
  color TEXT,
  grade_id SMALLINT REFERENCES product_grades(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  device_type TEXT NOT NULL CHECK (device_type IN ('cellular', 'serial')),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT positive_quantity CHECK (quantity > 0)
);

-- Add indexes
CREATE INDEX idx_planned_devices_po ON purchase_order_devices_planned(purchase_order_id);
CREATE INDEX idx_planned_devices_manufacturer ON purchase_order_devices_planned(manufacturer_id);
CREATE INDEX idx_planned_devices_type ON purchase_order_devices_planned(device_type);

-- Enable RLS
ALTER TABLE purchase_order_devices_planned ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can read planned devices"
  ON purchase_order_devices_planned FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create planned devices"
  ON purchase_order_devices_planned FOR INSERT
  TO authenticated
  WITH CHECK (true);
