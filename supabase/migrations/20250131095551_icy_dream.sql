/*
  # Update suppliers RLS policy

  1. Changes
    - Replace existing suppliers SELECT policy with a new one that allows all authenticated users to read suppliers
    - Keep the admin-only policy for INSERT/UPDATE/DELETE operations

  2. Security
    - All authenticated users can read suppliers
    - Only admins can modify suppliers
*/

-- Drop the existing SELECT policy
DROP POLICY "Admins can read all suppliers" ON suppliers;

-- Create new SELECT policy for all authenticated users
CREATE POLICY "Users can read suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);
