'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useLang } from '@/lib/context/LanguageContext';
import ProjectChecklist from '@/components/ProjectChecklist';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const { t } = useLang();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/auth/login'; return; }

      const { data: user } = await supabase.from('users').select('*').eq('id', session.user.id).single();
      setCurrentUser(user);

      const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*, owner:users!owner_id(name, email), tasks(id, status)')
      .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          status: newStatus,
          activated_at: newStatus === 'active' ? new Date().toISOString() : undefined
        })
        .eq('id', id);
      if (error) throw error;
      setProjects(projects.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setShowModal(false);
      setForm({ name: '', description: '' });
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'draft': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'completed': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default: return 'text-white/50 bg-white/5 border-white/10';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active':    return t('Active', 'פעיל');
      case 'draft':     return t('Draft', 'טיוטה');
      case 'completed': return t('Completed', 'הושלם');
      default:          return status;
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

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="grid grid-cols-[280px_1fr] gap-6 px-6 pb-10 pt-6">
        <Sidebar />
        <section className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{t('Projects', 'פרויקטים')}</h2>
                <p className="text-sm text-white/70">{t('Manage and track all projects.', 'נהל ועקוב אחר כל הפרויקטים.')}</p>
              </div>
              {['admin', 'management'].includes(currentUser?.role) && (
                <button
                  onClick={() => setShowModal(true)}
                  className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-slate-200 transition"
                >
                  {t('+ New Project', '+ פרויקט חדש')}
                </button>
              )}
            </div>

            {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

            {projects.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-black/40 p-10 text-center">
                <p className="text-white/50">{t('No projects yet.', 'אין פרויקטים עדיין.')}</p>
                {['admin', 'management'].includes(currentUser?.role) && (
                  <button onClick={() => setShowModal(true)} className="mt-4 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-slate-200 transition">
                    {t('Create your first project', 'צור את הפרויקט הראשון שלך')}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {projects.map((project) => (
                  <div key={project.id} onClick={() => window.location.href = `/projects/${project.id}`} className="cursor-pointer rounded-3xl border border-white/10 bg-black/40 p-6 space-y-3 hover:border-white/20 transition">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-white">{project.name}</h3>
                      {project.red_flag && <span className="text-red-400 text-xs">🚩 {t('Red Flag', 'דגל אדום')}</span>}
                    </div>
                    {project.description && <p className="text-sm text-white/60 line-clamp-2">{project.description}</p>}
                    <div className="flex items-center justify-between">
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusColor(project.status)}`}>
                        {statusLabel(project.status)}
                      </span>
                      <span className="text-xs text-white/40">{new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-white/40">
                        🔲 {t('Not started', 'לא התחיל')}: {(project.tasks || []).filter((tk: any) => tk.status === 'not_started').length}
                      </span>
                      <span className="text-xs text-amber-400/70">
                        ⚡ {t('In progress', 'בתהליך')}: {(project.tasks || []).filter((tk: any) => tk.status === 'in_progress').length}
                      </span>
                    </div>
                    {project.owner && <p className="text-xs text-white/40">{t('Owner', 'בעלים')}: {project.owner.name}</p>}
                    
                    {['admin', 'management'].includes(currentUser?.role) && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <p className="w-full text-xs text-white/50 mb-1">{t('Change Status', 'שנה סטטוס')}</p>
                        {['draft', 'active', 'completed'].map(status => (
                          <button
                            key={status}
                            disabled={project.status === status}
                            onClick={(e) => { e.stopPropagation(); updateStatus(project.id, status); }}
                            className={`rounded-full border px-4 py-2 text-xs font-medium transition capitalize ${
                              project.status === status
                                ? statusColor(status)
                                : 'border-white/10 text-white/50 hover:bg-white/10'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {statusLabel(status)}
                          </button>
                        ))}
                      </div>
                    )}

                    <ProjectChecklist
                      projectId={project.id}
                      isPrivileged={['admin', 'management'].includes(currentUser?.role)}
                      minimal
                    />

                    {project.box_folder_id && (
                      <p className="text-xs text-white/30">📦 {t('Box connected', 'Box מחובר')}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#11144C] p-8 shadow-2xl">
            <h3 className="mb-6 text-xl font-semibold">{t('New Project', 'פרויקט חדש')}</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">{t('Project Name *', 'שם הפרויקט *')}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white"
                  placeholder={t('Enter project name', 'הכנס שם פרויקט')}
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">{t('Description', 'תיאור')}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white resize-none"
                  placeholder={t('Optional description', 'תיאור אופציונלי')}
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 rounded-full border border-white/10 px-5 py-3 text-sm text-white hover:bg-white/10 transition">
                  {t('Cancel', 'ביטול')}
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-slate-200 transition disabled:opacity-50">
                  {submitting ? t('Creating...', 'יוצר...') : t('Create Project', 'צור פרויקט')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}