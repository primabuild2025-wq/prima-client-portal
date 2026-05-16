'use client';

import { useState, useRef } from 'react';
import { useLang } from '@/lib/context/LanguageContext';

const FILE_CATEGORIES = [
  'Engineering',
  'Architecture',
  'Electric',
  'Plumbing',
  'Tiling',
  'Drywall',
  'Exterior',
];

interface MediaUploadProps {
  projectId: string;
  taskId?: string;
  onUploadComplete?: (file: any) => void;
}

function formatTimestamp(date: Date, lang: string): string {
  return date.toLocaleString(lang === 'HE' ? 'he-IL' : 'en-US', {
    year:   'numeric',
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

export default function MediaUpload({ projectId, taskId, onUploadComplete }: MediaUploadProps) {
  const [uploading, setUploading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [description, setDescription]   = useState('');
  const [category, setCategory]         = useState('');
  const [dragOver, setDragOver]         = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lastUploaded, setLastUploaded] = useState<{ name: string; timestamp: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { lang, t } = useLang();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setLastUploaded(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    if (!description.trim()) {
      setError(t('Description is required.', 'תיאור הוא שדה חובה.'));
      return;
    }

    setUploading(true);
    setError(null);

    const uploadedAt = new Date();
    const timestamp  = formatTimestamp(uploadedAt, lang);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectId', projectId);
      if (taskId) formData.append('taskId', taskId);
      formData.append('description', description.substring(0, 20));
      formData.append('uploadedAt', uploadedAt.toISOString());
      if (category) formData.append('category', category);

      const res  = await fetch('/api/media/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDescription('');
      setCategory('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setLastUploaded({ name: selectedFile.name, timestamp });

      if (onUploadComplete) onUploadComplete(data.file);
      if (data.redFlag) alert('⚠️ Red flag: File uploaded after project activation.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">

      {/* Description */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-700">
          {t('Description', 'תיאור')} <span className="text-red-500">*</span>{' '}
          <span className="text-gray-400">({t('max 20 chars', 'עד 20 תווים')})</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value.substring(0, 20))}
          className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#11144C]/30 placeholder:text-gray-400"
          placeholder={t('e.g. Site photo day 1', 'לדוג. תמונת אתר יום 1')}
          maxLength={20}
        />
        <p className="mt-1 text-right text-xs text-gray-400">{description.length}/20</p>
      </div>

      {/* Category */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-700">
          {t('Category', 'קטגוריה')}
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#11144C]/30"
        >
          <option value="">{t('Select a category...', 'בחר קטגוריה...')}</option>
          {FILE_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Drop zone */}
      {!selectedFile && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
            dragOver
              ? 'border-[#11144C]/30 bg-[#11144C]/5'
              : 'border-gray-300 hover:border-[#11144C]/20 hover:bg-[#11144C]/5'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="video/*,image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
          />
          <div className="flex flex-col items-center gap-2">
            <p className="text-2xl">📁</p>
            <p className="text-sm text-gray-500">{t('Drop a file or click to upload', 'גרור קובץ או לחץ להעלאה')}</p>
            <p className="text-xs text-gray-400">{t('Videos, photos, documents', 'סרטונים, תמונות, מסמכים')}</p>
          </div>
        </div>
      )}

      {/* Selected file preview + confirm */}
      {selectedFile && !uploading && (
        <div className="rounded-2xl border border-gray-200 bg-[#F5F6FA] px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">📄 {selectedFile.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={handleClearFile}
              className="text-gray-400 hover:text-gray-700 text-lg leading-none transition"
            >
              ✕
            </button>
          </div>
          <button
            onClick={handleUpload}
            className="w-full rounded-full bg-[#11144C] px-5 py-2 text-sm font-semibold text-white hover:bg-[#11144C]/90 transition"
          >
            {t('Upload File', 'העלה קובץ')}
          </button>
        </div>
      )}

      {/* Uploading spinner */}
      {uploading && (
        <div className="rounded-2xl border border-gray-200 bg-[#F5F6FA] px-4 py-6 flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#11144C]" />
          <p className="text-sm text-gray-400">{t('Uploading…', 'מעלה...')}</p>
        </div>
      )}

      {/* Success */}
      {lastUploaded && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-xs font-medium text-green-700">✓ {t('Uploaded', 'הועלה')}: {lastUploaded.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{t('at', 'ב')} {lastUploaded.timestamp}</p>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}