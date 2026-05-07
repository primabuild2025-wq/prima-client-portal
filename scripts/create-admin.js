import { createClient } from '@supabase/supabase-js';

// Hardcoded for this one-time script - replace with your actual values
const supabaseUrl = 'https://ajgfbzfjowrhbegkwnhn.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZ2ZiemZqb3dyaGJlZ2t3bmhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ0OTcyNSwiZXhwIjoyMDkxMDI1NzI1fQ.F_NORgbGrf5qDGcG0M4KclLuJhh6YCflH2Qq7BiNPNg';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false
  }
});

async function createAdminUser() {
  try {
    console.log('Setting up admin user...');

    // List all users to see what's there
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }

    const existingUser = users.users.find(u => u.email === 'primabuild2025@gmail.com');

    if (existingUser) {
      console.log('Found existing user:', existingUser.id);

      // Update the user with the correct password
      const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password: 'Pr1ma!@#',
        email_confirm: true,
      });

      if (updateError) {
        console.error('Error updating user:', updateError);
        return;
      }

      console.log('User password updated');

      // Try to create the profile
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: existingUser.id,
          email: 'primabuild2025@gmail.com',
          name: 'Prima Build Admin',
          role: 'admin',
          locale: 'en',
          dir: 'ltr',
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        console.log('Please run the database schema first in Supabase SQL Editor');
        return;
      }

      console.log('✅ Admin user updated successfully!');
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'primabuild2025@gmail.com',
        password: 'Pr1ma!@#',
        email_confirm: true,
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return;
      }

      console.log('New user created:', newUser.user?.id);

      // Create profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: newUser.user?.id,
          email: 'primabuild2025@gmail.com',
          name: 'Prima Build Admin',
          role: 'admin',
          locale: 'en',
          dir: 'ltr',
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        console.log('Please run the database schema first in Supabase SQL Editor');
        return;
      }

      console.log('✅ Admin user created successfully!');
    }

    console.log('');
    console.log('Admin credentials:');
    console.log('Email: primabuild2025@gmail.com');
    console.log('Password: Pr1ma!@#');
    console.log('');
    console.log('Login at: http://localhost:3002/auth/login');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createAdminUser();