'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
        router.refresh();
      } else {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, role }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Signup failed');
        setSuccess(data.message || 'Account created successfully!');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
        <div className="w-full rounded-[32px] border border-white/10 bg-[#11144C] p-10 shadow-2xl shadow-black/40">
          <div className="flex flex-col items-center gap-6 text-center">
            <img src="/prima-build-04.svg" alt="Prima Build logo" className="h-20 w-auto" />
            <div>
              <h1 className="text-3xl font-bold">
                {isLogin ? 'Login to Prima Build' : 'Create Admin Account'}
              </h1>
              <p className="mt-3 text-white/70">
                {isLogin
                  ? 'Access the bilingual portal with role-based dashboards.'
                  : 'Set up your admin account to get started.'}
              </p>
            </div>
          </div>
          <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white focus:ring-2 focus:ring-white/20"
                  placeholder="Your Full Name"
                  required={!isLogin}
                />
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-semibold text-white">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white focus:ring-2 focus:ring-white/20"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-white">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white focus:ring-2 focus:ring-white/20"
                placeholder="••••••••"
                required
              />
            </div>
            {!isLogin && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-white focus:ring-2 focus:ring-white/20"
                >
                  <option value="admin">Admin</option>
                  <option value="management">Management</option>
                  <option value="user">User</option>
                </select>
              </div>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            {success && <p className="text-sm text-green-400">{success}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-white px-6 py-3 text-black transition hover:bg-slate-200 disabled:opacity-50"
            >
              {loading
                ? isLogin ? 'Signing in...' : 'Creating account...'
                : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
              className="text-sm text-white/70 hover:text-white underline"
            >
              {isLogin ? 'Need to create an admin account?' : 'Already have an account?'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}