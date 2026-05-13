'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useLang } from '@/lib/context/LanguageContext';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [translatedTasks, setTranslatedTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', projectId: '', assigneeId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  const { lang, t, translateContent } = useLang();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (tasks.length === 0) { setTranslatedTasks([]); return; }
    applyTranslations(tasks);
  }, [lang, tasks]);

  const applyTranslations = async (data: any[]) => {
    setTranslating(true);
    try {
      const texts = data.flatMap(task => [
        task.title || '',
        task.description || '',
        task.project?.name || '',
      ]);
      const translated = await translateContent(texts);
      setTranslatedTasks(data.map((task, i) => ({
        ...task,
        title:       translated[i * 3]     || task.title,
        description: translated[i * 3 + 1] || task.description,
        project: task.project ? {
          ...task.project,
          name: translated[i * 3 + 2] || task.project.name,
        } : null,
      })));
    } finally {
      setTranslating(false);
    }
  };

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/auth/login'; return; }

      const [tasksRes, projectsRes, usersRes] = await Promise.all([
        supabase.from('tasks').select('*, project:projects(name), assignee:users!assignee_id(name, email)').order('created_at', { ascending: true }),
        supabase.from('projects').select('id, name'),
        supabase.from('users').select('id, name, email'),
      ]);

      const statusOrder: Record<string, number> = {
        not_started: 0,
        in_progress: 1,
        completed:   2,
        blocked:     3,
      };

      const sortedTasks = (tasksRes.data || []).sort((a: any, b: any) => {
        const orderDiff = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
        if (orderDiff !== 0) return orderDiff;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      setTasks(sortedTasks);
      setProjects(projectsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ projectId: form.projectId, title: form.title, description: form.description, assigneeId: form.assigneeId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setShowModal(false);
      setForm({ title: '', description: '', projectId: '', assigneeId: '' });
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'completed':   return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'not_started': return 'text-white/50 bg-white/5 border-white/10';
      case 'blocked':     return 'text-red-400 bg-red-400/10 border-red-400/20';
      default:            return 'text-white/50 bg-white/5 border-white/10';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'not_started': return t('Not started', 'לא התחיל');
      case 'in_progress': return t('In progress', 'בתהליך');
      case 'completed':   return t('Completed', 'הושלם');
      case 'blocked':     return t('Blocked', 'חסום');
      default:            return status;
    }
  };

  const displayed = translatedTasks.length > 0 ? translatedTasks : tasks;
  const filteredTasks = filterStatus ? displayed.filter(t => t.status === filterStatus) : displayed;

  if (loading) return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 px-4 md:px-6 pb-10 pt-6">
        <Sidebar />
        <section className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{t('Tasks', 'משימות')}</h2>
                <p className="text-sm text-white/70">{t('Track and manage all tasks across projects.', 'עקוב ונהל את כל המשימות בפרויקטים.')}</p>
              </div>
              <div className="flex items-center gap-3">
                {translating && (
                  <span className="text-xs text-white/30">{t('Translating…', 'מתרגם…')}</span>
                )}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-full border border-white/10 bg-black/60 px-4 py-2 text-sm text-white outline-none"
                >
                  <option value="">{t('All Statuses', 'כל הסטטוסים')}</option>
                  <option value="not_started">{t('Not Started', 'לא התחיל')}</option>
                  <option value="in_progress">{t('In Progress', 'בתהליך')}</option>
                  <option value="completed">{t('Completed', 'הושלם')}</option>
                  <option value="blocked">{t('Blocked', 'חסום')}</option>
                </select>
                <button
                  onClick={() => setShowModal(true)}
                  className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-slate-200 transition"
                >
                  {t('+ New Task', '+ משימה חדשה')}
                </button>
              </div>
            </div>

            {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

            {filteredTasks.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-black/40 p-10 text-center">
                <p className="text-white/50">{t('No tasks found.', 'לא נמצאו משימות.')}</p>
                <button onClick={() => setShowModal(true)} className="mt-4 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-slate-200 transition">
                  {t('Create your first task', 'צור את המשימה הראשונה שלך')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <div key={task.id} onClick={() => window.location.href = `/tasks/${task.id}`} className="cursor-pointer rounded-3xl border border-white/10 bg-black/40 p-5 flex items-center justify-between hover:border-white/20 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-white">{task.title}</h3>
                        {task.red_flag && <span className="text-red-400 text-xs">🚩</span>}
                      </div>
                      {task.project && <p className="text-xs text-white/40">📁 {task.project.name}</p>}
                      {task.assignee && <p className="text-xs text-white/40">👤 {task.assignee.name}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusColor(task.status)}`}>
                        {statusLabel(task.status)}
                      </span>
                      <span className="text-xs text-white/30">{new Date(task.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#11144C] p-8 shadow-2xl">
            <h3 className="mb-6 text-xl font-semibold">{t('New Task', 'משימה חדשה')}</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">{t('Title *', 'כותרת *')}</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white"
                  placeholder={t('Task title', 'כותרת המשימה')} required />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">{t('Project *', 'פרויקט *')}</label>
                <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white" required>
                  <option value="">{t('Select a project', 'בחר פרויקט')}</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">{t('Assignee', 'אחראי')}</label>
                <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                  className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white">
                  <option value="">{t('Assign to me', 'הקצה לי')}</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">{t('Description', 'תיאור')}</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white resize-none"
                  placeholder={t('Optional description', 'תיאור אופציונלי')} rows={3} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 rounded-full border border-white/10 px-5 py-3 text-sm text-white hover:bg-white/10 transition">
                  {t('Cancel', 'ביטול')}
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-slate-200 transition disabled:opacity-50">
                  {submitting ? t('Creating...', 'יוצר...') : t('Create Task', 'צור משימה')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}