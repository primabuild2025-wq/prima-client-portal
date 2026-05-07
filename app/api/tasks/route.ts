import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Helper to get current user
async function getCurrentUser() {
  const cookieStore = await cookies();
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

// POST /api/tasks - Create task
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, title, description, assigneeId, dueDate, priority } = await request.json();

  if (!projectId || !title) {
    return NextResponse.json({ error: 'Project ID and title are required' }, { status: 400 });
  }

  // Verify user has access to project
  const { data: assignment } = await supabaseAdmin
    .from('project_assignments')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', currentUser.id)
    .single();

  if (!assignment && !['admin', 'management'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Access denied to project' }, { status: 403 });
  }

  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      project_id: projectId,
      title,
      description,
      assignee_id: assigneeId || currentUser.id,
      created_by: currentUser.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log audit
  await supabaseAdmin.from('audit_logs').insert({
    actor_id: currentUser.id,
    action: 'task_created',
    entity_type: 'task',
    entity_id: task.id,
    metadata: { title, projectId },
  });

  return NextResponse.json({ task });
}

// GET /api/tasks - List tasks
export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const assigneeId = url.searchParams.get('assigneeId');
  const status = url.searchParams.get('status');

  let query = supabaseAdmin
    .from('tasks')
    .select(`
      *,
      project:projects(name, status),
      assignee:users!assignee_id(name, email),
      creator:users!created_by(name, email)
    `)
    .order('created_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  if (assigneeId) {
    if (assigneeId === 'me') {
      query = query.eq('assignee_id', currentUser.id);
    } else {
      query = query.eq('assignee_id', assigneeId);
    }
  }

  if (status) {
    query = query.eq('status', status);
  }

  // Filter by assigned projects for non-admin users
  if (currentUser.role !== 'admin' && currentUser.role !== 'management') {
    const { data: projectIds } = await supabaseAdmin
      .from('project_assignments')
      .select('project_id')
      .eq('user_id', currentUser.id);

    if (projectIds) {
      const ids = projectIds.map((p: { project_id: string }) => p.project_id);
      query = query.in('project_id', ids);
    }
  }

  const { data: tasks, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks });
}
