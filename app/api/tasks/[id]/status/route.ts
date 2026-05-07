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

// PATCH /api/tasks/[id]/status - Update task status
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const taskId = params.id;
  const { status, comment } = await request.json();

  if (!status || !['not_started', 'in_progress', 'completed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  // Get current task
  const { data: task, error: fetchError } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (fetchError || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Verify user has access to project
  const { data: assignment } = await supabaseAdmin
    .from('project_assignments')
    .select('*')
    .eq('project_id', task.project_id)
    .eq('user_id', currentUser.id)
    .single();

  if (!assignment && !['admin', 'management'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Access denied to task' }, { status: 403 });
  }

  // Update task
  const { data: updatedTask, error: updateError } = await supabaseAdmin
    .from('tasks')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Log status change
  await supabaseAdmin.from('task_status_history').insert({
    task_id: taskId,
    from_status: task.status,
    to_status: status,
    changed_by: currentUser.id,
    comment,
  });

  // Log audit
  await supabaseAdmin.from('audit_logs').insert({
    actor_id: currentUser.id,
    action: 'task_status_updated',
    entity_type: 'task',
    entity_id: taskId,
    metadata: { fromStatus: task.status, toStatus: status },
  });

  // Create notification
  if (task.assignee_id !== currentUser.id) {
    await supabaseAdmin.from('notifications').insert({
      user_id: task.assignee_id,
      title: 'Task Updated',
      message: `Task "${task.title}" status changed to ${status}`,
      link: `/dashboard/projects/${task.project_id}/tasks/${taskId}`,
      actor_id: currentUser.id,
    });
  }

  return NextResponse.json({ task: updatedTask });
}
