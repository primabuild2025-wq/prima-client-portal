import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ajgfbzfjowrhbegkwnhn.supabase.co"; // ← use your new rotated key
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZ2ZiemZqb3dyaGJlZ2t3bmhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ0OTcyNSwiZXhwIjoyMDkxMDI1NzI1fQ.F_NORgbGrf5qDGcG0M4KclLuJhh6YCflH2Qq7BiNPNg";     // ← after rotating!

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Step 1: Create in Supabase Auth
const { data, error } = await supabase.auth.admin.createUser({
  email: "primabuild2025@gmail.com",
  password: "Pr1ma!@#",
  email_confirm: true,
});

if (error) throw error;

const userId = data.user.id;
console.log("Auth user created:", userId);

// Step 2: Insert into your public.users table
const { error: insertError } = await supabase
  .from("users")
  .insert({
    id: userId,         // ← same UUID as auth.users
    email: "primabuild2025@gmail.com",
    name: "Prima Admin",    // ← change as needed
    role: "admin",          // ← change as needed
    locale: "en",
    dir: "ltr",
  });

if (insertError) throw insertError;

console.log("Public user record created for:", userId);