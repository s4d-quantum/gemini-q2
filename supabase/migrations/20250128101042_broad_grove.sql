/*
  # Core Schema Setup

  1. New Tables
    - `users` - Extended user profile data
    - `suppliers` - Supplier information
    - `customers` - Customer information
    - `manufacturers` - Product manufacturers
    - `storage_locations` - Inventory storage locations
    - `product_grades` - Product grading system (A-F)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Link users to Supabase auth

  3. Notes
    - Using UUID for IDs
    - Timestamps in UTC
    - Proper indexing for performance
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (extends Supabase auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);

-- Suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postcode TEXT,
  country TEXT,
  vat_number TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_code ON suppliers(supplier_code);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postcode TEXT,
  country TEXT,
  vat_number TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_code ON customers(customer_code);

-- Manufacturers
CREATE TABLE manufacturers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_manufacturers_name ON manufacturers(name);

-- Storage Locations
CREATE TABLE storage_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locations_code ON storage_locations(location_code);

-- Product Grades
CREATE TABLE product_grades (
  id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  grade CHAR(1) NOT NULL UNIQUE CHECK (grade IN ('A', 'B', 'C', 'D', 'E', 'F')),
  description TEXT
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_grades ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Admins can read all suppliers
CREATE POLICY "Admins can read all suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

-- Admins can create suppliers
CREATE POLICY "Admins can create suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

-- Similar policies for customers
CREATE POLICY "Admins can read all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

-- Admins can create customers
CREATE POLICY "Admins can create customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

-- All authenticated users can read manufacturers
CREATE POLICY "Users can read manufacturers"
  ON manufacturers FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage manufacturers
CREATE POLICY "Admins can manage manufacturers"
  ON manufacturers FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

-- All authenticated users can read storage locations
CREATE POLICY "Users can read storage locations"
  ON storage_locations FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage storage locations
CREATE POLICY "Admins can manage storage locations"
  ON storage_locations FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

-- All authenticated users can read product grades
CREATE POLICY "Users can read product grades"
  ON product_grades FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage product grades
CREATE POLICY "Admins can manage product grades"
  ON product_grades FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

-- Insert initial product grades
INSERT INTO product_grades (grade, description) VALUES
  ('A', 'Like new condition'),
  ('B', 'Good condition with minor wear'),
  ('C', 'Fair condition with noticeable wear'),
  ('D', 'Poor condition with significant wear'),
  ('E', 'Very poor condition'),
  ('F', 'For parts only');
