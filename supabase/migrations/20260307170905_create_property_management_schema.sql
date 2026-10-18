/*
  # Property Management System Database Schema

  ## Overview
  Complete database schema for a multi-tenant property management system with role-based access control.

  ## 1. New Tables

  ### `users`
  - `id` (uuid, primary key) - User unique identifier
  - `email` (text, unique) - User email for authentication
  - `password_hash` (text) - Bcrypt hashed password
  - `full_name` (text) - User's full name
  - `role` (text) - User role: OWNER, MANAGER, VISITOR
  - `phone` (text) - Contact phone number
  - `created_by` (uuid, nullable) - Reference to owner who created this user
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `properties`
  - `id` (uuid, primary key) - Property unique identifier
  - `name` (text) - Property name
  - `type` (text) - Property type: apartment, commercial, mixed-use
  - `address` (text) - Full property address
  - `tax_rate` (decimal) - Tax percentage (e.g., 15.5 for 15.5%)
  - `description` (text) - Property description
  - `created_by` (uuid) - Reference to user who created property
  - `created_at` (timestamptz) - Property creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `units`
  - `id` (uuid, primary key) - Unit unique identifier
  - `property_id` (uuid) - Reference to parent property
  - `unit_name` (text) - Unit identifier (e.g., "Apt 101", "Suite A")
  - `rent_type` (text) - Rental period: monthly, yearly
  - `rent_amount` (decimal) - Rent amount in currency
  - `status` (text) - Unit status: occupied, vacant, maintenance
  - `lease_start_date` (date, nullable) - Current lease start date
  - `lease_end_date` (date, nullable) - Current lease end date
  - `created_at` (timestamptz) - Unit creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `tenants`
  - `id` (uuid, primary key) - Tenant unique identifier
  - `full_name` (text) - Tenant full name
  - `phone` (text) - Contact phone number
  - `id_number` (text) - National ID or identification number
  - `emergency_contact` (text) - Emergency contact information
  - `deposit_amount` (decimal) - Security deposit amount
  - `unit_id` (uuid) - Reference to occupied unit
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `payments`
  - `id` (uuid, primary key) - Payment unique identifier
  - `unit_id` (uuid) - Reference to unit
  - `amount` (decimal) - Payment amount
  - `payment_date` (date) - Date payment was made
  - `payment_method` (text) - Payment method: cash, bank, mobile
  - `recorded_by` (uuid) - Reference to user who recorded payment
  - `notes` (text, nullable) - Additional payment notes
  - `created_at` (timestamptz) - Record creation timestamp

  ### `expenses`
  - `id` (uuid, primary key) - Expense unique identifier
  - `property_id` (uuid) - Reference to property
  - `category` (text) - Expense category: maintenance, utilities, renovation, other
  - `amount` (decimal) - Expense amount
  - `description` (text) - Expense description
  - `date` (date) - Date expense was incurred
  - `added_by` (uuid) - Reference to user who added expense
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `maintenance_requests`
  - `id` (uuid, primary key) - Maintenance request unique identifier
  - `unit_id` (uuid) - Reference to unit
  - `title` (text) - Request title
  - `description` (text) - Detailed description
  - `status` (text) - Request status: pending, in_progress, completed
  - `created_by` (uuid) - Reference to user who created request
  - `created_at` (timestamptz) - Request creation timestamp
  - `updated_at` (timestamptz) - Last status update timestamp

  ## 2. Security
  - Enable RLS on all tables
  - Create restrictive policies based on user roles
  - OWNER: Full access to all records they created
  - MANAGER: Read/write access to assigned properties
  - VISITOR: Read-only access

  ## 3. Indexes
  - Foreign key indexes for optimal query performance
  - Composite indexes for common query patterns

  ## 4. Important Notes
  - All tables use UUID for primary keys
  - Timestamps use timestamptz for timezone awareness
  - Decimal type used for monetary values for precision
  - Foreign key constraints ensure referential integrity
  - Cascade deletes configured where appropriate
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'VISITOR')),
  phone text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('apartment', 'commercial', 'mixed-use')),
  address text NOT NULL,
  tax_rate decimal(5,2) DEFAULT 0,
  description text,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create units table
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_name text NOT NULL,
  rent_type text NOT NULL CHECK (rent_type IN ('monthly', 'yearly')),
  rent_amount decimal(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'vacant' CHECK (status IN ('occupied', 'vacant', 'maintenance')),
  lease_start_date date,
  lease_end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(property_id, unit_name)
);

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  id_number text NOT NULL,
  emergency_contact text,
  deposit_amount decimal(12,2) DEFAULT 0,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  amount decimal(12,2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'bank', 'mobile')),
  recorded_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('maintenance', 'utilities', 'renovation', 'other')),
  amount decimal(12,2) NOT NULL,
  description text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  added_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create maintenance_requests table
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_properties_created_by ON properties(created_by);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_tenants_unit_id ON tenants(unit_id);
CREATE INDEX IF NOT EXISTS idx_payments_unit_id ON payments(unit_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_maintenance_unit_id ON maintenance_requests(unit_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_requests(status);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Owners can view users they created"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users owner
      WHERE owner.id = auth.uid()
      AND owner.role = 'OWNER'
      AND users.created_by = owner.id
    )
  );

CREATE POLICY "Owners can create managers and visitors"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users owner
      WHERE owner.id = auth.uid()
      AND owner.role = 'OWNER'
    )
    AND role IN ('MANAGER', 'VISITOR')
  );

CREATE POLICY "Owners can update users they created"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users owner
      WHERE owner.id = auth.uid()
      AND owner.role = 'OWNER'
      AND users.created_by = owner.id
    )
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for properties table
CREATE POLICY "Owners can view their properties"
  ON properties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'OWNER' AND properties.created_by = users.id)
    )
  );

CREATE POLICY "Managers and visitors can view properties"
  ON properties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('MANAGER', 'VISITOR')
      AND users.created_by = properties.created_by
    )
  );

CREATE POLICY "Owners can create properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'OWNER'
      AND properties.created_by = auth.uid()
    )
  );

CREATE POLICY "Owners can update their properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Managers can update properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'MANAGER'
      AND users.created_by = properties.created_by
    )
  );

CREATE POLICY "Owners can delete their properties"
  ON properties FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for units table
CREATE POLICY "Users can view units of accessible properties"
  ON units FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      INNER JOIN users u ON u.id = auth.uid()
      WHERE units.property_id = p.id
      AND (
        (u.role = 'OWNER' AND p.created_by = u.id)
        OR (u.role IN ('MANAGER', 'VISITOR') AND u.created_by = p.created_by)
      )
    )
  );

CREATE POLICY "Owners and managers can create units"
  ON units FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      INNER JOIN users u ON u.id = auth.uid()
      WHERE units.property_id = p.id
      AND (
        (u.role = 'OWNER' AND p.created_by = u.id)
        OR (u.role = 'MANAGER' AND u.created_by = p.created_by)
      )
    )
  );

CREATE POLICY "Owners and managers can update units"
  ON units FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      INNER JOIN users u ON u.id = auth.uid()
      WHERE units.property_id = p.id
      AND (
        (u.role = 'OWNER' AND p.created_by = u.id)
        OR (u.role = 'MANAGER' AND u.created_by = p.created_by)
      )
    )
  );

CREATE POLICY "Owners can delete units"
  ON units FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      INNER JOIN users u ON u.id = auth.uid()
      WHERE units.property_id = p.id
      AND u.role = 'OWNER'
      AND p.created_by = u.id
    )
  );

-- RLS Policies for tenants table
CREATE POLICY "Users can view tenants of accessible units"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units u
      INNER JOIN properties p ON u.property_id = p.id
      INNER JOIN users usr ON usr.id = auth.uid()
      WHERE tenants.unit_id = u.id
      AND (
        (usr.role = 'OWNER' AND p.created_by = usr.id)
        OR (usr.role IN ('MANAGER', 'VISITOR') AND usr.created_by = p.created_by)
      )
    )
  );

CREATE POLICY "Owners and managers can create tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM units u
      INNER JOIN properties p ON u.property_id = p.id
      INNER JOIN users usr ON usr.id = auth.uid()
      WHERE tenants.unit_id = u.id
      AND (
        (usr.role = 'OWNER' AND p.created_by = usr.id)
        OR (usr.role = 'MANAGER' AND usr.created_by = p.created_by)
      )
    )
  );

CREATE POLICY "Owners and managers can update tenants"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units u
      INNER JOIN properties p ON u.property_id = p.id
      INNER JOIN users usr ON usr.id = auth.uid()
      WHERE tenants.unit_id = u.id
      AND (
        (usr.role = 'OWNER' AND p.created_by = usr.id)
        OR (usr.role = 'MANAGER' AND usr.created_by = p.created_by)
      )
    )
  );

CREATE POLICY "Owners can delete tenants"
  ON tenants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units u
      INNER JOIN properties p ON u.property_id = p.id
      INNER JOIN users usr ON usr.id = auth.uid()
      WHERE tenants.unit_id = u.id
      AND usr.role = 'OWNER'
      AND p.created_by = usr.id
    )
  );

-- RLS Policies for payments table
CREATE POLICY "Users can view payments of accessible units"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units u
      INNER JOIN properties p ON u.property_id = p.id
      INNER JOIN users usr ON usr.id = auth.uid()
      WHERE payments.unit_id = u.id
      AND (
        (usr.role = 'OWNER' AND p.created_by = usr.id)
        OR (usr.role IN ('MANAGER', 'VISITOR') AND usr.created_by = p.created_by)
      )
    )
  );

CREATE POLICY "Owners and managers can create payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM units u
      INNER JOIN properties p ON u.property_id = p.id
      INNER JOIN users usr ON usr.id = auth.uid()
      WHERE payments.unit_id = u.id
      AND (
        (usr.role = 'OWNER' AND p.created_by = usr.id)
        OR (usr.role = 'MANAGER' AND usr.created_by = p.created_by)
      )
    )
    AND recorded_by = auth.uid()
  );

-- RLS Policies for expenses table
CREATE POLICY "Users can view expenses of accessible properties"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      INNER JOIN users usr ON usr.id = auth.uid()
      WHERE expenses.property_id = p.id
      AND (
        (usr.role = 'OWNER' AND p.created_by = usr.id)
        OR (usr.role IN ('MANAGER', 'VISITOR') AND usr.created_by = p.created_by)
      )
    )
  );

CREATE POLICY "Owners and managers can create expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      INNER JOIN users usr ON usr.id = auth.uid()
      WHERE expenses.property_id = p.id
      AND (
        (usr.role = 'OWNER' AND p.created_by = usr.id)
        OR (usr.role = 'MANAGER' AND usr.created_by = p.created_by)
      )
    )
    AND added_by = auth.uid()
  );

CREATE POLICY "Owners and managers can update expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      INNER JOIN users usr ON usr.id = auth.uid()
      WHERE expenses.property_id = p.id
      AND (
        (usr.role = 'OWNER' AND p.created_by = usr.id)
        OR (usr.role = 'MANAGER' AND usr.created_by = p.created_by)
      )
    )
  );

CREATE POLICY "Owners can delete expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      INNER JOIN users usr ON usr.id = auth.uid()
      WHERE expenses.property_id = p.id
      AND usr.role = 'OWNER'
      AND p.created_by = usr.id
    )
  );

-- RLS Policies for maintenance_requests table
CREATE POLICY "Users can view maintenance requests of accessible units"
  ON maintenance_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units u
      INNER JOIN properties p ON u.property_id = p.id
      INNER JOIN users usr ON usr.id = auth.uid()
      WHERE maintenance_requests.unit_id = u.id
      AND (
        (usr.role = 'OWNER' AND p.created_by = usr.id)
        OR (usr.role IN ('MANAGER', 'VISITOR') AND usr.created_by = p.created_by)
      )
    )
  );

CREATE POLICY "Owners and managers can create maintenance requests"
  ON maintenance_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM units u
      INNER JOIN properties p ON u.property_id = p.id
      INNER JOIN users usr ON usr.id = auth.uid()
      WHERE maintenance_requests.unit_id = u.id
      AND (
        (usr.role = 'OWNER' AND p.created_by = usr.id)
        OR (usr.role = 'MANAGER' AND usr.created_by = p.created_by)
      )
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Owners and managers can update maintenance requests"
  ON maintenance_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units u
      INNER JOIN properties p ON u.property_id = p.id
      INNER JOIN users usr ON usr.id = auth.uid()
      WHERE maintenance_requests.unit_id = u.id
      AND (
        (usr.role = 'OWNER' AND p.created_by = usr.id)
        OR (usr.role = 'MANAGER' AND usr.created_by = p.created_by)
      )
    )
  );

CREATE POLICY "Owners can delete maintenance requests"
  ON maintenance_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units u
      INNER JOIN properties p ON u.property_id = p.id
      INNER JOIN users usr ON usr.id = auth.uid()
      WHERE maintenance_requests.unit_id = u.id
      AND usr.role = 'OWNER'
      AND p.created_by = usr.id
    )
  );
