'use client';
import { createBrowserClient } from '@supabase/ssr';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useLang } from '@/lib/context/LanguageContext';

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
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { t } = useLang();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/auth/login'; return; }

      const { data: currentUser } = await supabase
        .from('users').select('*').eq('id', session.user.id).single();
      if (!currentUser) throw new Error('User profile not found');

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
          totalProjects: projects?.length || 0,
          totalTasks: tasks?.length || 0,
          activeTasks: tasks?.filter(t => t.status === 'in_progress').length || 0,
          completedTasks: tasks?.filter(t => t.status === 'completed').length || 0,
          redFlagsCount: redFlags?.filter(f => f.pending_approval && !f.approval_note).length || 0,
        },
        projects: projects || [],
        notifications: notifications || [],
        redFlags: redFlags || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="flex items-center justify-center h-96">
        <p className="text-red-400">Error: {error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="grid grid-cols-[280px_1fr] gap-6 px-6 pb-10 pt-6">
        <Sidebar />
        <section className="space-y-6">

          <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">

            {/* Main KPIs */}
            <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold">{t('Dashboard', 'לוח בקרה')}</h2>
                <p className="text-sm text-white/70">{t('Internal summary with project and task KPIs.', 'סיכום פנימי עם מדדי פרויקטים ומשימות.')}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                <button
                  onClick={() => window.location.href = '/projects'}
                  className="rounded-3xl border border-white/10 bg-black/40 p-5 text-left hover:bg-white/5 hover:border-white/20 transition group"
                >
                  <p className="text-sm text-white/70">{t('Total Projects', 'סה״כ פרויקטים')}</p>
                  <p className="mt-3 text-3xl font-semibold">{data?.stats.totalProjects || 0}</p>
                  <p className="mt-2 text-xs text-white/30 group-hover:text-white/50 transition">{t('View all →', 'הצג הכל →')}</p>
                </button>

                <button
                  onClick={() => window.location.href = '/tasks'}
                  className="rounded-3xl border border-white/10 bg-black/40 p-5 text-left hover:bg-white/5 hover:border-white/20 transition group"
                >
                  <p className="text-sm text-white/70">{t('Total Tasks', 'סה״כ משימות')}</p>
                  <p className="mt-3 text-3xl font-semibold">{data?.stats.totalTasks || 0}</p>
                  <p className="mt-2 text-xs text-white/30 group-hover:text-white/50 transition">{t('View all →', 'הצג הכל →')}</p>
                </button>

                <button
                  onClick={() => window.location.href = '/tasks?status=in_progress'}
                  className="rounded-3xl border border-white/10 bg-black/40 p-5 text-left hover:bg-white/5 hover:border-white/20 transition group"
                >
                  <p className="text-sm text-white/70">{t('Open Tasks', 'משימות פתוחות')}</p>
                  <p className="mt-3 text-3xl font-semibold">{data?.stats.activeTasks || 0}</p>
                  <p className="mt-2 text-xs text-white/30 group-hover:text-white/50 transition">{t('View open →', 'הצג פתוחות →')}</p>
                </button>

                <button
                  onClick={() => window.location.href = '/notifications'}
                  className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5 text-left hover:bg-red-500/10 transition group"
                >
                  <p className="text-sm text-white/70">{t('Red Flags', 'דגלים אדומים')}</p>
                  <p className="mt-3 text-3xl font-semibold text-red-400">{data?.stats.redFlagsCount || 0}</p>
                  <p className="mt-2 text-xs text-red-400/40 group-hover:text-red-400/70 transition">{t('View flags →', 'הצג דגלים →')}</p>
                </button>

              </div>
            </div>

            {/* Quick Stats */}
            <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8">
              <h3 className="text-lg font-semibold">{t('Quick Stats', 'סטטיסטיקה מהירה')}</h3>
              <div className="mt-6 space-y-4">

                <button
                  onClick={() => window.location.href = '/tasks?status=completed'}
                  className="w-full rounded-3xl bg-black/40 p-4 text-left hover:bg-white/5 transition group"
                >
                  <p className="text-sm text-white/70">{t('Completed Tasks', 'משימות שהושלמו')}</p>
                  <p className="mt-2 text-2xl font-semibold">{data?.stats.completedTasks || 0}</p>
                  <p className="mt-1 text-xs text-white/30 group-hover:text-white/50 transition">{t('View completed →', 'הצג שהושלמו →')}</p>
                </button>

                <button
                  onClick={() => window.location.href = '/projects?status=active'}
                  className="w-full rounded-3xl bg-black/40 p-4 text-left hover:bg-white/5 transition group"
                >
                  <p className="text-sm text-white/70">{t('Active Projects', 'פרויקטים פעילים')}</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {data?.projects?.filter(p => p.status === 'active').length || 0}
                  </p>
                  <p className="mt-1 text-xs text-white/30 group-hover:text-white/50 transition">{t('View active →', 'הצג פעילים →')}</p>
                </button>

              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">

            {/* Recent Activity */}
            <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t('Recent Activity', 'פעילות אחרונה')}</h3>
                <button
                  onClick={() => window.location.href = '/tasks'}
                  className="text-sm text-white/70 hover:text-white transition"
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
                      className="cursor-pointer rounded-3xl border border-white/10 bg-black/40 p-4 hover:border-white/20 transition"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{task.title}</p>
                          {task.project && (
                            <p className="text-xs text-white/40 mt-0.5">📁 {task.project.name}</p>
                          )}
                          {task.assignee && (
                            <p className="text-xs text-white/40">👤 {task.assignee.name}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            task.status === 'in_progress'
                              ? 'text-blue-400 bg-blue-400/10 border-blue-400/20'
                              : 'text-white/50 bg-white/5 border-white/10'
                          }`}>
                            {task.status === 'in_progress' ? t('In progress', 'בתהליך') : t('Not started', 'לא התחיל')}
                          </span>
                          <span className="text-xs text-white/30">
                            {new Date(task.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-white/70 text-center py-4">{t('No open tasks', 'אין משימות פתוחות')}</p>
                )}
              </div>
            </div>

            {/* Red Flags */}
            <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8">
              <h3 className="text-lg font-semibold">{t('Red Flags', 'דגלים אדומים')}</h3>
              <ul className="mt-6 space-y-4">
                {data?.redFlags?.length ? (
                  data.redFlags.map((flag: any) => (
                    <li key={flag.id}>
                      <button
                        onClick={() => window.location.href = `/projects/${flag.project?.id}`}
                        className="w-full rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-left hover:bg-red-500/20 transition"
                      >
                        <p className="font-medium text-red-400">{flag.description}</p>
                        <p className="mt-1 text-sm text-white/70">{flag.project?.name}</p>
                        <p className="mt-1 text-xs text-red-400/50">{t('Go to project →', 'עבור לפרויקט →')}</p>
                      </button>
                    </li>
                  ))
                ) : (
                  <p className="text-white/70 text-center py-4">{t('No red flags', 'אין דגלים אדומים')}</p>
                )}
              </ul>
            </div>

          </div>
        </section>
      </div>
    </div>
  );
}