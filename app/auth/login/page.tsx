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
    <main className="min-h-screen bg-[#F5F6FA] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl bg-white border border-gray-200 shadow-lg p-10">
        <div className="flex flex-col items-center gap-6 text-center">
          <img src="/prima_build-04.png" alt="Prima Build logo" className="h-16 w-auto" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isLogin ? 'Login to Prima Build' : 'Create Admin Account'}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {isLogin
                ? 'Access the bilingual portal with role-based dashboards.'
                : 'Set up your admin account to get started.'}
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {!isLogin && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] px-4 py-3 text-gray-900 outline-none focus:border-[#11144C] focus:ring-2 focus:ring-[#11144C]/10 placeholder:text-gray-400"
                placeholder="Your Full Name"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] px-4 py-3 text-gray-900 outline-none focus:border-[#11144C] focus:ring-2 focus:ring-[#11144C]/10 placeholder:text-gray-400"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] px-4 py-3 text-gray-900 outline-none focus:border-[#11144C] focus:ring-2 focus:ring-[#11144C]/10 placeholder:text-gray-400"
              placeholder="••••••••"
              required
            />
          </div>

          {!isLogin && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-[#F5F6FA] px-4 py-3 text-gray-900 outline-none focus:border-[#11144C] focus:ring-2 focus:ring-[#11144C]/10"
              >
                <option value="admin">Admin</option>
                <option value="management">Management</option>
                <option value="user">User</option>
              </select>
            </div>
          )}

          {error   && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#11144C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1a1f6e] transition disabled:opacity-50"
          >
            {loading
              ? isLogin ? 'Signing in...' : 'Creating account...'
              : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
            className="text-sm text-gray-400 hover:text-gray-900 underline transition"
          >
            {isLogin ? 'Need to create an admin account?' : 'Already have an account?'}
          </button>
        </div>
      </div>
    </main>
  );
}