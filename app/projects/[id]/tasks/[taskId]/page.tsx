'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useLang } from '@/lib/context/LanguageContext';

export default function TaskDetailPage({ params }: { params: { id: string; taskId: string } }) {
  const { id, taskId } = params;
  const [task, setTask] = useState<any>(null);
  const [translatedTask, setTranslatedTask] = useState<any>(null);
  const [translatedNotes, setTranslatedNotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

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

      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:users!assignee_id(name, email), project:projects!project_id(name)')
        .eq('id', taskId)
        .single();

      if (error) throw error;
      setTask(data);
      setNotes('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
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
      const now = new Date().toISOString();
      const existingNotes = task.notes || '';
      const authorName = currentUser?.name || 'Unknown';
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

  const statuses = ['not_started', 'in_progress', 'completed', 'blocked'];
  const displayed = translatedTask || task;

  if (loading) return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    </div>
  );

  if (error || !task) return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="flex items-center justify-center h-96">
        <p className="text-red-400">{error || t('Task not found', 'משימה לא נמצאה')}</p>
      </div>
    </div>
  );

  const noteEntries = task.notes ? task.notes.split('\n\n') : [];

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="grid grid-cols-[280px_1fr] gap-6 px-6 pb-10 pt-6">
        <Sidebar />
        <section className="space-y-6">

          {/* Header */}
          <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8">
            <button
              onClick={() => window.location.href = `/projects/${id}`}
              className="text-white/50 hover:text-white text-sm transition"
            >
              ← {displayed.project?.name ?? t('Project', 'פרויקט')}
            </button>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold">{displayed.title}</h1>
                  {translating && <span className="text-xs text-white/30">{t('Translating…', 'מתרגם…')}</span>}
                </div>
                {displayed.description && (
                  <p className="mt-2 text-white/60 leading-relaxed">{displayed.description}</p>
                )}
              </div>
              <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${statusColor(task.status)}`}>
                {statusLabel(task.status)}
              </span>
            </div>
          </div>

          {/* Change Status */}
          <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
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
                      : 'border-white/10 text-white/50 hover:bg-white/10'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {statusLabel(status)}
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-5">
              {t('Details', 'פרטים')}
            </h2>
            <div className="grid grid-cols-2 gap-6">
              {task.assignee && (
                <div>
                  <p className="text-xs text-white/40 mb-1">{t('Assignee', 'אחראי')}</p>
                  <p className="font-medium">👤 {task.assignee.name}</p>
                  {task.assignee.email && (
                    <p className="text-xs text-white/40">{task.assignee.email}</p>
                  )}
                </div>
              )}
              {task.due_date && (
                <div>
                  <p className="text-xs text-white/40 mb-1">{t('Due Date', 'תאריך יעד')}</p>
                  <p className="font-medium">
                    {new Date(task.due_date).toLocaleDateString(lang === 'HE' ? 'he-IL' : 'en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                </div>
              )}
              {task.priority && (
                <div>
                  <p className="text-xs text-white/40 mb-1">{t('Priority', 'עדיפות')}</p>
                  <p className="font-medium capitalize">{task.priority}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-white/40 mb-1">{t('Created', 'נוצר')}</p>
                <p className="font-medium">
                  {new Date(task.created_at).toLocaleDateString(lang === 'HE' ? 'he-IL' : 'en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
                {t('Notes', 'הערות')}
              </h2>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-xs text-white/50 hover:text-white border border-white/10 rounded-full px-3 py-1 transition"
                >
                  + {t('Add note', 'הוסף הערה')}
                </button>
              )}
            </div>

            {noteEntries.length > 0 ? (
              <div className="space-y-4 mb-6">
                {noteEntries.map((entry: string, i: number) => {
                  const lines = entry.split('\n');
                  const header = lines[0];
                  const isHeader = header.startsWith('[') && header.endsWith(']');
                  const body = translatedNotes[i] || lines.slice(1).join('\n') || entry;
                  return (
                    <div key={i} className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          {isHeader && (
                            <p className="text-xs text-white/30">{header.slice(1, -1)}</p>
                          )}
                          <p className="text-white/70 leading-relaxed whitespace-pre-wrap text-sm">
                            {body}
                          </p>
                        </div>
                        {currentUser?.role === 'admin' && (
                          <button
                            onClick={() => deleteNote(i)}
                            disabled={saving}
                            className="shrink-0 text-xs text-white/20 hover:text-red-400 transition disabled:opacity-50"
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
              <p className="text-white/30 text-sm mb-6">{t('No notes yet.', 'אין הערות עדיין.')}</p>
            )}

            {editingNotes && (
              <div className="space-y-3">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  placeholder={t('Write a new note…', 'כתוב הערה חדשה…')}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setEditingNotes(false); setNotes(''); }}
                    className="text-xs text-white/50 hover:text-white border border-white/10 rounded-full px-3 py-1 transition"
                  >
                    {t('Cancel', 'ביטול')}
                  </button>
                  <button
                    onClick={saveNotes}
                    disabled={saving || !notes.trim()}
                    className="text-xs font-semibold bg-white text-black rounded-full px-4 py-1 hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
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