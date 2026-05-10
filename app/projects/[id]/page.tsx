'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MediaUpload from '@/components/MediaUpload';
import MediaViewer from '@/components/MediaViewer';
import { useLang } from '@/lib/context/LanguageContext';
import { useAdminDelete } from '@/lib/hooks/useAdminDelete';
import ProjectChecklist from '@/components/ProjectChecklist';

const MEDIA_CATEGORIES = [
  'Plumbing',
  'Electric',
  'Prep for Waterproof',
  'Fail Pt',
  'Drains',
  'Drain Video',
  'General',
];

function encodeMediaFilename(originalName: string, description: string): string {
  const ts   = Date.now();
  const desc = description.trim()
    ? btoa(unescape(encodeURIComponent(description.trim()))).replace(/[/+=]/g, '-')
    : '';
  return desc ? `${ts}__${desc}__${originalName}` : `${ts}__${originalName}`;
}

function parseMediaFilename(filename: string): { displayName: string; description: string; uploadedAt: string } {
  const parts = filename.split('__');
  let ts          = '';
  let description = '';
  let displayName = filename;

  if (parts.length === 3) {
    ts          = parts[0];
    displayName = parts[2];
    try { description = decodeURIComponent(escape(atob(parts[1].replace(/-/g, '+')))); } catch { description = ''; }
  } else if (parts.length === 2) {
    ts          = parts[0];
    displayName = parts[1];
  }

  let uploadedAt = '';
  if (ts && /^\d+$/.test(ts)) {
    uploadedAt = new Date(parseInt(ts)).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return { displayName, description, uploadedAt };
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [project, setProject]         = useState<any>(null);
  const [tasks, setTasks]             = useState<any[]>([]);
  const [files, setFiles]             = useState<any[]>([]);
  const [photos, setPhotos]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [activeTab, setActiveTab]     = useState<'tasks' | 'photos' | 'files' | 'checklist' | 'workmedia' | 'paperwork'>('tasks');
  const [showUpload, setShowUpload]   = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Work Media state
  const [workMedia, setWorkMedia]               = useState<{ category: string; url: string; name: string; path: string }[]>([]);
  const [loadingMedia, setLoadingMedia]         = useState(false);
  const [showMediaUpload, setShowMediaUpload]   = useState(false);
  const [mediaCategory, setMediaCategory]       = useState('');
  const [mediaDescription, setMediaDescription] = useState('');
  const [mediaFiles, setMediaFiles]             = useState<FileList | null>(null);
  const [uploadingMedia, setUploadingMedia]     = useState(false);
  const [mediaError, setMediaError]             = useState<string | null>(null);
  const [mediaSuccess, setMediaSuccess]         = useState(false);
  const fileInputRef                            = useRef<HTMLInputElement>(null);

  // Paperwork state
  const [showPaperworkUpload, setShowPaperworkUpload]   = useState(false);
  const [paperworkDescription, setPaperworkDescription] = useState('');
  const [paperworkFile, setPaperworkFile]               = useState<File | null>(null);
  const [uploadingPaperwork, setUploadingPaperwork]     = useState(false);
  const [paperworkError, setPaperworkError]             = useState<string | null>(null);
  const [paperworkSuccess, setPaperworkSuccess]         = useState(false);
  const paperworkInputRef                               = useRef<HTMLInputElement>(null);

  const { t } = useLang();
  const { deleteFile, deletePhoto } = useAdminDelete();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (activeTab === 'workmedia') loadWorkMedia();
  }, [activeTab]);

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
        supabase.from('tasks')
          .select('*, assignee:users!assignee_id(name)')
          .eq('project_id', id)
          .order('created_at', { ascending: false }),
        isPrivileged
          ? supabase.from('files').select('*').eq('project_id', id).order('created_at', { ascending: false })
          : supabase.from('files').select('*').eq('project_id', id)
              .or('pending_approval.eq.false,pending_approval.is.null')
              .order('created_at', { ascending: false }),
        supabase.from('photos').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      ]);

      setProject(projectRes.data);

      const statusOrder: Record<string, number> = { not_started: 0, in_progress: 1, completed: 2, blocked: 3 };
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

  const loadWorkMedia = async () => {
    setLoadingMedia(true);
    try {
      const allMedia: { category: string; url: string; name: string; path: string }[] = [];
      for (const category of MEDIA_CATEGORIES) {
        const prefix = `projects/${id}/work-media/${category}/`;
        const { data: items } = await supabase.storage.from('project-media').list(prefix);
        if (items) {
          for (const item of items) {
            const path = `${prefix}${item.name}`;
            const { data: urlData } = supabase.storage.from('project-media').getPublicUrl(path);
            allMedia.push({ category, url: urlData.publicUrl, name: item.name, path });
          }
        }
      }
      setWorkMedia(allMedia);
    } catch (err: any) {
      setMediaError(err.message);
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleMediaUpload = async () => {
    if (!mediaCategory) { setMediaError(t('Please select a category.', 'אנא בחר קטגוריה.')); return; }
    if (!mediaFiles || mediaFiles.length === 0) { setMediaError(t('Please select files.', 'אנא בחר קבצים.')); return; }
    setUploadingMedia(true);
    setMediaError(null);
    try {
      for (const file of Array.from(mediaFiles)) {
        const filename = encodeMediaFilename(file.name, mediaDescription);
        const path = `projects/${id}/work-media/${mediaCategory}/${filename}`;
        const { error: uploadError } = await supabase.storage
          .from('project-media').upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;
      }
      setMediaSuccess(true);
      setTimeout(() => {
        setShowMediaUpload(false);
        setMediaCategory('');
        setMediaDescription('');
        setMediaFiles(null);
        setMediaSuccess(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadWorkMedia();
      }, 1200);
    } catch (err: any) {
      setMediaError(err.message);
    } finally {
      setUploadingMedia(false);
    }
  };

  const handlePaperworkUpload = async () => {
    if (!paperworkDescription.trim()) {
      setPaperworkError(t('Description is required.', 'תיאור הוא שדה חובה.'));
      return;
    }
    if (!paperworkFile) {
      setPaperworkError(t('Please select a file.', 'אנא בחר קובץ.'));
      return;
    }
    setUploadingPaperwork(true);
    setPaperworkError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('file', paperworkFile);
      formData.append('projectId', id);
      formData.append('description', paperworkDescription.substring(0, 20));
      formData.append('uploadedAt', new Date().toISOString());
      formData.append('fileType', 'paperwork');

      const res  = await fetch('/api/media/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPaperworkSuccess(true);
      setTimeout(() => {
        setShowPaperworkUpload(false);
        setPaperworkDescription('');
        setPaperworkFile(null);
        setPaperworkSuccess(false);
        if (paperworkInputRef.current) paperworkInputRef.current.value = '';
        loadData();
      }, 1200);
    } catch (err: any) {
      setPaperworkError(err.message);
    } finally {
      setUploadingPaperwork(false);
    }
  };

  const handleDeleteWorkMedia = async (path: string) => {
    if (!confirm(t('Delete this file?', 'למחוק קובץ זה?'))) return;
    const { error } = await supabase.storage.from('project-media').remove([path]);
    if (!error) setWorkMedia(prev => prev.filter(m => m.path !== path));
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm(t('Delete this file?', 'למחוק קובץ זה?'))) return;
    setDeletingId(fileId);
    try {
      await deleteFile(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
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
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const pdfFiles      = files.filter(f => f.mime_type === 'application/pdf' && f.file_type !== 'paperwork');
  const videoFiles    = files.filter(f => f.mime_type?.startsWith('video/'));
  const paperworkFiles = files.filter(f => f.file_type === 'paperwork');
  const isVideo       = (name: string) => /\.(mp4|mov|avi|webm|mkv)$/i.test(name);

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
      const { error } = await supabase.from('projects').update({
        status: newStatus,
        activated_at: newStatus === 'active' ? new Date().toISOString() : undefined,
      }).eq('id', id);
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

  const mediaByCategory = MEDIA_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = workMedia.filter(m => m.category === cat);
    return acc;
  }, {} as Record<string, typeof workMedia>);

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
          <div className="flex gap-2 flex-wrap">
            {(['tasks', 'photos', 'files', 'paperwork', 'checklist', 'workmedia'] as const).map(tab => (
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
                  : tab === 'paperwork'
                  ? ` ${t('Paperwork', 'ניירת')}${paperworkFiles.length > 0 ? ` (${paperworkFiles.length})` : ''}`
                  : tab === 'checklist'
                  ? t('Checklist', 'רשימת משימות')
                  : `${t('Work Media', 'מדיית עבודה')}${workMedia.length > 0 ? ` (${workMedia.length})` : ''}`}
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

          {/* Photos Tab */}
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

          {/* Files Tab */}
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
                      {file.category && (
                        <span className="inline-block mt-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/50">
                          {file.category}
                        </span>
                      )}
                      <p className="text-xs text-white/40 mt-1">{file.mime_type} · {(file.size / 1024).toFixed(1)} KB</p>
                      {file.pending_approval && !file.approval_note && isPrivileged && (
                        <p className="text-xs text-amber-400 mt-1">⏳ {t('Waiting for approval', 'ממתין לאישור')}</p>
                      )}
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
                  <MediaViewer boxFileId={file.object_key} mediaType="document"
                    fileName={file.description} uploadedAt={file.uploaded_at} />
                </div>
              ))}
            </div>
          )}

          {/* Paperwork Tab */}
          {activeTab === 'paperwork' && (
            <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">📄 {t('Paperwork', 'ניירת')}</h2>
                  <p className="text-sm text-white/50 mt-0.5">{t('Contracts, permits, and other documents', 'חוזים, היתרים ומסמכים אחרים')}</p>
                </div>
                {isPrivileged && (
                  <button
                    onClick={() => { setShowPaperworkUpload(true); setPaperworkDescription(''); setPaperworkFile(null); setPaperworkError(null); setPaperworkSuccess(false); }}
                    className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-slate-200 transition"
                  >
                    + {t('Upload', 'העלה')}
                  </button>
                )}
              </div>

              {paperworkFiles.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-black/40 p-10 text-center">
                  <p className="text-white/50 mb-4">{t('No paperwork yet.', 'אין ניירת עדיין.')}</p>
                  {isPrivileged && (
                    <button
                      onClick={() => { setShowPaperworkUpload(true); setPaperworkDescription(''); setPaperworkFile(null); setPaperworkError(null); setPaperworkSuccess(false); }}
                      className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-slate-200 transition"
                    >
                      + {t('Upload first document', 'העלה מסמך ראשון')}
                    </button>
                  )}
                </div>
              ) : paperworkFiles.map(file => (
                <div key={file.id} className="rounded-3xl border border-white/10 bg-black/40 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{file.description}</p>
                      <p className="text-xs text-white/40 mt-1">{file.mime_type} · {(file.size / 1024).toFixed(1)} KB</p>
                      {file.uploaded_at && (
                        <p className="text-xs text-white/30 mt-0.5">
                          🕐 {new Date(file.uploaded_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
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
                  <MediaViewer boxFileId={file.object_key} mediaType="document"
                    fileName={file.description} uploadedAt={file.uploaded_at} />
                </div>
              ))}
            </div>
          )}

          {/* Checklist Tab */}
          {activeTab === 'checklist' && (
            <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8">
              <ProjectChecklist projectId={id} isPrivileged={isPrivileged} />
            </div>
          )}

          {/* Work Media Tab */}
          {activeTab === 'workmedia' && (
            <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">📷 {t('Work Media', 'מדיית עבודה')}</h2>
                  <p className="text-sm text-white/50 mt-0.5">{t('Site photos and videos by category', 'תמונות וסרטונים מהאתר לפי קטגוריה')}</p>
                </div>
                <button
                  onClick={() => { setShowMediaUpload(true); setMediaCategory(''); setMediaDescription(''); setMediaFiles(null); setMediaError(null); setMediaSuccess(false); }}
                  className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-slate-200 transition"
                >
                  + {t('Upload', 'העלה')}
                </button>
              </div>

              {loadingMedia ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                </div>
              ) : workMedia.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-black/40 p-10 text-center">
                  <p className="text-white/50 mb-4">{t('No work media yet.', 'אין מדיית עבודה עדיין.')}</p>
                  <button
                    onClick={() => { setShowMediaUpload(true); setMediaCategory(''); setMediaDescription(''); setMediaFiles(null); setMediaError(null); setMediaSuccess(false); }}
                    className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-slate-200 transition"
                  >
                    + {t('Upload first media', 'העלה מדיה ראשונה')}
                  </button>
                </div>
              ) : (
                MEDIA_CATEGORIES.map(category => {
                  const items = mediaByCategory[category];
                  if (items.length === 0) return null;
                  return (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-white/80">{category}</h3>
                        <span className="text-xs text-white/30 bg-white/5 rounded-full px-2 py-0.5">{items.length}</span>
                        <div className="flex-1 h-px bg-white/10" />
                      </div>
                      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                        {items.map(item => {
                          const { displayName, description, uploadedAt } = parseMediaFilename(item.name);
                          return (
                            <div key={item.path} className="relative group rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                              {isVideo(item.name) ? (
                                <video src={item.url} controls className="w-full aspect-square object-cover" />
                              ) : (
                                <a href={item.url} target="_blank" rel="noopener noreferrer">
                                  <img src={item.url} alt={displayName}
                                    className="w-full aspect-square object-cover hover:opacity-90 transition" />
                                </a>
                              )}
                              <div className="px-2 py-2 space-y-0.5">
                                {description && <p className="text-xs text-white/80 font-medium truncate">{description}</p>}
                                {uploadedAt && <p className="text-xs text-white/30">🕐 {uploadedAt}</p>}
                                {!description && !uploadedAt && <p className="text-xs text-white/40 truncate">{displayName}</p>}
                              </div>
                              {isPrivileged && (
                                <button
                                  onClick={() => handleDeleteWorkMedia(item.path)}
                                  className="absolute top-2 right-2 rounded-full bg-red-500/80 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition"
                                >
                                  {t('Delete', 'מחק')}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </section>
      </div>

      {/* Work Media Upload Modal */}
      {showMediaUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#11144C] p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">📷 {t('Upload Work Media', 'העלאת מדיית עבודה')}</h3>
              <button onClick={() => setShowMediaUpload(false)} className="text-white/40 hover:text-white transition text-lg">✕</button>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-white">{t('Category', 'קטגוריה')}</label>
              <select value={mediaCategory} onChange={(e) => setMediaCategory(e.target.value)}
                className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white">
                <option value="">{t('Select a category...', 'בחר קטגוריה...')}</option>
                {MEDIA_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                {t('Description', 'תיאור')} <span className="text-white/30 font-normal">({t('optional', 'אופציונלי')})</span>
              </label>
              <input type="text" value={mediaDescription} onChange={(e) => setMediaDescription(e.target.value)}
                placeholder={t('e.g. Before waterproofing', 'לדוג. לפני איטום')}
                className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white placeholder:text-white/30" />
            </div>
            <div>
              <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden"
                onChange={(e) => setMediaFiles(e.target.files)} />
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-3xl border-2 border-dashed border-white/20 bg-black/30 px-4 py-6 text-sm text-white/60 hover:border-white/40 hover:text-white/80 transition text-center">
                {mediaFiles && mediaFiles.length > 0
                  ? `✅ ${mediaFiles.length} ${t('file(s) selected', 'קבצים נבחרו')}`
                  : `⬆️ ${t('Click to select photos or videos', 'לחץ לבחירת תמונות או סרטונים')}`}
              </button>
            </div>
            {mediaError   && <p className="text-sm text-red-400">{mediaError}</p>}
            {mediaSuccess && <p className="text-sm text-green-400">✅ {t('Uploaded successfully!', 'הועלה בהצלחה!')}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowMediaUpload(false)}
                className="flex-1 rounded-full border border-white/10 px-5 py-3 text-sm text-white hover:bg-white/10 transition">
                {t('Cancel', 'ביטול')}
              </button>
              <button onClick={handleMediaUpload} disabled={uploadingMedia}
                className="flex-1 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-slate-200 transition disabled:opacity-50">
                {uploadingMedia ? t('Uploading...', 'מעלה...') : t('Upload', 'העלה')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paperwork Upload Modal */}
      {showPaperworkUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#11144C] p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">📄 {t('Upload Paperwork', 'העלאת ניירת')}</h3>
              <button onClick={() => setShowPaperworkUpload(false)} className="text-white/40 hover:text-white transition text-lg">✕</button>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                {t('Description', 'תיאור')} <span className="text-red-400">*</span>{' '}
                <span className="text-white/30 font-normal">({t('max 20 chars', 'עד 20 תווים')})</span>
              </label>
              <input
                type="text"
                value={paperworkDescription}
                onChange={(e) => setPaperworkDescription(e.target.value.substring(0, 20))}
                placeholder={t('e.g. Building permit', 'לדוג. היתר בנייה')}
                maxLength={20}
                className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white placeholder:text-white/30"
              />
              <p className="mt-1 text-right text-xs text-white/30">{paperworkDescription.length}/20</p>
            </div>
            <div>
              <input ref={paperworkInputRef} type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setPaperworkFile(f); }} />
              {!paperworkFile ? (
                <button onClick={() => paperworkInputRef.current?.click()}
                  className="w-full rounded-3xl border-2 border-dashed border-white/20 bg-black/30 px-4 py-6 text-sm text-white/60 hover:border-white/40 hover:text-white/80 transition text-center">
                  ⬆️ {t('Click to select a file', 'לחץ לבחירת קובץ')}
                </button>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">📄 {paperworkFile.name}</p>
                    <p className="text-xs text-white/40 mt-0.5">{(paperworkFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={() => { setPaperworkFile(null); if (paperworkInputRef.current) paperworkInputRef.current.value = ''; }}
                    className="text-white/30 hover:text-white text-lg leading-none transition">✕</button>
                </div>
              )}
            </div>
            {paperworkError   && <p className="text-sm text-red-400">{paperworkError}</p>}
            {paperworkSuccess && <p className="text-sm text-green-400">✅ {t('Uploaded successfully!', 'הועלה בהצלחה!')}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowPaperworkUpload(false)}
                className="flex-1 rounded-full border border-white/10 px-5 py-3 text-sm text-white hover:bg-white/10 transition">
                {t('Cancel', 'ביטול')}
              </button>
              <button onClick={handlePaperworkUpload} disabled={uploadingPaperwork}
                className="flex-1 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-slate-200 transition disabled:opacity-50">
                {uploadingPaperwork ? t('Uploading...', 'מעלה...') : t('Upload', 'העלה')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}