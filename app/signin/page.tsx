'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, UserCheck, Mail } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<'account' | 'demo' | null>(null);
  const loading = pending !== null;
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setPending('account');
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setPending(null);
    }
  }

  async function handleDemoLogin() {
    setPending('demo');
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Empty body triggers demo user Alex Morgan
      });

      if (!res.ok) throw new Error('Demo login failed');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed');
      setPending(null);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Sign in to ScopePay
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review scope and proposals. Sandbox checkout uses one configured receiving account. Demo workspaces are temporary and private to this browser.
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition focus-visible:outline-2 focus-visible:outline-slate-900"
          >
            <UserCheck className="h-4 w-4 text-teal-400" />
            <span>{pending === 'demo' ? 'Creating your workspace…' : 'Start a private demo workspace'}</span>
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200" />
            <span className="flex-shrink mx-4 text-xs uppercase font-medium text-slate-500">
              Or sign in to your account
            </span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          <form onSubmit={handleLogin} aria-busy={loading}>
            <fieldset disabled={loading} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase">
                Password
              </label>
              <input
                id="password"
                type="password" autoComplete="current-password" required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your account password"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition"
            >
              <Mail className="h-4 w-4" />
              <span>{pending === 'account' ? 'Signing in…' : 'Sign In'}</span>
            </button>
            </fieldset>
          </form>
          <p className="text-sm text-slate-600">New here? <Link href="/guide" className="font-semibold text-teal-700 underline">Read the quick-start guide</Link>. Account access is provided by the workspace owner.</p>
        </div>
      </div>
    </div>
  );
}
