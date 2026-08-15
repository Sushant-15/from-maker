'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push('/admin/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-600 to-fuchsia-800 flex items-center justify-center shadow-md shadow-fuchsia-500/20 text-xl">
            🧠
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">QuizArena</span>
        </div>

        <h2 className="text-center mb-2 text-xl font-bold text-slate-900">Welcome back</h2>
        <p className="text-slate-500 text-center text-sm mb-6">Sign in to your admin account</p>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-5">
            <label className="block text-sm font-semibold text-slate-900 mb-2" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="w-full px-4 py-2.5 text-slate-900 bg-white border border-slate-200 rounded-lg transition-all focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10 outline-none placeholder:text-slate-400"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-semibold text-slate-900 mb-2" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="w-full px-4 py-2.5 text-slate-900 bg-white border border-slate-200 rounded-lg transition-all focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10 outline-none placeholder:text-slate-400"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold rounded-xl w-full transition-all hover:shadow-lg hover:shadow-fuchsia-500/20 disabled:opacity-50 mt-2"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
