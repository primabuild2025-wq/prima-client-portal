'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useLang } from '@/lib/context/LanguageContext';

const ROLES = ['admin', 'management', 'staff', 'designer', 'client', 'supervisor'];

const roleLabel = (role: string) => {
  switch (role) {
    case 'admin':      return 'Admin';
    case 'management': return 'Management';
    case 'staff':      return 'Staff (Internal)';
    case 'designer':   return 'Designer (External)';
    case 'client':     return 'Client';
    case 'supervisor': return 'Supervisor (External)';
    default:           return role;
  }
};

const roleColor = (role: string) => {
  switch (role) {
    case 'admin':      return 'text-purple-700 bg-purple-50 border-purple-200';
    case 'management': return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'staff':      return 'text-green-700 bg-green-50 border-green-200';
    case 'designer':   return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    case 'client':     return 'text-orange-700 bg-orange-50 border-orange-200';
    case 'supervisor': return 'text-cyan-700 bg-cyan-50 border-cyan-200';
    default:           return 'text-gray-500 bg-gray-100 border-gray-200';
  }
};

export default function UsersPage() {
  const [users, setUsers]             = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [showAdd, setShowAdd]         = useState(false);
  const [addForm, setAddForm]         = useState({ name: '', email: '', role: 'staff', password: '' });
  const [addError, setAddError]       = useState<string | null>(null);
  const [addSaving, setAddSaving]     = useState(false);

  const [editUser, setEditUser]       = useState<any | null>(null);
  const [editForm, setEditForm]       = useState({ name: '', role: '', newPassword: '' });
  const [editError, setEditError]     = useState<string | null>(null);
  const [editSaving, setEditSaving]   = useState(false);

  const [togglingId, setTogglingId]   = useState<string | null>(null);

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
    if (!addForm.name.trim())        { setAddError(t('Name is required.', 'שם הוא שדה חובה.')); return; }
    if (!addForm.email.trim())       { setAddError(t('Email is required.', 'אימייל הוא שדה חובה.')); return; }
    if (!addForm.password.trim())    { setAddError(t('Password is required.', 'סיסמה היא שדה חובה.')); return; }
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
    <div className="min-h-screen bg-[#F5F6FA]">
      <Header />
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#11144C]" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <Header />
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 px-4 md:px-6 pb-10 pt-6">
        <Sidebar />
        <section className="space-y-6">
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">

            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('Users', 'משתמשים')}</h2>
                <p className="text-sm text-gray-500">{users.length} {t('total', 'סה"כ')}</p>
              </div>
              <button
                onClick={() => { setShowAdd(true); setAddForm({ name: '', email: '', role: 'staff', password: '' }); setAddError(null); }}
                className="rounded-full bg-[#11144C] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1a1f6e] transition"
              >
                + {t('Add User', 'הוסף משתמש')}
              </button>
            </div>

            {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

            <div className="space-y-3">
              {users.map(user => (
                <div
                  key={user.id}
                  className={`rounded-2xl border p-5 flex items-center justify-between gap-4 transition ${
                    user.blocked
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-200 bg-[#F5F6FA]'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-medium ${user.blocked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {user.name}
                      </p>
                      {user.id === currentUser?.id && (
                        <span className="text-xs text-gray-400">({t('you', 'אתה')})</span>
                      )}
                      {user.blocked && (
                        <span className="text-xs text-red-600 bg-red-100 border border-red-200 rounded-full px-2 py-0.5">
                          🚫 {t('Blocked', 'חסום')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${roleColor(user.role)}`}>
                        {roleLabel(user.role)}
                      </span>
                      {user.created_at && (
                        <span className="text-xs text-gray-400">
                          {t('Joined', 'הצטרף')} {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {user.id !== currentUser?.id && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { setEditUser(user); setEditForm({ name: user.name, role: user.role, newPassword: '' }); setEditError(null); }}
                        className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 transition"
                      >
                        {t('Edit', 'ערוך')}
                      </button>
                      <button
                        onClick={() => handleToggleBlock(user)}
                        disabled={togglingId === user.id}
                        className={`rounded-full border px-3 py-1.5 text-xs transition disabled:opacity-50 ${
                          user.blocked
                            ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                            : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white border border-gray-200 shadow-2xl p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">{t('Add User', 'הוסף משתמש')}</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-900 transition text-lg">✕</button>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">{t('Name', 'שם')} *</label>
              <input type="text" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                placeholder={t('Full name', 'שם מלא')}
                className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] px-4 py-3 text-gray-900 outline-none focus:border-[#11144C] placeholder:text-gray-400" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">{t('Email', 'אימייל')} *</label>
              <input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] px-4 py-3 text-gray-900 outline-none focus:border-[#11144C] placeholder:text-gray-400" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">{t('Role', 'תפקיד')} *</label>
              <select value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })}
                className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] px-4 py-3 text-gray-900 outline-none focus:border-[#11144C]">
                {ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">{t('Password', 'סיסמה')} *</label>
              <input type="password" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                placeholder={t('Min 6 characters', 'לפחות 6 תווים')}
                className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] px-4 py-3 text-gray-900 outline-none focus:border-[#11144C] placeholder:text-gray-400" />
            </div>
            {addError && <p className="text-sm text-red-500">{addError}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 rounded-full border border-gray-200 px-5 py-3 text-sm text-gray-600 hover:bg-gray-100 transition">
                {t('Cancel', 'ביטול')}
              </button>
              <button onClick={handleAddUser} disabled={addSaving}
                className="flex-1 rounded-full bg-[#11144C] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1a1f6e] transition disabled:opacity-50">
                {addSaving ? t('Creating...', 'יוצר...') : t('Create User', 'צור משתמש')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white border border-gray-200 shadow-2xl p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">{t('Edit User', 'ערוך משתמש')}</h3>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-900 transition text-lg">✕</button>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">{t('Name', 'שם')} *</label>
              <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] px-4 py-3 text-gray-900 outline-none focus:border-[#11144C]" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">{t('Role', 'תפקיד')}</label>
              <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] px-4 py-3 text-gray-900 outline-none focus:border-[#11144C]">
                {ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                {t('New Password', 'סיסמה חדשה')} <span className="text-gray-400 font-normal">({t('optional', 'אופציונלי')})</span>
              </label>
              <input type="password" value={editForm.newPassword} onChange={e => setEditForm({ ...editForm, newPassword: e.target.value })}
                placeholder={t('Leave blank to keep current', 'השאר ריק לשמור נוכחית')}
                className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] px-4 py-3 text-gray-900 outline-none focus:border-[#11144C] placeholder:text-gray-400" />
            </div>
            {editError && <p className="text-sm text-red-500">{editError}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditUser(null)}
                className="flex-1 rounded-full border border-gray-200 px-5 py-3 text-sm text-gray-600 hover:bg-gray-100 transition">
                {t('Cancel', 'ביטול')}
              </button>
              <button onClick={handleEditUser} disabled={editSaving}
                className="flex-1 rounded-full bg-[#11144C] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1a1f6e] transition disabled:opacity-50">
                {editSaving ? t('Saving...', 'שומר...') : t('Save Changes', 'שמור שינויים')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}