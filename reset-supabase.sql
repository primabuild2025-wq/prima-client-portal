-- reset-supabase.sql
-- WARNING: This deletes all tables and data in your Supabase public schema.
-- Run this in the Supabase SQL editor or via a service-role connection.

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- If you need the default public schema privileges for future tables:
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
