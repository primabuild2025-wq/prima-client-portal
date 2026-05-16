'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MediaUpload from '@/components/MediaUpload';
import MediaViewer from '@/components/MediaViewer';
import { useLang } from '@/lib/context/LanguageContext';

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [task, setTask]                       = useState<any>(null);
  const [translatedTask, setTranslatedTask]   = useState<any>(null);
  const [translatedNotes, setTranslatedNotes] = useState<string[]>([]);
  const [files, setFiles]                     = useState<any[]>([]);
  const [photos, setPhotos]                   = useState<any[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [translating, setTranslating]         = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [activeTab, setActiveTab]             = useState<'details' | 'notes' | 'photos' | 'files'>('details');
  const [showUpload, setShowUpload]           = useState(false);
  const [updatingStatus, setUpdatingStatus]   = useState(false);
  const [currentUser, setCurrentUser]         = useState<any>(null);
  const [notes, setNotes]                     = useState('');
  const [editingNotes, setEditingNotes]       = useState(false);
  const [saving, setSaving]                   = useState(false);

  const { lang, t, translateContent } = useLang();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!task) return;
    applyTranslations(task);
  }, [lang, task]);

  const applyTranslations = async (data: any) => {
    setTranslating(true);
    try {
      const noteEntries = data.notes
        ? data.notes.split('\n\n').map((entry: string) => {
            const lines = entry.split('\n');
            return lines.slice(1).join('\n') || lines[0];
          })
        : [];

      const texts = [
        data.title || '',
        data.description || '',
        data.project?.name || '',
        ...noteEntries,
      ];

      const translated = await translateContent(texts);

      setTranslatedTask({
        ...data,
        title:       translated[0] || data.title,
        description: translated[1] || data.description,
        project: data.project ? {
          ...data.project,
          name: translated[2] || data.project.name,
        } : null,
      });

      setTranslatedNotes(translated.slice(3));
    } finally {
      setTranslating(false);
    }
  };

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/auth/login'; return; }

      const { data: user } = await supabase
        .from('users').select('*').eq('id', session.user.id).single();
      setCurrentUser(user);

      const isPrivileged = ['admin', 'management'].includes(user?.role);

      const [taskRes, filesRes, photosRes] = await Promise.all([
        supabase.from('tasks')
          .select('*, project:projects(name, id), assignee:users!assignee_id(name, email), creator:users!created_by(name)')
          .eq('id', id).single(),
        isPrivileged
          ? supabase.from('files').select('*').eq('task_id', id).order('created_at', { ascending: false })
          : supabase.from('files').select('*').eq('task_id', id)
              .or('pending_approval.eq.false,pending_approval.is.null')
              .order('created_at', { ascending: false }),
        supabase.from('photos').select('*').eq('task_id', id).order('created_at', { ascending: false }),
      ]);

      setTask(taskRes.data);
      setFiles(filesRes.data || []);
      setPhotos(photosRes.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setTask({ ...task, status: newStatus });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const saveNote = async () => {
    if (!notes.trim()) return;
    try {
      setSaving(true);
      const now        = new Date().toISOString();
      const authorName = currentUser?.name || 'Unknown';
      const newEntry   = `[${new Date(now).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })} at ${new Date(now).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit',
      })} — ${authorName}]\n${notes.trim()}`;
      const combined = task.notes ? `${task.notes}\n\n${newEntry}` : newEntry;
      const { error } = await supabase
        .from('tasks')
        .update({ notes: combined, notes_updated_at: now })
        .eq('id', id);
      if (error) throw error;
      setTask({ ...task, notes: combined, notes_updated_at: now });
      setNotes('');
      setEditingNotes(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (indexToDelete: number) => {
    try {
      setSaving(true);
      const entries = task.notes.split('\n\n');
      const updated = entries.filter((_: string, i: number) => i !== indexToDelete).join('\n\n');
      const now     = new Date().toISOString();
      const { error } = await supabase
        .from('tasks')
        .update({ notes: updated || null, notes_updated_at: now })
        .eq('id', id);
      if (error) throw error;
      setTask({ ...task, notes: updated || null, notes_updated_at: now });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'completed':   return 'text-green-700 bg-green-50 border-green-200';
      case 'not_started': return 'text-gray-500 bg-gray-100 border-gray-200';
      case 'blocked':     return 'text-red-600 bg-red-50 border-red-200';
      default:            return 'text-gray-500 bg-gray-100 border-gray-200';
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

  const displayed    = translatedTask || task;
  const noteEntries  = task?.notes ? task.notes.split('\n\n') : [];
  const pdfFiles     = files.filter(f => f.mime_type === 'application/pdf');
  const videoFiles   = files.filter(f => f.mime_type?.startsWith('video/'));
  const isPrivileged = ['admin', 'management'].includes(currentUser?.role);

  if (loading) return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <Header />
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#11144C]" />
      </div>
    </div>
  );

  if (error || !task) return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <Header />
      <div className="flex items-center justify-center h-96">
        <p className="text-red-500">{error || t('Task not found', 'משימה לא נמצאה')}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <Header />
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 px-4 md:px-6 pb-10 pt-6">
        <Sidebar />
        <section className="space-y-6">

          {/* Task Header */}
          <div className="rounded-3xl bg-[#11144C] p-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <button onClick={() => window.location.href = '/tasks'}
                  className="text-white/60 hover:text-white text-sm transition">
                  ← {t('Tasks', 'משימות')}
                </button>
                <div className="flex items-center gap-3 mt-2">
                  <h1 className="text-2xl font-semibold text-white">{displayed?.title}</h1>
                  {translating && <span className="text-xs text-white/40">{t('Translating…', 'מתרגם…')}</span>}
                </div>
                {displayed?.description && <p className="mt-1 text-white/70">{displayed.description}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusColor(task.status)}`}>
                    {statusLabel(task.status)}
                  </span>
                  {displayed?.project && (
                    <button onClick={() => window.location.href = `/projects/${task.project.id}`}
                      className="text-xs text-white/50 hover:text-white transition">
                      📁 {displayed.project.name}
                    </button>
                  )}
                  {task.assignee && <span className="text-xs text-white/50">👤 {task.assignee.name}</span>}
                  {task.creator  && <span className="text-xs text-white/50">{t('Created by', 'נוצר על ידי')} {task.creator.name}</span>}
                  {task.red_flag && <span className="text-red-400 text-xs">🚩 {t('Red Flag', 'דגל אדום')}</span>}
                </div>
              </div>
              <button onClick={() => setShowUpload(!showUpload)}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#11144C] hover:bg-gray-100 transition">
                + {t('Upload', 'העלה')}
              </button>
            </div>

            {/* Status Controls */}
            <div className="mt-6">
              <p className="text-sm text-white/50 mb-3">{t('Update Status', 'עדכן סטטוס')}</p>
              <div className="flex flex-wrap gap-2">
                {['not_started', 'in_progress', 'completed', 'blocked'].map(status => (
                  <button
                    key={status}
                    disabled={updatingStatus || task.status === status}
                    onClick={() => updateStatus(status)}
                    className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                      task.status === status
                        ? statusColor(status)
                        : 'border-white/20 text-white/60 hover:bg-white/10'
                    } disabled:opacity-50`}
                  >
                    {statusLabel(status)}
                  </button>
                ))}
              </div>
            </div>

            {showUpload && task.project && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-6">
                <MediaUpload
                  projectId={task.project.id}
                  taskId={id}
                  onUploadComplete={() => { loadData(); setShowUpload(false); }}
                />
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            {(['details', 'notes', 'photos', 'files'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                  activeTab === tab
                    ? 'bg-[#11144C] text-white'
                    : 'border border-gray-200 text-gray-600 bg-white hover:bg-gray-50'
                }`}>
                {tab === 'photos'
                  ? `${t('Media', 'מדיה')} (${photos.length + videoFiles.length})`
                  : tab === 'files'
                  ? `${t('Files', 'קבצים')} (${pdfFiles.length})`
                  : tab === 'notes'
                  ? `${t('Notes', 'הערות')} (${noteEntries.length})`
                  : t('Details', 'פרטים')}
              </button>
            ))}
          </div>

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-[#F5F6FA] border border-gray-200 p-4">
                  <p className="text-xs text-gray-400">{t('Created', 'נוצר')}</p>
                  <p className="mt-1 text-sm text-gray-900">{new Date(task.created_at).toLocaleString(lang === 'HE' ? 'he-IL' : 'en-US')}</p>
                </div>
                <div className="rounded-2xl bg-[#F5F6FA] border border-gray-200 p-4">
                  <p className="text-xs text-gray-400">{t('Last Updated', 'עודכן לאחרונה')}</p>
                  <p className="mt-1 text-sm text-gray-900">{new Date(task.updated_at).toLocaleString(lang === 'HE' ? 'he-IL' : 'en-US')}</p>
                </div>
                {task.assignee && (
                  <div className="rounded-2xl bg-[#F5F6FA] border border-gray-200 p-4">
                    <p className="text-xs text-gray-400">{t('Assigned To', 'מוקצה ל')}</p>
                    <p className="mt-1 text-sm text-gray-900">{task.assignee.name}</p>
                    <p className="text-xs text-gray-400">{task.assignee.email}</p>
                  </div>
                )}
                {displayed?.project && (
                  <div className="rounded-2xl bg-[#F5F6FA] border border-gray-200 p-4">
                    <p className="text-xs text-gray-400">{t('Project', 'פרויקט')}</p>
                    <p className="mt-1 text-sm text-gray-900">{displayed.project.name}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  {t('Notes', 'הערות')}
                </h2>
                {!editingNotes && (
                  <button
                    onClick={() => setEditingNotes(true)}
                    className="text-xs text-gray-500 hover:text-[#11144C] border border-gray-200 rounded-full px-3 py-1 transition"
                  >
                    + {t('Add note', 'הוסף הערה')}
                  </button>
                )}
              </div>

              {noteEntries.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {noteEntries.map((entry: string, i: number) => {
                    const lines    = entry.split('\n');
                    const header   = lines[0];
                    const isHeader = header.startsWith('[') && header.endsWith(']');
                    const body     = translatedNotes[i] || lines.slice(1).join('\n') || entry;
                    return (
                      <div key={i} className="rounded-2xl border border-gray-200 bg-[#F5F6FA] p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1">
                            {isHeader && (
                              <p className="text-xs text-gray-400">{header.slice(1, -1)}</p>
                            )}
                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{body}</p>
                          </div>
                          {currentUser?.role === 'admin' && (
                            <button
                              onClick={() => deleteNote(i)}
                              disabled={saving}
                              className="shrink-0 text-xs text-gray-300 hover:text-red-500 transition disabled:opacity-50"
                              title={t('Delete note', 'מחק הערה')}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-sm mb-6">{t('No notes yet.', 'אין הערות עדיין.')}</p>
              )}

              {editingNotes && (
                <div className="space-y-3">
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={4}
                    placeholder={t('Write a new note…', 'כתוב הערה חדשה…')}
                    className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] p-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#11144C] resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setEditingNotes(false); setNotes(''); }}
                      className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded-full px-3 py-1 transition"
                    >
                      {t('Cancel', 'ביטול')}
                    </button>
                    <button
                      onClick={saveNote}
                      disabled={saving || !notes.trim()}
                      className="text-xs font-semibold bg-[#11144C] text-white rounded-full px-4 py-1 hover:bg-[#1a1f6e] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? t('Saving…', 'שומר…') : t('Add note', 'הוסף הערה')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Photos Tab */}
          {activeTab === 'photos' && (
            <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">
              {photos.length === 0 && videoFiles.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  {t('No photos yet. Click Upload to add photos.', 'אין תמונות עדיין. לחץ על העלה להוספת תמונות.')}
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {photos.map(photo => (
                    <MediaViewer key={photo.id} boxFileId={photo.url} mediaType="photo"
                      fileName={photo.metadata?.original_name} uploadedAt={photo.uploaded_at} />
                  ))}
                  {videoFiles.map(video => (
                    <MediaViewer key={video.id} boxFileId={video.object_key} mediaType="video"
                      fileName={video.description} uploadedAt={video.uploaded_at} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8 space-y-3">
              {pdfFiles.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  {t('No files yet. Click Upload to add files.', 'אין קבצים עדיין. לחץ על העלה להוספת קבצים.')}
                </p>
              ) : pdfFiles.map(file => (
                <div key={file.id} className="rounded-2xl border border-gray-200 bg-[#F5F6FA] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{file.description}</p>
                      <p className="text-xs text-gray-400">{file.mime_type} · {(file.size / 1024).toFixed(1)} KB</p>
                      {file.pending_approval && !file.approval_note && isPrivileged && (
                        <p className="text-xs text-amber-600 mt-1">⏳ {t('Waiting for approval', 'ממתין לאישור')}</p>
                      )}
                      {file.approval_note && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ {t('Approved', 'אושר')} · {file.approval_note.split('\n')[0].replace(/[\[\]]/g, '')}
                        </p>
                      )}
                    </div>
                    {file.red_flag && <span className="text-red-500 text-xs">🚩 {t('Red Flag', 'דגל אדום')}</span>}
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