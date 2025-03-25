-- Drop existing table
DROP TABLE IF EXISTS device_configurations;

-- Recreate with array columns and without unique constraint
CREATE TABLE device_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manufacturer TEXT NOT NULL,
  model_name TEXT NOT NULL,
  release_year INTEGER,
  available_colors TEXT[] NULL,
  storage_options INTEGER[] NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX idx_device_configs_manufacturer ON device_configurations(manufacturer);
CREATE INDEX idx_device_configs_model ON device_configurations(model_name);
CREATE INDEX idx_device_configs_combined ON device_configurations(manufacturer, model_name);

-- Enable RLS
ALTER TABLE device_configurations ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can read device configurations"
  ON device_configurations FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify configurations
CREATE POLICY "Admins can manage device configurations"
  ON device_configurations FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));
