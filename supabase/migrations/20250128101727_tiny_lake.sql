/*
  # Transaction and Order Tables

  1. New Tables
    - `purchase_orders` - Track incoming inventory
    - `sales_orders` - Track outgoing inventory
    - `cellular_device_transactions` - IMEI device history
    - `serial_device_transactions` - Serial device history
    - `part_transactions` - Parts inventory changes
    - `accessory_transactions` - Accessories inventory changes

  2. Security
    - Enable RLS on all tables
    - Add policies for transaction management
    - Full audit trail with created_by/updated_by

  3. Notes
    - Using ENUM types for transaction types
    - Tracking all inventory movements
    - Maintaining referential integrity
*/

-- Create ENUM types for order and transaction status
CREATE TYPE order_status AS ENUM (
  'draft',
  'pending',
  'processing',
  'complete',
  'cancelled'
);

CREATE TYPE transaction_type AS ENUM (
  'purchase',
  'sale',
  'return_in',
  'return_out',
  'repair',
  'qc',
  'transfer'
);

-- Purchase Orders
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status order_status NOT NULL DEFAULT 'draft',
  requires_qc BOOLEAN NOT NULL DEFAULT false,
  requires_repair BOOLEAN NOT NULL DEFAULT false,
  priority SMALLINT DEFAULT 3,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_priority CHECK (priority BETWEEN 1 AND 5)
);

CREATE INDEX idx_purchase_orders_number ON purchase_orders(po_number);
CREATE INDEX idx_purchase_orders_date ON purchase_orders(order_date);

-- Sales Orders
CREATE TABLE sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status order_status NOT NULL DEFAULT 'draft',
  tracking_number TEXT,
  shipping_carrier TEXT,
  total_boxes INTEGER,
  total_pallets INTEGER,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT positive_boxes CHECK (total_boxes >= 0),
  CONSTRAINT positive_pallets CHECK (total_pallets >= 0)
);

CREATE INDEX idx_sales_orders_number ON sales_orders(order_number);
CREATE INDEX idx_sales_orders_date ON sales_orders(order_date);

-- Cellular Device Transactions
CREATE TABLE cellular_device_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES cellular_devices(id),
  transaction_type transaction_type NOT NULL,
  reference_id UUID NOT NULL, -- PO or SO ID
  previous_status device_status NOT NULL,
  new_status device_status NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cellular_transactions_device ON cellular_device_transactions(device_id);
CREATE INDEX idx_cellular_transactions_type ON cellular_device_transactions(transaction_type);
CREATE INDEX idx_cellular_transactions_date ON cellular_device_transactions(created_at);

-- Serial Device Transactions
CREATE TABLE serial_device_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES serial_devices(id),
  transaction_type transaction_type NOT NULL,
  reference_id UUID NOT NULL, -- PO or SO ID
  previous_status device_status NOT NULL,
  new_status device_status NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_serial_transactions_device ON serial_device_transactions(device_id);
CREATE INDEX idx_serial_transactions_type ON serial_device_transactions(transaction_type);
CREATE INDEX idx_serial_transactions_date ON serial_device_transactions(created_at);

-- Part Transactions
CREATE TABLE part_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_id UUID NOT NULL REFERENCES parts(id),
  transaction_type transaction_type NOT NULL,
  reference_id UUID NOT NULL, -- PO or SO ID
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_quantities CHECK (
    previous_quantity >= 0 AND
    new_quantity >= 0 AND
    ABS(new_quantity - previous_quantity) = ABS(quantity)
  )
);

CREATE INDEX idx_part_transactions_part ON part_transactions(part_id);
CREATE INDEX idx_part_transactions_type ON part_transactions(transaction_type);
CREATE INDEX idx_part_transactions_date ON part_transactions(created_at);

-- Accessory Transactions
CREATE TABLE accessory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  accessory_id UUID NOT NULL REFERENCES accessories(id),
  transaction_type transaction_type NOT NULL,
  reference_id UUID NOT NULL, -- PO or SO ID
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_quantities CHECK (
    previous_quantity >= 0 AND
    new_quantity >= 0 AND
    ABS(new_quantity - previous_quantity) = ABS(quantity)
  )
);

CREATE INDEX idx_accessory_transactions_accessory ON accessory_transactions(accessory_id);
CREATE INDEX idx_accessory_transactions_type ON accessory_transactions(transaction_type);
CREATE INDEX idx_accessory_transactions_date ON accessory_transactions(created_at);

-- Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cellular_device_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE serial_device_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Purchase Orders
CREATE POLICY "Users can read purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage purchase orders"
  ON purchase_orders FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

-- Sales Orders
CREATE POLICY "Users can read sales orders"
  ON sales_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage sales orders"
  ON sales_orders FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

-- Transaction Tables Policies
CREATE POLICY "Users can read transactions"
  ON cellular_device_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read transactions"
  ON serial_device_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read transactions"
  ON part_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read transactions"
  ON accessory_transactions FOR SELECT
  TO authenticated
  USING (true);

-- Only system can create transactions (through functions/triggers)
CREATE POLICY "System only transactions"
  ON cellular_device_transactions FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "System only transactions"
  ON serial_device_transactions FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "System only transactions"
  ON part_transactions FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "System only transactions"
  ON accessory_transactions FOR INSERT
  TO authenticated
  WITH CHECK (false);
