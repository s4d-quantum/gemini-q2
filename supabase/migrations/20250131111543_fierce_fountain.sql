/*
  # Simplify model suggestions function

  1. Changes
    - Drop existing function to avoid overloading
    - Recreate function using text fields for simpler lookups
    - Keep indexes for performance
*/

-- Drop existing functions to avoid overloading
DROP FUNCTION IF EXISTS fn_search_models_by_manufacturer(TEXT, TEXT);
DROP FUNCTION IF EXISTS fn_search_models_by_manufacturer(UUID, TEXT);

-- Add indexes for faster model suggestions if they don't exist
CREATE INDEX IF NOT EXISTS idx_tac_codes_model ON tac_codes(model_name);
CREATE INDEX IF NOT EXISTS idx_tac_codes_manufacturer ON tac_codes(manufacturer_id);

-- Recreate function with text parameter
CREATE OR REPLACE FUNCTION fn_search_models_by_manufacturer(
  p_manufacturer_id TEXT,
  p_search TEXT DEFAULT NULL
) RETURNS TABLE (
  model_name TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT t.model_name
  FROM tac_codes t
  WHERE t.manufacturer_id = p_manufacturer_id
  AND (p_search IS NULL OR t.model_name ILIKE '%' || p_search || '%')
  ORDER BY t.model_name;
END;
$$;
