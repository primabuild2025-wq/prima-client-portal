import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ajgfbzfjowrhbegkwnhn.supabase.co;
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZ2ZiemZqb3dyaGJlZ2t3bmhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ0OTcyNSwiZXhwIjoyMDkxMDI1NzI1fQ.F_NORgbGrf5qDGcG0M4KclLuJhh6YCflH2Qq7BiNPNg";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.");
}

const { data, error } = await (await createClient(supabaseUrl, serviceRoleKey)).auth.admin.createUser({
  email: "primabuild2025@gmail.com",
  password: "Pr1ma!@#",
  email_confirm: true,
});

if (error) throw error;

console.log("Created user id:", data.user.id);
