'use client';
import { createBrowserClient } from '@supabase/ssr';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useLang } from '@/lib/context/LanguageContext';

const EXTERNAL_ROLES = ['client', 'designer', 'supervisor'];

interface DashboardData {
  stats: {
    totalProjects: number;
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    redFlagsCount: number;
  };
  projects: any[];
  notifications: any[];
  redFlags: any[];
}

export default function DashboardPage() {
  const [data, setData]           = useState<DashboardData | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const { t } = useLang();

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/auth/login'; return; }

      const { data: user } = await supabase
        .from('users').select('*').eq('id', session.user.id).single();
      if (!user) throw new Error('User profile not found');
      setCurrentUser(user);

      const isExternal = EXTERNAL_ROLES.includes(user.role);

      if (isExternal) {
        // External users: only load their assigned projects
        const { data: memberProjects } = await supabase
          .from('project_assignments')
          .select('project:projects(*, tasks(id, status))')
          .eq('user_id', session.user.id);

        const projects = memberProjects?.map((m: any) => m.project).filter(Boolean) || [];
        const allTasks = projects.flatMap((p: any) => p.tasks || []);

        setData({
          stats: {
            totalProjects:  projects.length,
            totalTasks:     allTasks.length,
            activeTasks:    allTasks.filter((t: any) => t.status === 'in_progress').length,
            completedTasks: allTasks.filter((t: any) => t.status === 'completed').length,
            redFlagsCount:  0,
          },
          projects,
          notifications: [],
          redFlags: [],
        });
      } else {
        // Internal users: full dashboard
        const { data: projects } = await supabase
          .from('projects').select('*').order('created_at', { ascending: false }).limit(5);

        const { data: tasks } = await supabase
          .from('tasks').select('id, status');

        const { data: notifications } = await supabase
          .from('tasks')
          .select('*, project:projects(name, id), assignee:users!assignee_id(name)')
          .in('status', ['not_started', 'in_progress'])
          .order('created_at', { ascending: true })
          .limit(10);

        const { data: redFlags } = await supabase
          .from('files').select('*, project:projects(name, id)')
          .eq('red_flag', true)
          .eq('pending_approval', true)
          .is('approval_note', null)
          .order('created_at', { ascending: false }).limit(10);

        setData({
          stats: {
            totalProjects:  projects?.length || 0,
            totalTasks:     tasks?.length || 0,
            activeTasks:    tasks?.filter(t => t.status === 'in_progress').length || 0,
            completedTasks: tasks?.filter(t => t.status === 'completed').length || 0,
            redFlagsCount:  redFlags?.filter(f => f.pending_approval && !f.approval_note).length || 0,
          },
          projects: projects || [],
          notifications: notifications || [],
          redFlags: redFlags || [],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <Header />
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#11144C]" />
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <Header />
      <div className="flex items-center justify-center h-96">
        <p className="text-red-500">Error: {error}</p>
      </div>
    </div>
  );

  const isExternal = EXTERNAL_ROLES.includes(currentUser?.role);

  // External user dashboard
  if (isExternal) {
    return (
      <div className="min-h-screen bg-[#F5F6FA]">
        <Header />
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 px-4 md:px-6 pb-10 pt-6">
          <Sidebar />
          <section className="space-y-6">
            <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">{t('Dashboard', 'לוח בקרה')}</h2>
              <p className="text-sm text-gray-500 mb-6">{t('Your project overview.', 'סקירת הפרויקטים שלך.')}</p>

              <div className="grid gap-4 md:grid-cols-3">
                <button
                  onClick={() => window.location.href = '/projects'}
                  className="rounded-2xl border border-gray-200 bg-[#F5F6FA] p-5 text-left hover:border-[#11144C]/30 hover:bg-[#11144C]/5 transition group"
                >
                  <p className="text-sm text-gray-500">{t('My Projects', 'הפרויקטים שלי')}</p>
                  <p className="mt-3 text-3xl font-bold text-[#11144C]">{data?.stats.totalProjects || 0}</p>
                  <p className="mt-2 text-xs text-gray-400 group-hover:text-[#11144C] transition">{t('View →', 'הצג →')}</p>
                </button>

                <div className="rounded-2xl border border-gray-200 bg-[#F5F6FA] p-5">
                  <p className="text-sm text-gray-500">{t('Open Tasks', 'משימות פתוחות')}</p>
                  <p className="mt-3 text-3xl font-bold text-[#11144C]">{data?.stats.activeTasks || 0}</p>
                  <p className="mt-2 text-xs text-gray-400">{t('In progress', 'בתהליך')}</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-[#F5F6FA] p-5">
                  <p className="text-sm text-gray-500">{t('Completed Tasks', 'משימות שהושלמו')}</p>
                  <p className="mt-3 text-3xl font-bold text-green-600">{data?.stats.completedTasks || 0}</p>
                  <p className="mt-2 text-xs text-gray-400">{t('Done', 'הושלם')}</p>
                </div>
              </div>
            </div>

            {/* My Projects list */}
            {data?.projects && data.projects.length > 0 && (
              <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('My Projects', 'הפרויקטים שלי')}</h3>
                <div className="space-y-3">
                  {data.projects.map((project: any) => (
                    <div
                      key={project.id}
                      onClick={() => window.location.href = `/projects/${project.id}`}
                      className="cursor-pointer rounded-2xl border border-gray-200 bg-[#F5F6FA] p-4 hover:border-[#11144C]/30 hover:bg-[#11144C]/5 transition"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{project.name}</p>
                        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${
                          project.status === 'active'    ? 'text-green-700 bg-green-50 border-green-200' :
                          project.status === 'completed' ? 'text-blue-700 bg-blue-50 border-blue-200' :
                                                           'text-yellow-700 bg-yellow-50 border-yellow-200'
                        }`}>
                          {project.status === 'active' ? t('Active', 'פעיל') :
                           project.status === 'completed' ? t('Completed', 'הושלם') :
                           t('Draft', 'טיוטה')}
                        </span>
                      </div>
                      {project.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{project.description}</p>
                      )}
                      <div className="flex gap-4 mt-2">
                        <span className="text-xs text-gray-400">
                          ⚡ {t('In progress', 'בתהליך')}: {(project.tasks || []).filter((tk: any) => tk.status === 'in_progress').length}
                        </span>
                        <span className="text-xs text-gray-400">
                          ✅ {t('Completed', 'הושלם')}: {(project.tasks || []).filter((tk: any) => tk.status === 'completed').length}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  // Internal user dashboard (admin/management/staff)
  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <Header />
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 px-4 md:px-6 pb-10 pt-6">
        <Sidebar />
        <section className="space-y-6">

          <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">

            {/* Main KPIs */}
            <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">{t('Dashboard', 'לוח בקרה')}</h2>
                <p className="text-sm text-gray-500">{t('Internal summary with project and task KPIs.', 'סיכום פנימי עם מדדי פרויקטים ומשימות.')}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                <button
                  onClick={() => window.location.href = '/projects'}
                  className="rounded-2xl border border-gray-200 bg-[#F5F6FA] p-5 text-left hover:border-[#11144C]/30 hover:bg-[#11144C]/5 transition group"
                >
                  <p className="text-sm text-gray-500">{t('Total Projects', 'סה״כ פרויקטים')}</p>
                  <p className="mt-3 text-3xl font-bold text-[#11144C]">{data?.stats.totalProjects || 0}</p>
                  <p className="mt-2 text-xs text-gray-400 group-hover:text-[#11144C] transition">{t('View all →', 'הצג הכל →')}</p>
                </button>

                <button
                  onClick={() => window.location.href = '/tasks'}
                  className="rounded-2xl border border-gray-200 bg-[#F5F6FA] p-5 text-left hover:border-[#11144C]/30 hover:bg-[#11144C]/5 transition group"
                >
                  <p className="text-sm text-gray-500">{t('Total Tasks', 'סה״כ משימות')}</p>
                  <p className="mt-3 text-3xl font-bold text-[#11144C]">{data?.stats.totalTasks || 0}</p>
                  <p className="mt-2 text-xs text-gray-400 group-hover:text-[#11144C] transition">{t('View all →', 'הצג הכל →')}</p>
                </button>

                <button
                  onClick={() => window.location.href = '/tasks?status=in_progress'}
                  className="rounded-2xl border border-gray-200 bg-[#F5F6FA] p-5 text-left hover:border-[#11144C]/30 hover:bg-[#11144C]/5 transition group"
                >
                  <p className="text-sm text-gray-500">{t('Open Tasks', 'משימות פתוחות')}</p>
                  <p className="mt-3 text-3xl font-bold text-[#11144C]">{data?.stats.activeTasks || 0}</p>
                  <p className="mt-2 text-xs text-gray-400 group-hover:text-[#11144C] transition">{t('View open →', 'הצג פתוחות →')}</p>
                </button>

                <button
                  onClick={() => window.location.href = '/notifications'}
                  className="rounded-2xl border border-red-200 bg-red-50 p-5 text-left hover:bg-red-100 transition group"
                >
                  <p className="text-sm text-gray-500">{t('Red Flags', 'דגלים אדומים')}</p>
                  <p className="mt-3 text-3xl font-bold text-red-500">{data?.stats.redFlagsCount || 0}</p>
                  <p className="mt-2 text-xs text-red-400 group-hover:text-red-600 transition">{t('View flags →', 'הצג דגלים →')}</p>
                </button>

              </div>
            </div>

            {/* Quick Stats */}
            <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">
              <h3 className="text-lg font-semibold text-gray-900">{t('Quick Stats', 'סטטיסטיקה מהירה')}</h3>
              <div className="mt-6 space-y-4">

                <button
                  onClick={() => window.location.href = '/tasks?status=completed'}
                  className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] p-4 text-left hover:border-[#11144C]/30 hover:bg-[#11144C]/5 transition group"
                >
                  <p className="text-sm text-gray-500">{t('Completed Tasks', 'משימות שהושלמו')}</p>
                  <p className="mt-2 text-2xl font-bold text-[#11144C]">{data?.stats.completedTasks || 0}</p>
                  <p className="mt-1 text-xs text-gray-400 group-hover:text-[#11144C] transition">{t('View completed →', 'הצג שהושלמו →')}</p>
                </button>

                <button
                  onClick={() => window.location.href = '/projects?status=active'}
                  className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] p-4 text-left hover:border-[#11144C]/30 hover:bg-[#11144C]/5 transition group"
                >
                  <p className="text-sm text-gray-500">{t('Active Projects', 'פרויקטים פעילים')}</p>
                  <p className="mt-2 text-2xl font-bold text-[#11144C]">
                    {data?.projects?.filter(p => p.status === 'active').length || 0}
                  </p>
                  <p className="mt-1 text-xs text-gray-400 group-hover:text-[#11144C] transition">{t('View active →', 'הצג פעילים →')}</p>
                </button>

              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">

            {/* Recent Activity */}
            <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{t('Recent Activity', 'פעילות אחרונה')}</h3>
                <button
                  onClick={() => window.location.href = '/tasks'}
                  className="text-sm text-gray-500 hover:text-[#11144C] transition"
                >
                  {t('View all →', 'הצג הכל →')}
                </button>
              </div>
              <div className="space-y-3">
                {data?.notifications?.length ? (
                  data.notifications.map((task: any) => (
                    <div
                      key={task.id}
                      onClick={() => window.location.href = `/tasks/${task.id}`}
                      className="cursor-pointer rounded-2xl border border-gray-200 bg-[#F5F6FA] p-4 hover:border-[#11144C]/30 hover:bg-[#11144C]/5 transition"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{task.title}</p>
                          {task.project && (
                            <p className="text-xs text-gray-400 mt-0.5">📁 {task.project.name}</p>
                          )}
                          {task.assignee && (
                            <p className="text-xs text-gray-400">👤 {task.assignee.name}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            task.status === 'in_progress'
                              ? 'text-blue-600 bg-blue-50 border-blue-200'
                              : 'text-gray-500 bg-gray-100 border-gray-200'
                          }`}>
                            {task.status === 'in_progress' ? t('In progress', 'בתהליך') : t('Not started', 'לא התחיל')}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(task.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center py-4">{t('No open tasks', 'אין משימות פתוחות')}</p>
                )}
              </div>
            </div>

            {/* Red Flags */}
            <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">
              <h3 className="text-lg font-semibold text-gray-900">{t('Red Flags', 'דגלים אדומים')}</h3>
              <ul className="mt-6 space-y-4">
                {data?.redFlags?.length ? (
                  data.redFlags.map((flag: any) => (
                    <li key={flag.id}>
                      <button
                        onClick={() => window.location.href = `/projects/${flag.project?.id}?tab=files&fileId=${flag.id}`}
                        className="w-full rounded-2xl border border-red-200 bg-red-50 p-4 text-left hover:bg-red-100 transition"
                      >
                        <p className="font-medium text-red-600">{flag.description}</p>
                        <p className="mt-1 text-sm text-gray-600">{flag.project?.name}</p>
                        <p className="mt-1 text-xs text-red-400">{t('Go to file →', 'עבור לקובץ →')}</p>
                      </button>
                    </li>
                  ))
                ) : (
                  <p className="text-gray-400 text-center py-4">{t('No red flags', 'אין דגלים אדומים')}</p>
                )}
              </ul>
            </div>

          </div>
        </section>
      </div>
    </div>
  );
}