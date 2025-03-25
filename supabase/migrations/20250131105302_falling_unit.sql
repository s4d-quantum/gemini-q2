-- Add indexes for faster model suggestions
CREATE INDEX IF NOT EXISTS idx_tac_codes_model ON tac_codes(model_name);
CREATE INDEX IF NOT EXISTS idx_tac_codes_manufacturer_model ON tac_codes(manufacturer_id, model_name);

-- Add function to search models by manufacturer
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
