-- Create function to get cellular device details
CREATE OR REPLACE FUNCTION get_cellular_device_details(device_id UUID)
RETURNS TABLE (
    imei TEXT,
    manufacturer TEXT,
    model_name TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cd.imei, 
        tc.manufacturer, 
        tc.model_name
    FROM cellular_devices cd
    LEFT JOIN tac_codes tc ON cd.tac_id = tc.id
    WHERE cd.id = device_id;
END;
$$;
