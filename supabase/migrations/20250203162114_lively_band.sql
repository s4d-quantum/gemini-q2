/*
  # Update RLS policies for device management

  1. Changes
    - Add INSERT policies for cellular_devices and serial_devices tables
    - Allow authenticated users to create devices
    - Maintain existing read-only policies

  2. Security
    - Maintains existing RLS protection
    - Adds controlled device creation capabilities
*/

-- Update cellular devices policies
DROP POLICY IF EXISTS "Users can create cellular devices" ON cellular_devices;
CREATE POLICY "Users can create cellular devices"
  ON cellular_devices FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update serial devices policies
DROP POLICY IF EXISTS "Users can create serial devices" ON serial_devices;
CREATE POLICY "Users can create serial devices"
  ON serial_devices FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update TAC codes policies to allow creation
DROP POLICY IF EXISTS "Users can create TAC codes" ON tac_codes;
CREATE POLICY "Users can create TAC codes"
  ON tac_codes FOR INSERT
  TO authenticated
  WITH CHECK (true);
