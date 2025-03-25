/*
  # Transaction Functions and Triggers

  1. Functions
    - `fn_create_cellular_transaction` - Records cellular device status changes
    - `fn_create_serial_transaction` - Records serial device status changes
    - `fn_create_part_transaction` - Records part quantity changes
    - `fn_create_accessory_transaction` - Records accessory quantity changes

  2. Triggers
    - Cellular devices status change tracking
    - Serial devices status change tracking
    - Parts quantity change tracking
    - Accessories quantity change tracking

  3. Notes
    - All functions run with security definer
    - Triggers maintain audit trail automatically
    - Validates all changes before recording
*/

-- Function to handle cellular device transactions
CREATE OR REPLACE FUNCTION fn_create_cellular_transaction(
  device_id UUID,
  trans_type transaction_type,
  ref_id UUID,
  prev_status device_status,
  new_status device_status,
  notes TEXT,
  user_id UUID
) RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  transaction_id UUID;
BEGIN
  -- Validate inputs
  IF device_id IS NULL OR trans_type IS NULL OR ref_id IS NULL OR user_id IS NULL THEN
    RAISE EXCEPTION 'Required parameters cannot be null';
  END IF;

  -- Create transaction record
  INSERT INTO cellular_device_transactions (
    device_id,
    transaction_type,
    reference_id,
    previous_status,
    new_status,
    notes,
    created_by
  ) VALUES (
    device_id,
    trans_type,
    ref_id,
    prev_status,
    new_status,
    notes,
    user_id
  ) RETURNING id INTO transaction_id;

  RETURN transaction_id;
END;
$$;

-- Function to handle serial device transactions
CREATE OR REPLACE FUNCTION fn_create_serial_transaction(
  device_id UUID,
  trans_type transaction_type,
  ref_id UUID,
  prev_status device_status,
  new_status device_status,
  notes TEXT,
  user_id UUID
) RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  transaction_id UUID;
BEGIN
  -- Validate inputs
  IF device_id IS NULL OR trans_type IS NULL OR ref_id IS NULL OR user_id IS NULL THEN
    RAISE EXCEPTION 'Required parameters cannot be null';
  END IF;

  -- Create transaction record
  INSERT INTO serial_device_transactions (
    device_id,
    transaction_type,
    reference_id,
    previous_status,
    new_status,
    notes,
    created_by
  ) VALUES (
    device_id,
    trans_type,
    ref_id,
    prev_status,
    new_status,
    notes,
    user_id
  ) RETURNING id INTO transaction_id;

  RETURN transaction_id;
END;
$$;

-- Function to handle part transactions
CREATE OR REPLACE FUNCTION fn_create_part_transaction(
  part_id UUID,
  trans_type transaction_type,
  ref_id UUID,
  qty INTEGER,
  prev_qty INTEGER,
  new_qty INTEGER,
  notes TEXT,
  user_id UUID
) RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  transaction_id UUID;
BEGIN
  -- Validate inputs
  IF part_id IS NULL OR trans_type IS NULL OR ref_id IS NULL OR user_id IS NULL THEN
    RAISE EXCEPTION 'Required parameters cannot be null';
  END IF;

  -- Validate quantities
  IF new_qty < 0 THEN
    RAISE EXCEPTION 'New quantity cannot be negative';
  END IF;

  IF ABS(new_qty - prev_qty) != ABS(qty) THEN
    RAISE EXCEPTION 'Quantity change mismatch';
  END IF;

  -- Create transaction record
  INSERT INTO part_transactions (
    part_id,
    transaction_type,
    reference_id,
    quantity,
    previous_quantity,
    new_quantity,
    notes,
    created_by
  ) VALUES (
    part_id,
    trans_type,
    ref_id,
    qty,
    prev_qty,
    new_qty,
    notes,
    user_id
  ) RETURNING id INTO transaction_id;

  RETURN transaction_id;
END;
$$;

-- Function to handle accessory transactions
CREATE OR REPLACE FUNCTION fn_create_accessory_transaction(
  accessory_id UUID,
  trans_type transaction_type,
  ref_id UUID,
  qty INTEGER,
  prev_qty INTEGER,
  new_qty INTEGER,
  notes TEXT,
  user_id UUID
) RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  transaction_id UUID;
BEGIN
  -- Validate inputs
  IF accessory_id IS NULL OR trans_type IS NULL OR ref_id IS NULL OR user_id IS NULL THEN
    RAISE EXCEPTION 'Required parameters cannot be null';
  END IF;

  -- Validate quantities
  IF new_qty < 0 THEN
    RAISE EXCEPTION 'New quantity cannot be negative';
  END IF;

  IF ABS(new_qty - prev_qty) != ABS(qty) THEN
    RAISE EXCEPTION 'Quantity change mismatch';
  END IF;

  -- Create transaction record
  INSERT INTO accessory_transactions (
    accessory_id,
    transaction_type,
    reference_id,
    quantity,
    previous_quantity,
    new_quantity,
    notes,
    created_by
  ) VALUES (
    accessory_id,
    trans_type,
    ref_id,
    qty,
    prev_qty,
    new_qty,
    notes,
    user_id
  ) RETURNING id INTO transaction_id;

  RETURN transaction_id;
END;
$$;

-- Trigger for cellular device status changes
CREATE OR REPLACE FUNCTION trg_cellular_device_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create transaction if status changed
  IF OLD.status != NEW.status THEN
    PERFORM fn_create_cellular_transaction(
      NEW.id,
      CASE
        WHEN NEW.status = 'sold' THEN 'sale'::transaction_type
        WHEN NEW.status = 'returned' THEN 'return_in'::transaction_type
        WHEN NEW.status = 'repair' THEN 'repair'::transaction_type
        WHEN NEW.status = 'qc_required' THEN 'qc'::transaction_type
        ELSE 'transfer'::transaction_type
      END,
      NEW.id, -- Using device ID as reference when no specific order
      OLD.status,
      NEW.status,
      NULL,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_cellular_device_update
  AFTER UPDATE OF status ON cellular_devices
  FOR EACH ROW
  EXECUTE FUNCTION trg_cellular_device_status_change();

-- Trigger for serial device status changes
CREATE OR REPLACE FUNCTION trg_serial_device_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create transaction if status changed
  IF OLD.status != NEW.status THEN
    PERFORM fn_create_serial_transaction(
      NEW.id,
      CASE
        WHEN NEW.status = 'sold' THEN 'sale'::transaction_type
        WHEN NEW.status = 'returned' THEN 'return_in'::transaction_type
        WHEN NEW.status = 'repair' THEN 'repair'::transaction_type
        WHEN NEW.status = 'qc_required' THEN 'qc'::transaction_type
        ELSE 'transfer'::transaction_type
      END,
      NEW.id, -- Using device ID as reference when no specific order
      OLD.status,
      NEW.status,
      NULL,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_serial_device_update
  AFTER UPDATE OF status ON serial_devices
  FOR EACH ROW
  EXECUTE FUNCTION trg_serial_device_status_change();

-- Trigger for parts quantity changes
CREATE OR REPLACE FUNCTION trg_part_quantity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create transaction if quantity changed
  IF OLD.quantity != NEW.quantity THEN
    PERFORM fn_create_part_transaction(
      NEW.id,
      CASE
        WHEN NEW.quantity > OLD.quantity THEN 'purchase'::transaction_type
        ELSE 'sale'::transaction_type
      END,
      NEW.id, -- Using part ID as reference when no specific order
      ABS(NEW.quantity - OLD.quantity),
      OLD.quantity,
      NEW.quantity,
      NULL,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_part_update
  AFTER UPDATE OF quantity ON parts
  FOR EACH ROW
  EXECUTE FUNCTION trg_part_quantity_change();

-- Trigger for accessories quantity changes
CREATE OR REPLACE FUNCTION trg_accessory_quantity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create transaction if quantity changed
  IF OLD.quantity != NEW.quantity THEN
    PERFORM fn_create_accessory_transaction(
      NEW.id,
      CASE
        WHEN NEW.quantity > OLD.quantity THEN 'purchase'::transaction_type
        ELSE 'sale'::transaction_type
      END,
      NEW.id, -- Using accessory ID as reference when no specific order
      ABS(NEW.quantity - OLD.quantity),
      OLD.quantity,
      NEW.quantity,
      NULL,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_accessory_update
  AFTER UPDATE OF quantity ON accessories
  FOR EACH ROW
  EXECUTE FUNCTION trg_accessory_quantity_change();
