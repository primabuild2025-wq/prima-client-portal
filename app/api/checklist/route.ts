import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

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
  const { id, completed, userId } = await request.json();

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from('project_checklist')
    .update({
      completed,
      completed_at: completed ? now : null,
      completed_by: completed ? userId : null,
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}