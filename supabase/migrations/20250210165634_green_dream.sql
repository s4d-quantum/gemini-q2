-- Test function that returns the results directly
CREATE OR REPLACE FUNCTION test_get_cellular_device_details(test_id UUID)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    result_json TEXT;
BEGIN
    SELECT json_agg(row_to_json(t))::text INTO result_json
    FROM (
        SELECT * FROM get_cellular_device_details(test_id)
    ) t;
    
    RETURN COALESCE(result_json, '[]');
END;
$$;

-- Example usage:
-- SELECT test_get_cellular_device_details('49b27033-3780-41b5-87f4-0977d02a4a3a');
