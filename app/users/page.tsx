'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useLang } from '@/lib/context/LanguageContext';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', role: 'user', locale: 'en' });
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

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

      const { data: user } = await supabase.from('users').select('*').eq('id', session.user.id).single();
      setCurrentUser(user);

      if (!['admin', 'management'].includes(user?.role)) {
        setError(t('You do not have permission to view this page.', 'אין לך הרשאה לצפות בדף זה.'));
        setLoading(false);
        return;
      }

      const { data: usersData, error: usersError } = await supabase
        .from('users').select('*').order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setShowModal(false);
      setForm({ email: '', name: '', role: 'user', locale: 'en' });
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const roleColor = (role: string) => {
    switch (role) {
      case 'admin':      return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'management': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default:           return 'text-white/50 bg-white/5 border-white/10';
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case 'admin':      return t('Admin', 'מנהל מערכת');
      case 'management': return t('Management', 'הנהלה');
      case 'user':       return t('User', 'משתמש');
      default:           return role;
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
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
                <h2 className="text-xl font-semibold">{t('Users', 'משתמשים')}</h2>
                <p className="text-sm text-white/70">{t('Manage team members and their roles.', 'נהל את חברי הצוות והתפקידים שלהם.')}</p>
              </div>
              {currentUser?.role === 'admin' && (
                <button onClick={() => setShowModal(true)}
                  className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-slate-200 transition">
                  {t('+ Invite User', '+ הזמן משתמש')}
                </button>
              )}
            </div>

            {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

            {users.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-black/40 p-10 text-center">
                <p className="text-white/50">{t('No users found.', 'לא נמצאו משתמשים.')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="rounded-3xl border border-white/10 bg-black/40 p-5 flex items-center justify-between hover:border-white/20 transition">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-semibold">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">{user.name}</p>
                        <p className="text-sm text-white/50">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${roleColor(user.role)}`}>
                        {roleLabel(user.role)}
                      </span>
                      <span className="text-xs text-white/30">{user.locale?.toUpperCase()}</span>
                      <span className="text-xs text-white/30">{new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#11144C] p-8 shadow-2xl">
            <h3 className="mb-6 text-xl font-semibold">{t('Invite User', 'הזמן משתמש')}</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">{t('Full Name *', 'שם מלא *')}</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white"
                  placeholder={t('Full name', 'שם מלא')} required />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">{t('Email *', 'אימייל *')}</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white"
                  placeholder="user@example.com" required />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">{t('Role *', 'תפקיד *')}</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white">
                  <option value="user">{t('User', 'משתמש')}</option>
                  <option value="management">{t('Management', 'הנהלה')}</option>
                  <option value="admin">{t('Admin', 'מנהל מערכת')}</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">{t('Language', 'שפה')}</label>
                <select value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value })}
                  className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white">
                  <option value="en">{t('English', 'אנגלית')}</option>
                  <option value="he">{t('Hebrew', 'עברית')}</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 rounded-full border border-white/10 px-5 py-3 text-sm text-white hover:bg-white/10 transition">
                  {t('Cancel', 'ביטול')}
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-slate-200 transition disabled:opacity-50">
                  {submitting ? t('Inviting...', 'מזמין...') : t('Invite User', 'הזמן משתמש')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}