'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MediaUpload from '@/components/MediaUpload';
import MediaViewer from '@/components/MediaViewer';
import { useLang } from '@/lib/context/LanguageContext';


export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [project, setProject] = useState<any>(null);
  const [translatedProject, setTranslatedProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [translatedTasks, setTranslatedTasks] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'photos' | 'files'>('tasks');
  const [showUpload, setShowUpload] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const { lang, t, translateContent } = useLang();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!project) return;
    applyTranslations();
  }, [lang, project, tasks]);

  const applyTranslations = async () => {
    setTranslating(true);
    try {
      // Translate project fields
      const projectTexts = [project.name || '', project.description || ''];

      // Translate task fields
      const taskTexts = tasks.flatMap(task => [task.title || '', task.description || '']);

      const all = await translateContent([...projectTexts, ...taskTexts]);

      setTranslatedProject({
        ...project,
        name:        all[0] || project.name,
        description: all[1] || project.description,
      });

      setTranslatedTasks(tasks.map((task, i) => ({
        ...task,
        title:       all[2 + i * 2]     || task.title,
        description: all[2 + i * 2 + 1] || task.description,
      })));
    } finally {
      setTranslating(false);
    }
  };

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/auth/login'; return; }

      const { data: user } = await supabase.from('users').select('*').eq('id', session.user.id).single();
      setCurrentUser(user);

      const [projectRes, tasksRes, filesRes, photosRes] = await Promise.all([
        supabase.from('projects').select('*, owner:users!owner_id(name, email)').eq('id', id).single(),
        supabase.from('tasks').select('*, assignee:users!assignee_id(name)').eq('project_id', id).order('created_at', { ascending: false }),
        supabase.from('files').select('*').eq('project_id', id).order('created_at', { ascending: false }),
        supabase.from('photos').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      ]);

      setProject(projectRes.data);
      setTasks(tasksRes.data || []);
      setFiles(filesRes.data || []);
      setPhotos(photosRes.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
      case 'active':      return t('Active', 'פעיל');
      case 'draft':       return t('Draft', 'טיוטה');
      case 'completed':   return t('Completed', 'הושלם');
      case 'not_started': return t('Not started', 'לא התחיל');
      case 'in_progress': return t('In progress', 'בתהליך');
      case 'blocked':     return t('Blocked', 'חסום');
      default:            return status;
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          status: newStatus,
          activated_at: newStatus === 'active' ? new Date().toISOString() : undefined,
        })
        .eq('id', id);
      if (error) throw error;
      setProject({ ...project, status: newStatus });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const displayedProject = translatedProject || project;
  const displayedTasks   = translatedTasks.length > 0 ? translatedTasks : tasks;

  if (loading) return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    </div>
  );

  if (error || !project) return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="flex items-center justify-center h-96">
        <p className="text-red-400">{error || t('Project not found', 'פרויקט לא נמצא')}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="grid grid-cols-[280px_1fr] gap-6 px-6 pb-10 pt-6">
        <Sidebar />
        <section className="space-y-6">

          {/* Project Header */}
          <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8">
            <div className="flex items-start justify-between">
              <div>
                <button
                  onClick={() => window.location.href = '/projects'}
                  className="text-white/50 hover:text-white text-sm"
                >
                  ← {t('Projects', 'פרויקטים')}
                </button>
                <div className="flex items-center gap-3 mt-2">
                  <h1 className="text-2xl font-semibold">{displayedProject.name}</h1>
                  {translating && <span className="text-xs text-white/30">{t('Translating…', 'מתרגם…')}</span>}
                </div>
                {displayedProject.description && (
                  <p className="mt-1 text-white/60">{displayedProject.description}</p>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    project.status === 'active'    ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                    project.status === 'completed' ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' :
                                                     'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
                  }`}>
                    {statusLabel(project.status)}
                  </span>
                  {project.red_flag && (
                    <span className="text-red-400 text-xs">🚩 {t('Red Flag', 'דגל אדום')}</span>
                  )}
                  {project.box_folder_id && (
                    <span className="text-white/30 text-xs">📦 {t('Box connected', 'Box מחובר')}</span>
                  )}
                </div>

                {['admin', 'management'].includes(currentUser?.role) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <p className="w-full text-xs text-white/50 mb-1">{t('Change Status', 'שנה סטטוס')}</p>
                    {['draft', 'active', 'completed'].map(status => (
                      <button
                        key={status}
                        disabled={project.status === status}
                        onClick={() => updateStatus(status)}
                        className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                          project.status === status
                            ? status === 'active'    ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                              status === 'completed' ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' :
                                                       'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
                            : 'border-white/10 text-white/50 hover:bg-white/10'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {statusLabel(status)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowUpload(!showUpload)}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-slate-200 transition"
              >
                + {t('Upload', 'העלה')}
              </button>
            </div>

            {showUpload && (
              <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-6">
                <MediaUpload
                  projectId={id}
                  onUploadComplete={() => { loadData(); setShowUpload(false); }}
                />
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {(['tasks', 'photos', 'files'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                  activeTab === tab ? 'bg-white text-black' : 'border border-white/10 text-white hover:bg-white/10'
                }`}
              >
                {tab === 'tasks'  ? `${t('Tasks', 'משימות')} (${tasks.length})`
                : tab === 'photos' ? `${t('Media', 'מדיה')} (${photos.length + files.filter(f => f.mime_type?.startsWith('video/')).length})`
                :                    `${t('Files', 'קבצים')} (${files.filter(f => f.mime_type === 'application/pdf').length})`}
                </button>
            ))}
          </div>

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8 space-y-3">
              {displayedTasks.length === 0 ? (
                <p className="text-center text-white/50 py-8">{t('No tasks yet.', 'אין משימות עדיין.')}</p>
              ) : displayedTasks.map((task, i) => (
                <div
                  key={task.id}
                  onClick={() => window.location.href = `/projects/${id}/tasks/${task.id}`}
                  className="rounded-3xl border border-white/10 bg-black/40 p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition"
                >
                  <div>
                    <p className="font-medium">{task.title}</p>
                    {tasks[i]?.assignee && (
                      <p className="text-xs text-white/40 mt-1">👤 {tasks[i].assignee.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusColor(task.status)}`}>
                      {statusLabel(task.status)}
                    </span>
                    <span className="text-white/30 text-xs">→</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Photos Tab */}
            {activeTab === 'photos' && (
            <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8">
                {photos.length === 0 && files.filter(f => f.mime_type?.startsWith('video/')).length === 0 ? (
                <p className="text-center text-white/50 py-8">{t('No photos yet. Click Upload to add photos.', 'אין תמונות עדיין. לחץ על העלה להוספת תמונות.')}</p>
                ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {photos.map(photo => (
                    <MediaViewer key={photo.id} boxFileId={photo.url} mediaType="photo"
                        fileName={photo.metadata?.original_name} uploadedAt={photo.uploaded_at} />
                    ))}
                    {files.filter(f => f.mime_type?.startsWith('video/')).map(video => (
                    <MediaViewer key={video.id} boxFileId={video.object_key} mediaType="video"
                        fileName={video.description} uploadedAt={video.uploaded_at} />
                    ))}
                </div>
                )}
            </div>
            )}

          {/* Files Tab */}
            {activeTab === 'files' && (
            <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8 space-y-3">
                {files.filter(f => f.mime_type === 'application/pdf').length === 0 ? (
                <p className="text-center text-white/50 py-8">{t('No files yet. Click Upload to add files.', 'אין קבצים עדיין. לחץ על העלה להוספת קבצים.')}</p>
                ) : files.filter(f => f.mime_type === 'application/pdf').map(file => (
                <div key={file.id} className="rounded-3xl border border-white/10 bg-black/40 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">{file.description}</p>
                        <p className="text-xs text-white/40">{file.mime_type} · {(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    {file.red_flag && <span className="text-red-400 text-xs">🚩 {t('Red Flag', 'דגל אדום')}</span>}
                    </div>
                    <MediaViewer boxFileId={file.object_key} mediaType="document"
                    fileName={file.description} uploadedAt={file.uploaded_at} />
                </div>
                ))}
            </div>
            )}

        </section>
      </div>
    </div>
  );
}