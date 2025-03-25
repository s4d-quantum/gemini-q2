/*
  # Add indexes and policies to sales order devices

  1. Indexes
    - Add indexes for better query performance on commonly accessed fields
    - Add indexes for foreign keys and created/updated by fields

  2. Security
    - Add policies for authenticated users to read, create, and update records
*/

-- Add additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_so_devices_created_by ON sales_order_devices(created_by);
CREATE INDEX IF NOT EXISTS idx_so_devices_updated_by ON sales_order_devices(updated_by);
CREATE INDEX IF NOT EXISTS idx_so_devices_qc_status ON sales_order_devices(qc_status);
CREATE INDEX IF NOT EXISTS idx_so_devices_qc_required ON sales_order_devices(qc_required, qc_completed);
CREATE INDEX IF NOT EXISTS idx_so_devices_repair_required ON sales_order_devices(repair_required, repair_completed);

-- Add RLS policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sales_order_devices' 
    AND policyname = 'Users can read sales order devices'
  ) THEN
    CREATE POLICY "Users can read sales order devices"
      ON sales_order_devices FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sales_order_devices' 
    AND policyname = 'Users can create sales order devices'
  ) THEN
    CREATE POLICY "Users can create sales order devices"
      ON sales_order_devices FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sales_order_devices' 
    AND policyname = 'Users can update sales order devices'
  ) THEN
    CREATE POLICY "Users can update sales order devices"
      ON sales_order_devices FOR UPDATE
      TO authenticated
      USING (true);
  END IF;
END
$$;
