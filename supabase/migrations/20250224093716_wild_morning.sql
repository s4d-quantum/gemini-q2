/*
  # Add policy for reading customers

  1. Security
    - Add policy to allow authenticated users to read customer records
*/

-- Add RLS policy for reading customers
CREATE POLICY "Users can read customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);
