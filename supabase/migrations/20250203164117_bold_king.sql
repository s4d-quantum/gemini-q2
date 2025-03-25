-- Update purchase order devices policies
DROP POLICY IF EXISTS "Users can create purchase order devices" ON purchase_order_devices;
CREATE POLICY "Users can create purchase order devices"
  ON purchase_order_devices FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update purchase order devices planned policies
DROP POLICY IF EXISTS "Users can create planned devices" ON purchase_order_devices_planned;
CREATE POLICY "Users can create planned devices"
  ON purchase_order_devices_planned FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_po_devices_cellular_device ON purchase_order_devices(cellular_device_id);
CREATE INDEX IF NOT EXISTS idx_po_devices_serial_device ON purchase_order_devices(serial_device_id);
CREATE INDEX IF NOT EXISTS idx_po_devices_created_by ON purchase_order_devices(created_by);
CREATE INDEX IF NOT EXISTS idx_po_devices_updated_by ON purchase_order_devices(updated_by);
