-- Create admin user directly in Supabase SQL Editor
-- Run this AFTER running the full schema from supabase-schema.sql

-- First, get the user ID from auth.users (replace with actual user ID if needed)
-- You can find this in Authentication > Users in your Supabase dashboard

INSERT INTO users (id, email, name, role, locale, dir)
VALUES (
  'USER_ID_HERE', -- Replace with the actual user ID from auth.users
  'primabuild2025@gmail.com',
  'Prima Build Admin',
  'admin',
  'en',
  'ltr'
);

-- Alternative: If you want to create everything at once, run this after the schema:
-- (But you'll need to get the user ID from the auth system first)