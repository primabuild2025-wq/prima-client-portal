'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useLang } from '@/lib/context/LanguageContext';

const ROLES = ['admin', 'management', 'staff', 'supervisor', 'designer', 'client'];

const roleLabel = (role: string) => {
  switch (role) {
    case 'admin':      return 'Admin';
    case 'management': return 'Management';
    case 'staff':      return 'Staff';
    case 'supervisor':      return 'Supervisor';
    case 'designer':   return 'Designer';
    case 'client':     return 'Client';
    default:           return role;
  }
};

const roleColor = (role: string) => {
  switch (role) {
    case 'admin':      return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
    case 'management': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    case 'staff':      return 'text-green-400 bg-green-400/10 border-green-400/20';
    case 'supervisor':      return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
    case 'designer':   return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    case 'client':     return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    default:           return 'text-white/50 bg-white/5 border-white/10';
  }
};

export default function UsersPage() {
  const [users, setUsers]               = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [currentUser, setCurrentUser]   = useState<any>(null);

  // Add user modal
  const [showAdd, setShowAdd]           = useState(false);
  const [addForm, setAddForm]           = useState({ name: '', email: '', role: 'staff', password: '' });
  const [addError, setAddError]         = useState<string | null>(null);
  const [addSaving, setAddSaving]       = useState(false);

  // Edit user modal
  const [editUser, setEditUser]         = useState<any | null>(null);
  const [editForm, setEditForm]         = useState({ name: '', role: '', newPassword: '' });
  const [editError, setEditError]       = useState<string | null>(null);
  const [editSaving, setEditSaving]     = useState(false);

  const [togglingId, setTogglingId]     = useState<string | null>(null);

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
      if (user?.role !== 'admin') { window.location.href = '/'; return; }
      setCurrentUser(user);

      const { data, error: usersError } = await supabase
        .from('users').select('*').order('created_at', { ascending: false });
      if (usersError) throw usersError;
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!addForm.name.trim())     { setAddError(t('Name is required.', 'שם הוא שדה חובה.')); return; }
    if (!addForm.email.trim())    { setAddError(t('Email is required.', 'אימייל הוא שדה חובה.')); return; }
    if (!addForm.password.trim()) { setAddError(t('Password is required.', 'סיסמה היא שדה חובה.')); return; }
    if (addForm.password.length < 6) { setAddError(t('Password must be at least 6 characters.', 'סיסמה חייבת להכיל לפחות 6 תווים.')); return; }

    setAddSaving(true);
    setAddError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowAdd(false);
      setAddForm({ name: '', email: '', role: 'staff', password: '' });
      loadData();
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAddSaving(false);
    }
  };

  const handleEditUser = async () => {
    if (!editForm.name.trim()) { setEditError(t('Name is required.', 'שם הוא שדה חובה.')); return; }
    if (editForm.newPassword && editForm.newPassword.length < 6) {
      setEditError(t('Password must be at least 6 characters.', 'סיסמה חייבת להכיל לפחות 6 תווים.'));
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditUser(null);
      setEditForm({ name: '', role: '', newPassword: '' });
      loadData();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleToggleBlock = async (user: any) => {
    if (!confirm(user.blocked
      ? t(`Unblock ${user.name}?`, `לבטל חסימה של ${user.name}?`)
      : t(`Block ${user.name}? They will not be able to log in.`, `לחסום את ${user.name}? הם לא יוכלו להתחבר.`)
    )) return;

    setTogglingId(user.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          blocked:    !user.blocked,
          blocked_at: !user.blocked ? new Date().toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

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
                <h2 className="text-xl font-semibold">{t('Users', 'משתמשים')}</h2>
                <p className="text-sm text-white/70">{users.length} {t('total', 'סה"כ')}</p>
              </div>
              <button
                onClick={() => { setShowAdd(true); setAddForm({ name: '', email: '', role: 'staff', password: '' }); setAddError(null); }}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-slate-200 transition"
              >
                + {t('Add User', 'הוסף משתמש')}
              </button>
            </div>

            {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id}
                  className={`rounded-3xl border p-5 flex items-center justify-between gap-4 transition ${
                    user.blocked ? 'border-red-500/20 bg-red-500/5' : 'border-white/10 bg-black/40'
                  }`}>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-medium ${user.blocked ? 'text-white/40 line-through' : 'text-white'}`}>
                        {user.name}
                      </p>
                      {user.id === currentUser?.id && (
                        <span className="text-xs text-white/30">({t('you', 'אתה')})</span>
                      )}
                      {user.blocked && (
                        <span className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-full px-2 py-0.5">
                          🚫 {t('Blocked', 'חסום')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/50">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${roleColor(user.role)}`}>
                        {roleLabel(user.role)}
                      </span>
                      {user.created_at && (
                        <span className="text-xs text-white/30">
                          {t('Joined', 'הצטרף')} {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {user.id !== currentUser?.id && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { setEditUser(user); setEditForm({ name: user.name, role: user.role, newPassword: '' }); setEditError(null); }}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/10 transition"
                      >
                        {t('Edit', 'ערוך')}
                      </button>
                      <button
                        onClick={() => handleToggleBlock(user)}
                        disabled={togglingId === user.id}
                        className={`rounded-full border px-3 py-1.5 text-xs transition disabled:opacity-50 ${
                          user.blocked
                            ? 'border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                            : 'border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        }`}
                      >
                        {togglingId === user.id ? '…' : user.blocked ? t('Unblock', 'בטל חסימה') : t('Block', 'חסום')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#11144C] p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">{t('Add User', 'הוסף משתמש')}</h3>
              <button onClick={() => setShowAdd(false)} className="text-white/40 hover:text-white transition text-lg">✕</button>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">{t('Name', 'שם')} *</label>
              <input type="text" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                placeholder={t('Full name', 'שם מלא')}
                className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white placeholder:text-white/30" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">{t('Email', 'אימייל')} *</label>
              <input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white placeholder:text-white/30" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">{t('Role', 'תפקיד')} *</label>
              <select value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })}
                className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white">
                {ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">{t('Password', 'סיסמה')} *</label>
              <input type="password" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                placeholder={t('Min 6 characters', 'לפחות 6 תווים')}
                className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white placeholder:text-white/30" />
            </div>

            {addError && <p className="text-sm text-red-400">{addError}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 rounded-full border border-white/10 px-5 py-3 text-sm text-white hover:bg-white/10 transition">
                {t('Cancel', 'ביטול')}
              </button>
              <button onClick={handleAddUser} disabled={addSaving}
                className="flex-1 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-slate-200 transition disabled:opacity-50">
                {addSaving ? t('Creating...', 'יוצר...') : t('Create User', 'צור משתמש')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#11144C] p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">{t('Edit User', 'ערוך משתמש')}</h3>
              <button onClick={() => setEditUser(null)} className="text-white/40 hover:text-white transition text-lg">✕</button>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">{t('Name', 'שם')} *</label>
              <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">{t('Role', 'תפקיד')}</label>
              <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white">
                {ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                {t('New Password', 'סיסמה חדשה')} <span className="text-white/30 font-normal">({t('optional', 'אופציונלי')})</span>
              </label>
              <input type="password" value={editForm.newPassword} onChange={e => setEditForm({ ...editForm, newPassword: e.target.value })}
                placeholder={t('Leave blank to keep current', 'השאר ריק לשמור נוכחית')}
                className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white placeholder:text-white/30" />
            </div>

            {editError && <p className="text-sm text-red-400">{editError}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditUser(null)}
                className="flex-1 rounded-full border border-white/10 px-5 py-3 text-sm text-white hover:bg-white/10 transition">
                {t('Cancel', 'ביטול')}
              </button>
              <button onClick={handleEditUser} disabled={editSaving}
                className="flex-1 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-slate-200 transition disabled:opacity-50">
                {editSaving ? t('Saving...', 'שומר...') : t('Save Changes', 'שמור שינויים')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}