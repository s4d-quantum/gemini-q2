/*
  # Add test suppliers

  1. Changes
    - Add initial test suppliers for development
  
  2. Data
    - Adds 5 test suppliers with realistic company names and supplier codes
*/

-- Insert test suppliers (using a system user ID for created_by)
INSERT INTO suppliers (supplier_code, name, email, phone, created_by) VALUES
  ('SUP001', 'TechTrade Solutions', 'orders@techtrade.com', '+44 20 1234 5678', (SELECT id FROM users LIMIT 1)),
  ('SUP002', 'Global Device Distributors', 'purchasing@gdd.com', '+1 212 555 0123', (SELECT id FROM users LIMIT 1)),
  ('SUP003', 'SmartPhone Wholesale Ltd', 'orders@spwholesale.co.uk', '+44 20 8765 4321', (SELECT id FROM users LIMIT 1)),
  ('SUP004', 'Mobile Parts Direct', 'sales@mobileparts.com', '+1 310 555 0123', (SELECT id FROM users LIMIT 1)),
  ('SUP005', 'Device Repair Supplies', 'orders@devicerepair.com', '+44 20 3456 7890', (SELECT id FROM users LIMIT 1));
