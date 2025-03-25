/*
  # Fix model suggestions function

  1. Changes
    - Drop existing function to avoid overloading issues
    - Recreate function with correct UUID parameter type
    - Ensure indexes exist for performance
*/

-- Drop existing functions to avoid overloading
DROP FUNCTION IF EXISTS fn_search_models_by_manufacturer(TEXT, TEXT);
DROP FUNCTION IF EXISTS fn_search_models_by_manufacturer(UUID, TEXT);

-- Add indexes for faster model suggestions if they don't exist
CREATE INDEX IF NOT EXISTS idx_tac_codes_model ON tac_codes(model_name);
CREATE INDEX IF NOT EXISTS idx_tac_codes_manufacturer_model ON tac_codes(manufacturer_id, model_name);

-- Recreate function with correct parameter type
CREATE OR REPLACE FUNCTION fn_search_models_by_manufacturer(
  p_manufacturer_id UUID,
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
