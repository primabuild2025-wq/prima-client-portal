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
  const [url, setUrl]           = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const { lang, t } = useLang();

  useEffect(() => { loadUrl(); }, [boxFileId]);

  const loadUrl = async () => {
    try {
      const type = mediaType === 'video' ? 'stream' : 'embed';
      const [embedRes, downloadRes] = await Promise.all([
        fetch(`/api/media/${boxFileId}?type=${type}`),
        fetch(`/api/media/${boxFileId}?type=download`),
      ]);
      const embedData    = await embedRes.json();
      const downloadData = await downloadRes.json();
      if (!embedRes.ok) throw new Error(embedData.error);
      setUrl(embedData.url);
      if (downloadRes.ok) setDownloadUrl(downloadData.url);
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

  const handleDownload = () => {
    if (downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName || 'download';
      a.target = '_blank';
      a.click();
    }
  };

  const caption = (
    <div className="px-4 py-2 flex items-center justify-between border-t border-gray-200 bg-white">
      <div className="flex items-center gap-2 min-w-0">
        {fileName && <p className="text-xs text-gray-500 truncate">{fileName}</p>}
        {formattedDate && (
          <p className="text-xs text-gray-400 shrink-0">· {formattedDate}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <button
          onClick={() => setFullscreen(true)}
          className="text-xs text-[#11144C] hover:underline"
        >
          ⛶ {t('Fullscreen', 'מסך מלא')}
        </button>
        {downloadUrl && (
          <button
            onClick={handleDownload}
            className="text-xs text-[#11144C] hover:underline"
          >
            ⬇ {t('Download', 'הורד')}
          </button>
        )}
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-48 rounded-2xl border border-gray-200 bg-[#F5F6FA]">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#11144C]" />
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-48 rounded-2xl border border-red-200 bg-red-50">
      <p className="text-sm text-red-500">{t('Failed to load', 'טעינה נכשלה')}: {error}</p>
    </div>
  );

  return (
    <>
      {/* Normal view */}
      <div
        className="rounded-2xl overflow-hidden border border-gray-200 bg-white cursor-pointer"
        onClick={() => setFullscreen(true)}
      >
        {mediaType === 'video' ? (
          <video
            controls
            className="w-full max-h-[480px]"
            onClick={(e) => e.stopPropagation()}
          >
            <source src={url!} />
          </video>
        ) : (
          <iframe
            src={url!}
            className="w-full pointer-events-none"
            style={{ height: mediaType === 'document' ? '500px' : '350px' }}
            allow="fullscreen"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            title={fileName || 'Media'}
          />
        )}
        {caption}
      </div>

      {/* Fullscreen lightbox */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/80 shrink-0">
            <p className="text-sm text-white/70 truncate">{fileName || ''}</p>
            <div className="flex items-center gap-4">
              {downloadUrl && (
                <button
                  onClick={handleDownload}
                  className="text-sm text-white/70 hover:text-white transition flex items-center gap-1"
                >
                  ⬇ {t('Download', 'הורד')}
                </button>
              )}
              <button
                onClick={() => setFullscreen(false)}
                className="text-white/70 hover:text-white transition text-2xl leading-none"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-2">
            {mediaType === 'video' ? (
              <video controls autoPlay className="max-w-full max-h-full rounded-xl">
                <source src={url!} />
              </video>
            ) : (
              <iframe
                src={url!}
                className="w-full h-full rounded-xl"
                allow="fullscreen"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                title={fileName || 'Media'}
              />
            )}
          </div>

          {/* Bottom date */}
          {formattedDate && (
            <div className="px-4 py-2 bg-black/80 shrink-0 text-center">
              <p className="text-xs text-white/40">{t('Uploaded', 'הועלה')} {formattedDate}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}