-- Add supplier tracking to devices
ALTER TABLE cellular_devices
ADD COLUMN supplier_id UUID REFERENCES suppliers(id);

ALTER TABLE serial_devices 
ADD COLUMN supplier_id UUID REFERENCES suppliers(id);

-- Add indexes for better query performance
CREATE INDEX idx_cellular_devices_supplier ON cellular_devices(supplier_id);
CREATE INDEX idx_serial_devices_supplier ON serial_devices(supplier_id);

-- Update the device booking functions to include supplier tracking
CREATE OR REPLACE FUNCTION fn_book_device_with_supplier(
  device_id UUID,
  device_type TEXT,
  supplier_id UUID,
  user_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF device_type = 'cellular' THEN
    UPDATE cellular_devices
    SET supplier_id = supplier_id,
        updated_by = user_id,
        updated_at = NOW()
    WHERE id = device_id;
  ELSE
    UPDATE serial_devices
    SET supplier_id = supplier_id,
        updated_by = user_id,
        updated_at = NOW()
    WHERE id = device_id;
  END IF;
END;
$$;
