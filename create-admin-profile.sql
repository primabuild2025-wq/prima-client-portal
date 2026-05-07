-- Create admin user profile in the users table
-- Replace USER_ID_HERE with the actual User ID from Supabase Authentication > Users

INSERT INTO users (id, email, name, role, locale, dir)
VALUES (
  'USER_ID_HERE', -- Replace with actual User ID
  'primabuild2025@gmail.com',
  'Prima Build Admin',
  'admin',
  'en',
  'ltr'
);