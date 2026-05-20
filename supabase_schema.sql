-- Run this in Supabase SQL editor to set up the DB

-- 1. Create bookings table (for incoming requests)
CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    church_name_am VARCHAR(500),
    church_name_en VARCHAR(500),
    category VARCHAR(100) NOT NULL,
    applicant_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(100) NOT NULL,
    status booking_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create organizations table (the master list)
CREATE TABLE organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    church_name VARCHAR(500),
    certificate_no VARCHAR(255),
    certificate_issued_date VARCHAR(255),
    country VARCHAR(100),
    city VARCHAR(100),
    type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Set up Role Based Access Control (RBAC)
CREATE TABLE roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES 
('admin', 'Full access to all features', '{"all": true}'),
('editor', 'Can edit organizations and bookings', '{"organizations:edit": true, "bookings:edit": true}'),
('viewer', 'Read-only access', '{"read": true}');

CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    role_name VARCHAR(255) DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger to create a profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role_name)
  VALUES (new.id, new.email, 'viewer');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Set up Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to organizations
CREATE POLICY "Public profiles are viewable by everyone."
  ON organizations FOR SELECT
  USING ( true );

-- For simplicity in this demo, allow all operations
CREATE POLICY "Public can insert organizations"
  ON organizations FOR INSERT
  WITH CHECK ( true );

CREATE POLICY "Public can update organizations"
  ON organizations FOR UPDATE
  USING ( true );

CREATE POLICY "Public can delete organizations"
  ON organizations FOR DELETE
  USING ( true );

-- Public can insert new bookings
CREATE POLICY "Public can insert bookings"
  ON bookings FOR INSERT
  WITH CHECK ( true );

-- Public can select bookings (optional, but good for local debugging if service role fails)
CREATE POLICY "Public can select bookings"
  ON bookings FOR SELECT
  USING ( true );

