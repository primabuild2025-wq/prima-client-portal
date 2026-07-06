import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId)
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('project_checklist')
    .select('*')
    .eq('project_id', projectId)
    .order('number', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}

export async function PATCH(request: Request) {
  const { id, completed } = await request.json();

  // Authenticate request server-side using the user's cookie/token
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from('project_checklist')
    .update({
      completed,
      completed_at: completed ? now : null,
      completed_by: completed ? user.id : null,
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}