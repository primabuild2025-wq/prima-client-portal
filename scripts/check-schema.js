import { createClient } from '@supabase/supabase-js';

// Hardcoded for verification
const supabaseUrl = 'https://ajgfbzfjowrhbegkwnhn.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZ2ZiemZqb3dyaGJlZ2t3bmhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ0OTcyNSwiZXhwIjoyMDkxMDI1NzI1fQ.F_NORgbGrf5qDGcG0M4KclLuJhh6YCflH2Qq7BiNPNg';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false
  }
});

async function checkSchema() {
  try {
    console.log('🔍 Checking if database schema is set up...');

    // Try to select from users table
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.log('❌ Schema not set up yet:', error.message);
      console.log('');
      console.log('📋 Please run the database schema in Supabase SQL Editor:');
      console.log('1. Go to https://supabase.com/dashboard');
      console.log('2. Select your project');
      console.log('3. Go to SQL Editor > New Query');
      console.log('4. Copy and paste supabase-schema.sql content');
      console.log('5. Click Run');
      return false;
    }

    console.log('✅ Database schema is ready!');
    return true;

  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

checkSchema();