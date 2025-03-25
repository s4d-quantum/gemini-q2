-- Create trigger function for cellular device transactions
CREATE OR REPLACE FUNCTION trg_cellular_device_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For new devices (INSERT)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO cellular_device_transactions (
      device_id,
      transaction_type,
      reference_id,
      previous_status,
      new_status,
      notes,
      created_by
    ) VALUES (
      NEW.id,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM purchase_order_devices 
          WHERE cellular_device_id = NEW.id
        ) THEN 'purchase'::transaction_type
        ELSE 'transfer'::transaction_type
      END,
      NEW.id,
      NULL,
      NEW.status,
      'Device created',
      NEW.created_by
    );
  END IF;

  -- For updates
  IF TG_OP = 'UPDATE' THEN
    -- Status change
    IF OLD.status != NEW.status THEN
      INSERT INTO cellular_device_transactions (
        device_id,
        transaction_type,
        reference_id,
        previous_status,
        new_status,
        notes,
        created_by
      ) VALUES (
        NEW.id,
        CASE
          WHEN NEW.status = 'sold' THEN 'sale'::transaction_type
          WHEN NEW.status = 'returned' THEN 'return_in'::transaction_type
          WHEN NEW.status = 'repair' THEN 'repair'::transaction_type
          WHEN NEW.status = 'qc_required' THEN 'qc'::transaction_type
          ELSE 'transfer'::transaction_type
        END,
        NEW.id,
        OLD.status,
        NEW.status,
        CASE
          WHEN NEW.status = 'qc_required' THEN 
            CASE 
              WHEN NEW.qc_status IS NOT NULL THEN 
                'QC ' || NEW.qc_status || ': ' || COALESCE(NEW.qc_comments, '')
              ELSE 'Pending QC'
            END
          WHEN NEW.status = 'repair' THEN 
            CASE 
              WHEN NEW.repair_completed THEN 'Repair completed'
              ELSE 'Repair required'
            END
          ELSE NULL
        END,
        NEW.updated_by
      );
    END IF;

    -- QC status change
    IF (OLD.qc_status IS NULL AND NEW.qc_status IS NOT NULL) OR 
       (OLD.qc_status IS NOT NULL AND NEW.qc_status != OLD.qc_status) THEN
      INSERT INTO cellular_device_transactions (
        device_id,
        transaction_type,
        reference_id,
        previous_status,
        new_status,
        notes,
        created_by
      ) VALUES (
        NEW.id,
        'qc'::transaction_type,
        NEW.id,
        NEW.status,
        NEW.status,
        'QC ' || NEW.qc_status || ': ' || COALESCE(NEW.qc_comments, ''),
        NEW.updated_by
      );
    END IF;

    -- Repair status change
    IF OLD.repair_completed != NEW.repair_completed THEN
      INSERT INTO cellular_device_transactions (
        device_id,
        transaction_type,
        reference_id,
        previous_status,
        new_status,
        notes,
        created_by
      ) VALUES (
        NEW.id,
        'repair'::transaction_type,
        NEW.id,
        NEW.status,
        NEW.status,
        CASE 
          WHEN NEW.repair_completed THEN 'Repair completed'
          ELSE 'Repair started'
        END,
        NEW.updated_by
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger function for serial device transactions
CREATE OR REPLACE FUNCTION trg_serial_device_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For new devices (INSERT)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO serial_device_transactions (
      device_id,
      transaction_type,
      reference_id,
      previous_status,
      new_status,
      notes,
      created_by
    ) VALUES (
      NEW.id,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM purchase_order_devices 
          WHERE serial_device_id = NEW.id
        ) THEN 'purchase'::transaction_type
        ELSE 'transfer'::transaction_type
      END,
      NEW.id,
      NULL,
      NEW.status,
      'Device created',
      NEW.created_by
    );
  END IF;

  -- For updates
  IF TG_OP = 'UPDATE' THEN
    -- Status change
    IF OLD.status != NEW.status THEN
      INSERT INTO serial_device_transactions (
        device_id,
        transaction_type,
        reference_id,
        previous_status,
        new_status,
        notes,
        created_by
      ) VALUES (
        NEW.id,
        CASE
          WHEN NEW.status = 'sold' THEN 'sale'::transaction_type
          WHEN NEW.status = 'returned' THEN 'return_in'::transaction_type
          WHEN NEW.status = 'repair' THEN 'repair'::transaction_type
          WHEN NEW.status = 'qc_required' THEN 'qc'::transaction_type
          ELSE 'transfer'::transaction_type
        END,
        NEW.id,
        OLD.status,
        NEW.status,
        CASE
          WHEN NEW.status = 'qc_required' THEN 
            CASE 
              WHEN NEW.qc_status IS NOT NULL THEN 
                'QC ' || NEW.qc_status || ': ' || COALESCE(NEW.qc_comments, '')
              ELSE 'Pending QC'
            END
          WHEN NEW.status = 'repair' THEN 
            CASE 
              WHEN NEW.repair_completed THEN 'Repair completed'
              ELSE 'Repair required'
            END
          ELSE NULL
        END,
        NEW.updated_by
      );
    END IF;

    -- QC status change
    IF (OLD.qc_status IS NULL AND NEW.qc_status IS NOT NULL) OR 
       (OLD.qc_status IS NOT NULL AND NEW.qc_status != OLD.qc_status) THEN
      INSERT INTO serial_device_transactions (
        device_id,
        transaction_type,
        reference_id,
        previous_status,
        new_status,
        notes,
        created_by
      ) VALUES (
        NEW.id,
        'qc'::transaction_type,
        NEW.id,
        NEW.status,
        NEW.status,
        'QC ' || NEW.qc_status || ': ' || COALESCE(NEW.qc_comments, ''),
        NEW.updated_by
      );
    END IF;

    -- Repair status change
    IF OLD.repair_completed != NEW.repair_completed THEN
      INSERT INTO serial_device_transactions (
        device_id,
        transaction_type,
        reference_id,
        previous_status,
        new_status,
        notes,
        created_by
      ) VALUES (
        NEW.id,
        'repair'::transaction_type,
        NEW.id,
        NEW.status,
        NEW.status,
        CASE 
          WHEN NEW.repair_completed THEN 'Repair completed'
          ELSE 'Repair started'
        END,
        NEW.updated_by
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trg_cellular_device_transaction ON cellular_devices;
CREATE TRIGGER trg_cellular_device_transaction
  AFTER INSERT OR UPDATE ON cellular_devices
  FOR EACH ROW
  EXECUTE FUNCTION trg_cellular_device_transaction();

DROP TRIGGER IF EXISTS trg_serial_device_transaction ON serial_devices;
CREATE TRIGGER trg_serial_device_transaction
  AFTER INSERT OR UPDATE ON serial_devices
  FOR EACH ROW
  EXECUTE FUNCTION trg_serial_device_transaction();
