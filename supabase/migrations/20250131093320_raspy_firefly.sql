/*
  # Enhance purchase orders table

  1. Changes
    - Add tracking columns for QC and repair completion
    - Add columns for returns and unit confirmation
    - Add indexes for new columns

  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to purchase_orders
ALTER TABLE purchase_orders
ADD COLUMN qc_completed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN repair_completed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN purchase_return BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN has_return_tag BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN unit_confirmed BOOLEAN NOT NULL DEFAULT false;

-- Add indexes for commonly queried columns
CREATE INDEX idx_purchase_orders_qc ON purchase_orders(requires_qc, qc_completed);
CREATE INDEX idx_purchase_orders_repair ON purchase_orders(requires_repair, repair_completed);
CREATE INDEX idx_purchase_orders_return ON purchase_orders(purchase_return);
