/*
  # Update purchase orders RLS policy

  1. Changes
    - Add RLS policy for authenticated users to create purchase orders
    - Keep existing policies for reading and admin management

  2. Security
    - All authenticated users can create purchase orders
    - All authenticated users can read purchase orders (existing policy)
    - Only admins can manage (update/delete) purchase orders (existing policy)
*/

-- Add policy for creating purchase orders
CREATE POLICY "Users can create purchase orders"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);
