/*
  # Fix TAC codes manufacturer_id column type

  1. Changes
    - Change manufacturer_id column in tac_codes table from text to uuid
    - Update foreign key constraint to properly reference manufacturers table

  2. Migration Steps
    - Create temporary column
    - Copy data with proper type conversion
    - Drop old column and constraints
    - Add new column with proper type
    - Add new foreign key constraint
*/

-- Step 1: Add new UUID column
ALTER TABLE tac_codes
ADD COLUMN manufacturer_id_new UUID;

-- Step 2: Update the new column with proper UUID values
UPDATE tac_codes t
SET manufacturer_id_new = m.id
FROM manufacturers m
WHERE m.manufacturer_id = t.manufacturer_id;

-- Step 3: Drop the old foreign key constraint
ALTER TABLE tac_codes
DROP CONSTRAINT tac_codes_manufacturer_id_fkey;

-- Step 4: Drop the old column
ALTER TABLE tac_codes
DROP COLUMN manufacturer_id;

-- Step 5: Add the new column with NOT NULL constraint
ALTER TABLE tac_codes
ADD COLUMN manufacturer_id UUID;

-- Step 6: Copy data from temporary column
UPDATE tac_codes
SET manufacturer_id = manufacturer_id_new;

-- Step 7: Set NOT NULL constraint
ALTER TABLE tac_codes
ALTER COLUMN manufacturer_id SET NOT NULL;

-- Step 8: Drop the temporary column
ALTER TABLE tac_codes
DROP COLUMN manufacturer_id_new;

-- Step 9: Add the new foreign key constraint
ALTER TABLE tac_codes
ADD CONSTRAINT tac_codes_manufacturer_id_fkey
FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id);

-- Step 10: Add index on manufacturer_id
CREATE INDEX idx_tac_codes_manufacturer ON tac_codes(manufacturer_id);
