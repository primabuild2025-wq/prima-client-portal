'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useLang } from '@/lib/context/LanguageContext';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [approvingId, setApprovingId]     = useState<string | null>(null);
  const [approvalNote, setApprovalNote]   = useState('');
  const [saving, setSaving]               = useState(false);

  const { t } = useLang();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/auth/login'; return; }

      const { data, error: notifError } = await supabase
        .from('notifications')
        .select('*, actor:users!actor_id(name)')
        .eq('user_id', session.user.id)
        .order('read', { ascending: true })
        .order('created_at', { ascending: false });

      if (notifError) throw notifError;
      setNotifications(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (notif: any) => {
    if (!approvalNote.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: currentUser } = await supabase
        .from('users').select('*').eq('id', session.user.id).single();

      const now        = new Date().toISOString();
      const authorName = currentUser?.name || 'Unknown';
      const noteHeader = `[${new Date(now).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })} at ${new Date(now).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit',
      })} — ${authorName}]`;

      // Update file — clear pending_approval so all users can now see it
      if (notif.metadata?.file_id) {
        const { error: updateError } = await supabase.from('files')
          .update({
            pending_approval: false,
            approval_note:    `${noteHeader}\n${approvalNote.trim()}`,
            approved_by:      session.user.id,
            approved_at:      now,
          })
          .eq('id', notif.metadata.file_id);
        if (updateError) throw updateError;
      }

      // Mark notification as read
      const { error: notifError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notif.id);
      if (notifError) throw notifError;

      setNotifications(notifications.map(n =>
        n.id === notif.id ? { ...n, read: true } : n
      ));
      setApprovingId(null);
      setApprovalNote('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const markAllRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', session.user.id);
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="grid grid-cols-[280px_1fr] gap-6 px-6 pb-10 pt-6">
        <Sidebar />
        <section className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[#11144C] p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{t('Notifications', 'התראות')}</h2>
                <p className="text-sm text-white/70">
                  {unreadCount > 0
                    ? `${unreadCount} ${t('unread', 'לא נקראו')}`
                    : t('All caught up!', 'הכל עדכני!')}
                </p>
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  className="rounded-full border border-white/10 px-5 py-2 text-sm text-white hover:bg-white/10 transition">
                  {t('Mark all as read', 'סמן הכל כנקרא')}
                </button>
              )}
            </div>

            {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

            {notifications.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-black/40 p-10 text-center">
                <p className="text-4xl mb-3">🔔</p>
                <p className="text-white/50">{t('No notifications yet.', 'אין התראות עדיין.')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div key={notif.id}
                    className={`rounded-3xl border p-5 transition ${
                      notif.read ? 'border-white/10 bg-black/20' : 'border-white/20 bg-black/40'
                    }`}>

                    {/* Notification row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          {!notif.read && (
                            <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                          )}
                          <p className={`font-medium ${notif.read ? 'text-white/60' : 'text-white'}`}>
                            {notif.title}
                          </p>
                        </div>
                        <p className="text-sm text-white/50">{notif.message}</p>
                        <p className="text-xs text-white/30">
                          {new Date(notif.created_at).toLocaleString()}
                        </p>
                      </div>

                      {!notif.read && approvingId !== notif.id && (
                        <button
                          onClick={() => { setApprovingId(notif.id); setApprovalNote(''); }}
                          className="shrink-0 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black hover:bg-slate-200 transition"
                        >
                          {t('Approve', 'אשר')}
                        </button>
                      )}

                      {notif.read && (
                        <span className="shrink-0 text-xs text-green-400/70">
                          ✓ {t('Approved', 'אושר')}
                        </span>
                      )}
                    </div>

                    {/* Approval form */}
                    {approvingId === notif.id && (
                      <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                        <textarea
                          value={approvalNote}
                          onChange={e => setApprovalNote(e.target.value)}
                          rows={3}
                          placeholder={t(
                            'Reason for approval and who it was discussed with…',
                            'סיבת האישור ועם מי סוכם…'
                          )}
                          className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setApprovingId(null); setApprovalNote(''); }}
                            className="text-xs text-white/50 hover:text-white border border-white/10 rounded-full px-3 py-1.5 transition"
                          >
                            {t('Cancel', 'ביטול')}
                          </button>
                          <button
                            onClick={() => handleApprove(notif)}
                            disabled={saving || !approvalNote.trim()}
                            className="text-xs font-semibold bg-white text-black rounded-full px-4 py-1.5 hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {saving ? t('Saving…', 'שומר…') : t('Confirm approval', 'אשר')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}