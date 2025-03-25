-- Create sales order devices table
CREATE TABLE sales_order_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id),
  cellular_device_id UUID REFERENCES cellular_devices(id),
  serial_device_id UUID REFERENCES serial_devices(id),
  qc_required BOOLEAN NOT NULL DEFAULT false,
  qc_completed BOOLEAN NOT NULL DEFAULT false,
  qc_status TEXT CHECK (qc_status IN ('pass', 'fail')),
  repair_required BOOLEAN NOT NULL DEFAULT false,
  repair_completed BOOLEAN NOT NULL DEFAULT false,
  qc_comments TEXT,
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
CREATE INDEX idx_so_devices_sales_order ON sales_order_devices(sales_order_id);
CREATE INDEX idx_so_devices_cellular ON sales_order_devices(cellular_device_id);
CREATE INDEX idx_so_devices_serial ON sales_order_devices(serial_device_id);
CREATE INDEX idx_so_devices_created_by ON sales_order_devices(created_by);
CREATE INDEX idx_so_devices_updated_by ON sales_order_devices(updated_by);

-- Enable RLS
ALTER TABLE sales_order_devices ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can read sales order devices"
  ON sales_order_devices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create sales order devices"
  ON sales_order_devices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update sales order devices"
  ON sales_order_devices FOR UPDATE
  TO authenticated
  USING (true);

-- Add QC fields to devices tables
ALTER TABLE cellular_devices
ADD COLUMN qc_required BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN qc_completed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN qc_status TEXT CHECK (qc_status IN ('pass', 'fail')),
ADD COLUMN repair_required BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN repair_completed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN qc_comments TEXT;

ALTER TABLE serial_devices
ADD COLUMN qc_required BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN qc_completed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN qc_status TEXT CHECK (qc_status IN ('pass', 'fail')),
ADD COLUMN repair_required BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN repair_completed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN qc_comments TEXT;
