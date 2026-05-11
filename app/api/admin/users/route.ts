import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getCallerUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data: user } = await supabase.from('users').select('*').eq('id', session.user.id).single();
  return user;
}

export async function POST(request: Request) {
  try {
    const caller = await getCallerUser();
    if (!caller || caller.role !== 'admin')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, email, role, password } = await request.json();
    if (!name || !email || !role || !password)
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) throw authError;

    const { error: userError } = await supabaseAdmin.from('users').insert({
      id:         authData.user.id,
      email,
      name,
      role,
      created_at: new Date().toISOString(),
    });
    if (userError) throw userError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}