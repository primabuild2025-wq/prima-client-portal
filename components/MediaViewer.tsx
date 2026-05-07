'use client';

import { useState, useEffect } from 'react';
import { useLang } from '@/lib/context/LanguageContext';

interface MediaViewerProps {
  boxFileId:   string;
  mediaType:   'video' | 'photo' | 'document';
  fileName?:   string;
  uploadedAt?: string;
}

export default function MediaViewer({ boxFileId, mediaType, fileName, uploadedAt }: MediaViewerProps) {
  const [url, setUrl]       = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const { lang, t } = useLang();

  useEffect(() => { loadUrl(); }, [boxFileId]);

  const loadUrl = async () => {
    try {
      const type = mediaType === 'video' ? 'stream' : 'embed';
      const res  = await fetch(`/api/media/${boxFileId}?type=${type}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUrl(data.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = uploadedAt
    ? new Date(uploadedAt).toLocaleString(lang === 'HE' ? 'he-IL' : 'en-US', {
        year:   'numeric',
        month:  'short',
        day:    'numeric',
        hour:   '2-digit',
        minute: '2-digit',
      })
    : null;

  const caption = (
    <div className="px-4 py-2 flex items-center justify-between border-t border-white/10">
      {fileName && <p className="text-xs text-white/50 truncate">{fileName}</p>}
      {formattedDate && (
        <p className="text-xs text-white/30 shrink-0 ml-3">
          {t('Uploaded', 'הועלה')} {formattedDate}
        </p>
      )}
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-48 rounded-2xl border border-white/10 bg-black/40">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-48 rounded-2xl border border-red-500/20 bg-red-500/10">
      <p className="text-sm text-red-400">{t('Failed to load', 'טעינה נכשלה')}: {error}</p>
    </div>
  );

  if (mediaType === 'video') return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-black">
      <video controls className="w-full max-h-[480px]" controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}>
        <source src={url!} />
      </video>
      {(fileName || formattedDate) && caption}
    </div>
  );

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40">
      <iframe
        src={url!}
        className="w-full"
        style={{ height: mediaType === 'document' ? '600px' : '400px' }}
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        title={fileName || 'Media'}
      />
      {(fileName || formattedDate) && caption}
    </div>
  );
}