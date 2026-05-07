import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Helper to get current user
async function getCurrentUser() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any[]) {
          // No-op for read-only
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return user;
}

// PATCH /api/projects/[id]/activate - Activate project
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !['admin', 'management'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const projectId = params.id;

  const { data: project, error: fetchError } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (fetchError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (project.status === 'active') {
    return NextResponse.json({ error: 'Project already active' }, { status: 400 });
  }

  const { data: updatedProject, error: updateError } = await supabaseAdmin
    .from('projects')
    .update({
      status: 'active',
      activated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Log audit
  await supabaseAdmin.from('audit_logs').insert({
    actor_id: currentUser.id,
    action: 'project_activated',
    entity_type: 'project',
    entity_id: projectId,
    metadata: { name: project.name },
  });

  return NextResponse.json({ project: updatedProject });
}
