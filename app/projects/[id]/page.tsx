'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MediaUpload from '@/components/MediaUpload';
import MediaViewer from '@/components/MediaViewer';
import { useLang } from '@/lib/context/LanguageContext';
import { useAdminDelete } from '@/lib/hooks/useAdminDelete';
import ProjectChecklist from '@/components/ProjectChecklist';


export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [project, setProject]         = useState<any>(null);
  const [tasks, setTasks]             = useState<any[]>([]);
  const [files, setFiles]             = useState<any[]>([]);
  const [photos, setPhotos]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'photos' | 'files' | 'checklist'>('tasks');
  const [showUpload, setShowUpload]   = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const { t } = useLang();

  const { deleteFile, deletePhoto } = useAdminDelete();
const [deletingId, setDeletingId] = useState<string | null>(null);

const handleDeleteFile = async (fileId: string) => {
  if (!confirm(t('Delete this file?', 'למחוק קובץ זה?'))) return;
  setDeletingId(fileId);
  try {
    await deleteFile(fileId);
    setFiles(files.filter(f => f.id !== fileId));
  } catch (err: any) {
    setError(err.message);
  } finally {
    setDeletingId(null);
  }
};

const handleDeletePhoto = async (photoId: string) => {
  if (!confirm(t('Delete this photo?', 'למחוק תמונה זו?'))) return;
  setDeletingId(photoId);
  try {
    await deletePhoto(photoId);
    setPhotos(photos.filter(p => p.id !== photoId));
  } catch (err: any) {
    setError(err.message);
  } finally {
    setDeletingId(null);
  }
};

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/auth/login'; return; }

      const { data: user } = await supabase
        .from('users').select('*').eq('id', session.user.id).single();
      setCurrentUser(user);

      const isPrivileged = ['admin', 'management'].includes(user?.role);

      const [projectRes, tasksRes, filesRes, photosRes] = await Promise.all([
        supabase.from('projects')
          .select('*, owner:users!owner_id(name, email)')
          .eq('id', id).single(),
        supabase.from('tasks').select('*, assignee:users!assignee_id(name)').eq('project_id', id).order('created_at', { ascending: false }),
        isPrivileged
          ? supabase.from('files').select('*').eq('project_id', id)
              .order('created_at', { ascending: false })
          : supabase.from('files').select('*').eq('project_id', id)
              .or('pending_approval.eq.false,pending_approval.is.null')
              .order('created_at', { ascending: false }),
        supabase.from('photos').select('*').eq('project_id', id)
          .order('created_at', { ascending: false }),
      ]);

      setProject(projectRes.data);
      setTasks(tasksRes.data || []);
      const statusOrder: Record<string, number> = {
        not_started: 0,
        in_progress: 1,
        completed:   2,
        blocked:     3,
      };

      const sortedTasks = (tasksRes.data || []).sort((a: any, b: any) => {
        const orderDiff = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
        if (orderDiff !== 0) return orderDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setTasks(sortedTasks);
      setFiles(filesRes.data || []);
      setPhotos(photosRes.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pdfFiles   = files.filter(f => f.mime_type === 'application/pdf');
  const videoFiles = files.filter(f => f.mime_type?.startsWith('video/'));

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

  const isPrivileged = ['admin', 'management'].includes(currentUser?.role);

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
                <h1 className="mt-2 text-2xl font-semibold">{project.name}</h1>
                {project.description && (
                  <p className="mt-1 text-white/60">{project.description}</p>
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

                {isPrivileged && (
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
            {(['tasks', 'photos', 'files', 'checklist'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                activeTab === tab ? 'bg-white text-black' : 'border border-white/10 text-white hover:bg-white/10'
              }`}
            >
              {tab === 'tasks'
                ? `${t('Tasks', 'משימות')} (${tasks.length})`
                : tab === 'photos'
                ? `${t('Photos', 'תמונות')} (${photos.length + videoFiles.length})`
                : tab === 'files'
                ? `${t('Files', 'קבצים')} (${pdfFiles.length})`
                : t('Checklist', 'רשימת משימות')}
            </button>
          ))}
          </div>

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8 space-y-3">
              {tasks.length === 0 ? (
                <p className="text-center text-white/50 py-8">{t('No tasks yet.', 'אין משימות עדיין.')}</p>
              ) : tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => window.location.href = `/projects/${id}/tasks/${task.id}`}
                  className="rounded-3xl border border-white/10 bg-black/40 p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition"
                >
                  <div>
                    <p className="font-medium">{task.title}</p>
                    {task.assignee && (
                      <p className="text-xs text-white/40 mt-1">👤 {task.assignee.name}</p>
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

          {/* Photos Tab — images + videos */}
          {activeTab === 'photos' && (
            <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8">
              {photos.length === 0 && videoFiles.length === 0 ? (
                <p className="text-center text-white/50 py-8">
                  {t('No photos yet. Click Upload to add photos.', 'אין תמונות עדיין. לחץ על העלה להוספת תמונות.')}
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {photos.map(photo => (
                    <div key={photo.id} className="relative group">
                      <MediaViewer boxFileId={photo.url} mediaType="photo"
                        fileName={photo.metadata?.original_name} uploadedAt={photo.uploaded_at} />
                      {isPrivileged && (
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          disabled={deletingId === photo.id}
                          className="absolute top-2 right-2 rounded-full bg-red-500/80 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
                        >
                          {deletingId === photo.id ? '…' : t('Delete', 'מחק')}
                        </button>
                      )}
                    </div>
                  ))}
                  {videoFiles.map(video => (
                    <div key={video.id} className="relative group">
                      <MediaViewer boxFileId={video.object_key} mediaType="video"
                        fileName={video.description} uploadedAt={video.uploaded_at} />
                      {isPrivileged && (
                        <button
                          onClick={() => handleDeleteFile(video.id)}
                          disabled={deletingId === video.id}
                          className="absolute top-2 right-2 rounded-full bg-red-500/80 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
                        >
                          {deletingId === video.id ? '…' : t('Delete', 'מחק')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Files Tab — PDFs only */}
          {activeTab === 'files' && (
            <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8 space-y-3">
              {pdfFiles.length === 0 ? (
                <p className="text-center text-white/50 py-8">
                  {t('No files yet. Click Upload to add files.', 'אין קבצים עדיין. לחץ על העלה להוספת קבצים.')}
                </p>
              ) : pdfFiles.map(file => (
                <div key={file.id} className="rounded-3xl border border-white/10 bg-black/40 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{file.description}</p>
                      <p className="text-xs text-white/40">
                        {file.mime_type} · {(file.size / 1024).toFixed(1)} KB
                      </p>
                      {/* Pending approval badge — only admins see this */}
                      {file.pending_approval && isPrivileged && (
                        <p className="text-xs text-amber-400 mt-1">
                          ⏳ {t('Waiting for approval', 'ממתין לאישור')}
                        </p>
                      )}
                      {/* Approval note */}
                      {file.approval_note && (
                        <p className="text-xs text-green-400/70 mt-1">
                          ✓ {t('Approved', 'אושר')} · {file.approval_note.split('\n')[0].replace(/[\[\]]/g, '')}
                        </p>
                      )}
                    </div>
                    {file.red_flag && (
                      <span className="text-red-400 text-xs">🚩 {t('Red Flag', 'דגל אדום')}</span>
                    )}
                  </div>
                  {isPrivileged && (
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      disabled={deletingId === file.id}
                      className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                    >
                      {deletingId === file.id ? '…' : t('Delete', 'מחק')}
                    </button>
                  )}
                  <MediaViewer
                    boxFileId={file.object_key}
                    mediaType="document"
                    fileName={file.description}
                    uploadedAt={file.uploaded_at}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Checklist Tab */}
          {activeTab === 'checklist' && (
            <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8">
              <ProjectChecklist
                projectId={id}
                isPrivileged={isPrivileged}
              />
            </div>
          )}

        </section>
      </div>
    </div>
  );
}