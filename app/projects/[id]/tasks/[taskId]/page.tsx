'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useLang } from '@/lib/context/LanguageContext';

export default function TaskDetailPage({ params }: { params: { id: string; taskId: string } }) {
  const { id, taskId } = params;
  const [task, setTask]                       = useState<any>(null);
  const [translatedTask, setTranslatedTask]   = useState<any>(null);
  const [translatedNotes, setTranslatedNotes] = useState<string[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [translating, setTranslating]         = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [saving, setSaving]                   = useState(false);
  const [notes, setNotes]                     = useState('');
  const [editingNotes, setEditingNotes]       = useState(false);
  const [currentUser, setCurrentUser]         = useState<any>(null);

  // Photo state
  const [photos, setPhotos]                   = useState<any[]>([]);
  const [uploadingPhoto, setUploadingPhoto]   = useState(false);
  const [photoError, setPhotoError]           = useState<string | null>(null);
  const [photoDescription, setPhotoDescription] = useState('');
  const [showPhotoForm, setShowPhotoForm]     = useState(false);
  const [selectedPhoto, setSelectedPhoto]     = useState<File | null>(null);
  const cameraInputRef                        = useRef<HTMLInputElement>(null);
  const galleryInputRef                       = useRef<HTMLInputElement>(null);

  const { lang, t, translateContent } = useLang();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => { loadTask(); }, []);

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

  const loadTask = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/auth/login'; return; }

      const { data: user } = await supabase.from('users').select('*').eq('id', session.user.id).single();
      setCurrentUser(user);

      const [taskRes, photosRes] = await Promise.all([
        supabase.from('tasks')
          .select('*, assignee:users!assignee_id(name, email), project:projects!project_id(name, id)')
          .eq('id', taskId)
          .single(),
        supabase.from('photos')
          .select('*')
          .eq('task_id', taskId)
          .order('uploaded_at', { ascending: false }),
      ]);

      if (taskRes.error) throw taskRes.error;
      setTask(taskRes.data);
      setPhotos(photosRes.data || []);
      setNotes('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (file: File) => {
    setSelectedPhoto(file);
    setPhotoError(null);
    setShowPhotoForm(true);
  };

  const handlePhotoUpload = async () => {
    if (!selectedPhoto || !task?.project?.id) return;
    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedPhoto);
      formData.append('projectId', task.project.id);
      formData.append('taskId', taskId);
      formData.append('description', photoDescription.substring(0, 20) || selectedPhoto.name.substring(0, 20));
      formData.append('uploadedAt', new Date().toISOString());

      const res  = await fetch('/api/media/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSelectedPhoto(null);
      setPhotoDescription('');
      setShowPhotoForm(false);
      if (cameraInputRef.current)  cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';

      // Reload photos
      const { data: newPhotos } = await supabase
        .from('photos').select('*').eq('task_id', taskId).order('uploaded_at', { ascending: false });
      setPhotos(newPhotos || []);
    } catch (err: any) {
      setPhotoError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      setSaving(true);
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
      if (error) throw error;
      setTask({ ...task, status: newStatus });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    if (!notes.trim()) return;
    try {
      setSaving(true);
      const now           = new Date().toISOString();
      const existingNotes = task.notes || '';
      const authorName    = currentUser?.name || 'Unknown';
      const newEntry = `[${new Date(now).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })} at ${new Date(now).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit',
      })} — ${authorName}]\n${notes.trim()}`;
      const combined = existingNotes ? `${existingNotes}\n\n${newEntry}` : newEntry;
      const { error } = await supabase
        .from('tasks')
        .update({ notes: combined, notes_updated_at: now })
        .eq('id', taskId);
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
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('tasks')
        .update({ notes: updated || null, notes_updated_at: now })
        .eq('id', taskId);
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
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
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

  const statuses  = ['not_started', 'in_progress', 'completed', 'blocked'];
  const displayed = translatedTask || task;

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

  const noteEntries = task.notes ? task.notes.split('\n\n') : [];

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <Header />
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 px-4 md:px-6 pb-10 pt-6">
        <Sidebar />
        <section className="space-y-6">

          {/* Header */}
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">
            <button
              onClick={() => window.location.href = `/projects/${id}`}
              className="text-gray-400 hover:text-[#11144C] text-sm transition"
            >
              ← {displayed?.project?.name ?? t('Project', 'פרויקט')}
            </button>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold text-gray-900">{displayed?.title}</h1>
                  {translating && (
                    <span className="text-xs text-gray-400">{t('Translating…', 'מתרגם…')}</span>
                  )}
                </div>
                {displayed?.description && (
                  <p className="mt-2 text-gray-500 leading-relaxed">{displayed.description}</p>
                )}
              </div>
              <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${statusColor(task.status)}`}>
                {statusLabel(task.status)}
              </span>
            </div>
          </div>

          {/* Change Status */}
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              {t('Status', 'סטטוס')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {statuses.map(status => (
                <button
                  key={status}
                  disabled={task.status === status || saving}
                  onClick={() => updateStatus(status)}
                  className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                    task.status === status
                      ? statusColor(status)
                      : 'border-gray-200 text-gray-400 hover:bg-[#11144C]/5 hover:border-[#11144C]/30'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {statusLabel(status)}
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">
              {t('Details', 'פרטים')}
            </h2>
            <div className="grid grid-cols-2 gap-6">
              {task.assignee && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">{t('Assignee', 'אחראי')}</p>
                  <p className="font-medium text-gray-900">👤 {task.assignee.name}</p>
                  {task.assignee.email && (
                    <p className="text-xs text-gray-400">{task.assignee.email}</p>
                  )}
                </div>
              )}
              {task.due_date && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">{t('Due Date', 'תאריך יעד')}</p>
                  <p className="font-medium text-gray-900">
                    {new Date(task.due_date).toLocaleDateString(lang === 'HE' ? 'he-IL' : 'en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                </div>
              )}
              {task.priority && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">{t('Priority', 'עדיפות')}</p>
                  <p className="font-medium text-gray-900 capitalize">{task.priority}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 mb-1">{t('Created', 'נוצר')}</p>
                <p className="font-medium text-gray-900">
                  {new Date(task.created_at).toLocaleDateString(lang === 'HE' ? 'he-IL' : 'en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                {t('Photos', 'תמונות')} {photos.length > 0 && `(${photos.length})`}
              </h2>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); }}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); }}
            />

            {/* Upload buttons */}
            {!showPhotoForm && (
              <div className="flex gap-3 mb-5">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-[#F5F6FA] py-4 text-sm text-gray-500 hover:border-[#11144C]/30 hover:text-[#11144C] transition"
                >
                  📷 {t('Take Photo', 'צלם תמונה')}
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-[#F5F6FA] py-4 text-sm text-gray-500 hover:border-[#11144C]/30 hover:text-[#11144C] transition"
                >
                  🖼️ {t('Choose from Gallery', 'בחר מהגלריה')}
                </button>
              </div>
            )}

            {/* Selected photo form */}
            {showPhotoForm && selectedPhoto && (
              <div className="mb-5 rounded-2xl border border-gray-200 bg-[#F5F6FA] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">📷 {selectedPhoto.name}</p>
                  <button
                    onClick={() => { setSelectedPhoto(null); setShowPhotoForm(false); setPhotoDescription(''); }}
                    className="text-gray-400 hover:text-gray-700 transition"
                  >✕</button>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    {t('Description', 'תיאור')} <span className="text-gray-400 font-normal">({t('optional', 'אופציונלי')})</span>
                  </label>
                  <input
                    type="text"
                    value={photoDescription}
                    onChange={(e) => setPhotoDescription(e.target.value.substring(0, 20))}
                    placeholder={t('e.g. Before work', 'לדוג. לפני עבודה')}
                    maxLength={20}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#11144C]/30"
                  />
                </div>
                {photoError && <p className="text-xs text-red-500">{photoError}</p>}
                <button
                  onClick={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="w-full rounded-full bg-[#11144C] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1a1f6e] transition disabled:opacity-50"
                >
                  {uploadingPhoto ? t('Uploading…', 'מעלה...') : t('Upload Photo', 'העלה תמונה')}
                </button>
              </div>
            )}

            {/* Photos grid */}
            {photos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">{t('No photos yet.', 'אין תמונות עדיין.')}</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {photos.map(photo => (
                  <div key={photo.id} className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 aspect-square">
                    <img
                      src={`/api/media/${photo.url}?type=thumb`}
                      alt={photo.metadata?.original_name || ''}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://app.box.com/representation/file_version_0/${photo.url}/thumb_320.jpg`;
                      }}
                    />
                    {photo.uploaded_at && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1">
                        <p className="text-xs text-white/80">
                          {new Date(photo.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                {t('Notes', 'הערות')}
              </h2>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-xs text-gray-500 hover:text-[#11144C] border border-gray-200 hover:border-[#11144C]/30 rounded-full px-3 py-1 transition"
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
                    <div key={i} className="rounded-2xl border border-gray-200 bg-[#F5F6FA] p-4 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          {isHeader && (
                            <p className="text-xs text-gray-400">{header.slice(1, -1)}</p>
                          )}
                          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-sm">{body}</p>
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
                  className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] p-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#11144C]/30 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setEditingNotes(false); setNotes(''); }}
                    className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded-full px-3 py-1 transition"
                  >
                    {t('Cancel', 'ביטול')}
                  </button>
                  <button
                    onClick={saveNotes}
                    disabled={saving || !notes.trim()}
                    className="text-xs font-semibold bg-[#11144C] text-white rounded-full px-4 py-1 hover:bg-[#11144C]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? t('Saving…', 'שומר…') : t('Add note', 'הוסף הערה')}
                  </button>
                </div>
              </div>
            )}
          </div>

        </section>
      </div>
    </div>
  );
}