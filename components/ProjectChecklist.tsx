'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useLang } from '@/lib/context/LanguageContext';

interface ChecklistItem {
  id:          string;
  number:      number;
  description: string;
  percentage:  number;
  completed:   boolean;
}

interface Props {
  projectId:    string;
  isPrivileged: boolean;
  minimal?:     boolean; // true = progress bar only
}

export default function ProjectChecklist({ projectId, isPrivileged, minimal = false }: Props) {
  const [items, setItems]             = useState<ChecklistItem[]>([]);
  const [loaded, setLoaded]           = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [toggling, setToggling]       = useState<string | null>(null);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  const { t } = useLang();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => { loadItems(); }, [projectId]);

  async function loadItems() {
  const res  = await fetch(`/api/checklist?projectId=${projectId}`);
  const data = await res.json();
  setItems(data.items || []);
  setLoaded(true);
}

async function toggleItem(item: ChecklistItem) {
  if (!isPrivileged) return;
  setToggling(item.id);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/checklist', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        id:        item.id,
        completed: !item.completed,
        userId:    session?.user.id,
      }),
    });
    setItems(items.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i));
  } finally {
    setToggling(null);
  }
}

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    try {
      console.log('Uploading checklist file:', file.name, file.type, projectId);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      const res  = await fetch('/api/checklist/upload', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({ error: `Upload failed with status ${res.status}` }));
      if (!res.ok) throw new Error(data.error || `Upload failed with status ${res.status}`);
      setUploadSuccess(true);
      await loadItems();
    } catch (err: any) {
      console.error('Checklist upload error:', err);
      setUploadError(err.message || 'Upload failed. See console for details.');
    } finally {
      setUploading(false);
    }
  }

  const progress = items.reduce((sum, i) => sum + (i.completed ? i.percentage : 0), 0);

  if (!loaded) return null;

  // Minimal mode — progress bar only
  if (minimal) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40">{t('Progress', 'התקדמות')}</span>
          <span className="text-xs font-medium text-white/60">{progress.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  // Full mode — checklist + upload + progress bar
  return (
    <div className="space-y-4">

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">{t('Progress', 'התקדמות')}</span>
            <span className="text-xs font-semibold text-white">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload — admin/management only */}
      {isPrivileged && (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
          >
            {uploading
              ? t('Uploading…', 'מעלה...')
              : items.length > 0
              ? t('Replace checklist', 'החלף רשימה')
              : t('Upload checklist (.xlsx)', 'העלה רשימה (.xlsx)')}
          </button>
          {uploadError   && <p className="text-xs text-red-400">{uploadError}</p>}
          {uploadSuccess && <p className="text-xs text-emerald-400">✓ {t('Checklist uploaded successfully', 'הרשימה הועלתה בהצלחה')}</p>}
        </div>
      )}

      {/* Checklist items */}
      {items.length === 0 ? (
        <p className="text-xs text-white/30 py-2">
          {isPrivileged
            ? t('No checklist yet. Upload an Excel file to get started.', 'אין רשימה עדיין. העלה קובץ Excel להתחיל.')
            : t('No checklist yet.', 'אין רשימה עדיין.')}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                item.completed
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-white/10 bg-black/20'
              }`}
            >
              <button
                onClick={() => toggleItem(item)}
                disabled={toggling === item.id || !isPrivileged}
                className={`mt-0.5 h-4 w-4 shrink-0 rounded border transition ${
                  item.completed
                    ? 'border-emerald-400 bg-emerald-400'
                    : 'border-white/30 bg-transparent'
                } disabled:opacity-50 ${isPrivileged ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {item.completed && (
                  <svg viewBox="0 0 10 10" fill="none" className="w-full h-full p-0.5">
                    <path d="M1.5 5l2.5 2.5 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${item.completed ? 'line-through text-white/40' : 'text-white'}`}>
                  {item.number}. {item.description}
                </p>
              </div>
              <span className="text-xs text-white/30 shrink-0">{item.percentage}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}