'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLang } from '@/lib/context/LanguageContext';

type ReportEntry = {
  id: string;
  photo: string;
  title: string;
  message: string;
  createdAt: Date;
};

interface ReportsTabProps {
  projectName?: string;
  projectNames?: string[];
  currentUserName?: string;
}

export default function ReportsTab({ projectName = 'Project', projectNames = [], currentUserName = '' }: ReportsTabProps) {
  const { t } = useLang();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (!location && projectNames.length > 0) {
      setLocation(projectNames[0]);
    }
  }, [location, projectNames]);

  useEffect(() => {
    if (!author && currentUserName) {
      setAuthor(currentUserName);
    }
  }, [author, currentUserName]);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryMessage, setEntryMessage] = useState('');
  const [entries, setEntries] = useState<ReportEntry[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState('');
  const [viewingReport, setViewingReport] = useState(false);

  const handlePhotoSelect = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
      setPhotoFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const addEntry = () => {
    if (!photoPreview) return;
    const newEntry: ReportEntry = {
      id: `entry-${Date.now()}`,
      photo: photoPreview,
      title: entryTitle.trim() || `${t('Entry', 'רשומה')} ${entries.length + 1}`,
      message: entryMessage.trim(),
      createdAt: new Date(),
    };
    setEntries([newEntry, ...entries]);
    setEntryTitle('');
    setEntryMessage('');
    setPhotoPreview(null);
    setPhotoFileName('');
  };

  const moveEntry = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= entries.length) return;
    const updated = [...entries];
    const [item] = updated.splice(index, 1);
    updated.splice(index + direction, 0, item);
    setEntries(updated);
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter((entry) => entry.id !== id));
  };

  const reportPreview = useMemo(() => {
    if (!viewingReport) return null;
    const now = new Date();
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="border-b border-gray-200 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#11144C]">
            {t('Field Report', 'דוח שדה')}
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-gray-900">
            {title.trim() || `${projectName} ${t('Field Report', 'דוח שדה')}`}
          </h3>
          <div className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">{t('Prepared by', 'הוכן על ידי')}</p>
              <p className="mt-1 text-gray-900">{author.trim() || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">{t('Location', 'מיקום')}</p>
              <p className="mt-1 text-gray-900">{location.trim() || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">{t('Generated', 'נוצר')}</p>
              <p className="mt-1 text-gray-900">{now.toLocaleDateString()}</p>
            </div>
          </div>
        </div>
        <div className="mt-6 space-y-6">
          {entries.map((entry, index) => (
            <div key={entry.id} className="rounded-2xl border border-gray-200 bg-[#F5F6FA] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">{t('Entry', 'רשומה')} {index + 1}</p>
                  <h4 className="mt-1 text-lg font-semibold text-gray-900">{entry.title}</h4>
                </div>
                <p className="text-xs text-gray-400">{entry.createdAt.toLocaleString()}</p>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
                <img src={entry.photo} alt={entry.title} className="h-48 w-full rounded-2xl border border-gray-200 object-cover" />
                <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-700">
                  {entry.message || t('No notes recorded.', 'לא נרשמו הערות.')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }, [author, entries, location, projectName, title, viewingReport, t]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t('Field reports', 'דוחות שדה')}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {t('Capture site observations, photos, and notes in order.', 'תעד תצפיות, תמונות והערות מהאתר בסדר כרונולוגי.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setViewingReport(true)}
            disabled={entries.length === 0}
            className="rounded-full bg-[#11144C] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#11144C]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('Generate report', 'צור דוח')}
          </button>
        </div>
      </div>

      {!viewingReport ? (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h4 className="text-base font-semibold text-gray-900">{t('New entry', 'רשומה חדשה')}</h4>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  {t('Photo', 'תמונה')}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handlePhotoSelect(e.target.files?.[0])}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-[#11144C] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#11144C]/90"
                />
                <p className="mt-2 text-xs text-gray-400">
                  {t('Upload a photo or use your device camera.', 'העלה תמונה או השתמש במצלמה של המכשיר שלך.')}
                </p>
              </label>

              {photoPreview ? (
                <div className="rounded-2xl border border-gray-200 bg-[#F5F6FA] p-3">
                  <img src={photoPreview} alt="selected preview" className="h-44 w-full rounded-xl object-cover" />
                  <p className="mt-2 text-xs text-gray-500">{photoFileName}</p>
                </div>
              ) : null}

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  {t('Line header', 'כותרת שורה')}
                </span>
                <input
                  value={entryTitle}
                  onChange={(e) => setEntryTitle(e.target.value)}
                  placeholder={t('e.g. Hallway — cracked tile', 'לדוגמה: מסדרון — אריח סדוק')}
                  className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#11144C]/30"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  {t('Message / notes', 'הערה / notes')}
                </span>
                <textarea
                  value={entryMessage}
                  onChange={(e) => setEntryMessage(e.target.value)}
                  rows={4}
                  placeholder={t('Describe what you observed.', 'תאר מה ראית בשטח.')}
                  className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#11144C]/30"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                    {t('Report title', 'כותרת דוח')}
                  </span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('Site walkthrough', 'סיור שטח')}
                    className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#11144C]/30"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                    {t('Prepared by', 'הוכן על ידי')}
                  </span>
                  <input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder={t('Your name', 'השם שלך')}
                    className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#11144C]/30"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  {t('Location / reference', 'מיקום / התייחסות')}
                </span>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#11144C]/30"
                >
                  {projectNames.length > 0 ? (
                    projectNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))
                  ) : (
                    <option value="">{t('No project available', 'אין פרויקט זמין')}</option>
                  )}
                </select>
              </label>

              <button
                type="button"
                onClick={addEntry}
                disabled={!photoPreview}
                className="w-full rounded-full bg-[#11144C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#11144C]/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('Add to report', 'הוסף לדוח')}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-gray-900">{t('Entries in order', 'רשומות בסדר')}</h4>
              <span className="rounded-full bg-[#F5F6FA] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                {entries.length} {entries.length === 1 ? t('entry', 'רשומה') : t('entries', 'רשומות')}
              </span>
            </div>

            {entries.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-[#F5F6FA] p-8 text-center text-sm text-gray-500">
                {t('No entries yet. Add your first photo and note.', 'עדיין אין רשומות. הוסף את התמונה הראשונה ואת ההערה.')}
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {entries.map((entry, index) => (
                  <div key={entry.id} className="flex gap-3 rounded-2xl border border-gray-200 bg-[#F5F6FA] p-3">
                    <img src={entry.photo} alt={entry.title} className="h-20 w-20 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900">{entry.title}</p>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => moveEntry(index, -1)} className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 hover:text-[#11144C]" aria-label="Move up">↑</button>
                          <button type="button" onClick={() => moveEntry(index, 1)} className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 hover:text-[#11144C]" aria-label="Move down">↓</button>
                          <button type="button" onClick={() => removeEntry(entry.id)} className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-500" aria-label="Delete">✕</button>
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{entry.message || t('No notes recorded.', 'לא נרשמו הערות.')}</p>
                      <p className="mt-2 text-xs text-gray-400">{entry.createdAt.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {reportPreview}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setViewingReport(false)}
              className="rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              {t('Back', 'חזור')}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-full bg-[#11144C] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#11144C]/90"
            >
              {t('Print / Save PDF', 'הדפס / שמור כ-PDF')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
