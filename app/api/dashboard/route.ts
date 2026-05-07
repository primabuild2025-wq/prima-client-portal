import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';

async function getCurrentUser() {
  const cookieStore = await cookies(); // ← awaited
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
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

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let projectsQuery = supabaseAdmin
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (currentUser.role !== 'admin' && currentUser.role !== 'management') {
      const { data: assignments } = await supabaseAdmin
        .from('project_assignments')
        .select('project_id')
        .eq('user_id', currentUser.id);

      if (assignments && assignments.length > 0) {
        const projectIds = assignments.map((a: { project_id: string }) => a.project_id);
        projectsQuery = projectsQuery.in('id', projectIds);
      } else {
        projectsQuery = projectsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    const { data: projects } = await projectsQuery;

    let tasksQuery = supabaseAdmin.from('tasks').select('id, status');

    if (currentUser.role !== 'admin' && currentUser.role !== 'management') {
      const { data: assignments } = await supabaseAdmin
        .from('project_assignments')
        .select('project_id')
        .eq('user_id', currentUser.id);

      if (assignments && assignments.length > 0) {
        const projectIds = assignments.map((a: { project_id: string }) => a.project_id);
        tasksQuery = tasksQuery.in('project_id', projectIds);
      }
    }

    const { data: tasks } = await tasksQuery;

    const totalProjects = projects?.length || 0;
    const totalTasks = tasks?.length || 0;
    const activeTasks = tasks?.filter((t: { status: string }) => t.status === 'in_progress').length || 0;
    const completedTasks = tasks?.filter((t: { status: string }) => t.status === 'completed').length || 0;

    const { data: notifications } = await supabaseAdmin
      .from('notifications')
      .select('*, actor:users!actor_id(name)')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: redFlags } = await supabaseAdmin
      .from('files')
      .select('*, project:projects(name)')
      .eq('red_flag', true)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      stats: { totalProjects, totalTasks, activeTasks, completedTasks, redFlagsCount: redFlags?.length || 0 },
      projects: projects || [],
      notifications: notifications || [],
      redFlags: redFlags || [],
    });

  } catch (error: any) {
    console.error('Dashboard data error:', error);
    return NextResponse.json({ error: error.message || 'Failed to load dashboard data' }, { status: 500 });
  }
}