/*
  # Add policy for creating sales orders

  1. Security
    - Add policy to allow authenticated users to create sales orders
*/

-- Add RLS policy for creating sales orders
CREATE POLICY "Users can create sales orders"
  ON sales_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);
