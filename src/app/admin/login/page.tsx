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
    <div className="login-container">
      <div className="login-card">
        <div className="login-brand">
          <div className="sidebar-brand-icon">🧠</div>
          <span className="sidebar-brand-text" style={{ fontSize: '1.5rem' }}>QuizArena</span>
        </div>

        <h2 className="text-center mb-2" style={{ fontSize: 'var(--font-size-xl)' }}>Welcome back</h2>
        <p className="text-muted text-center text-sm mb-6">Sign in to your admin account</p>

        {error && (
          <div style={{
            background: 'var(--danger-light)',
            color: 'var(--danger-foreground)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--font-size-sm)',
            marginBottom: 'var(--space-4)',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ marginTop: 'var(--space-2)' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
