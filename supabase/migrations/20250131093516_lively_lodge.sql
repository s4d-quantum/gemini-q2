/*
  # Create purchase order devices table

  1. New Tables
    - `purchase_order_devices`
      - Links purchase orders to cellular/serial devices
      - Tracks tray assignments and device-specific flags
      - Maintains QC/repair status per device

  2. Security
    - Enable RLS
    - Add policies for admins and users
*/

-- Create junction table for purchase orders and devices
CREATE TABLE purchase_order_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
  cellular_device_id UUID REFERENCES cellular_devices(id),
  serial_device_id UUID REFERENCES serial_devices(id),
  tray_id TEXT,
  qc_required BOOLEAN NOT NULL DEFAULT false,
  qc_completed BOOLEAN NOT NULL DEFAULT false,
  repair_required BOOLEAN NOT NULL DEFAULT false,
  repair_completed BOOLEAN NOT NULL DEFAULT false,
  return_tag BOOLEAN NOT NULL DEFAULT false,
  unit_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_device_type CHECK (
    (cellular_device_id IS NOT NULL AND serial_device_id IS NULL) OR
    (cellular_device_id IS NULL AND serial_device_id IS NOT NULL)
  )
);

-- Add indexes
CREATE INDEX idx_po_devices_purchase_order ON purchase_order_devices(purchase_order_id);
CREATE INDEX idx_po_devices_cellular ON purchase_order_devices(cellular_device_id);
CREATE INDEX idx_po_devices_serial ON purchase_order_devices(serial_device_id);
CREATE INDEX idx_po_devices_tray ON purchase_order_devices(tray_id);

-- Enable RLS
ALTER TABLE purchase_order_devices ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can read purchase order devices"
  ON purchase_order_devices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage purchase order devices"
  ON purchase_order_devices FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));
