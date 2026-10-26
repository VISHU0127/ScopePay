'use client';

import { useState } from 'react';

export default function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function signOut() {
    setPending(true);
    setError(false);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Sign out failed');
      // Discard cached workspace UI and client-link tokens in this tab.
      try {
        for (const key of Object.keys(sessionStorage)) {
          if (key.startsWith('client_access_') || key.startsWith('draft_scope_')) sessionStorage.removeItem(key);
        }
      } catch { /* Storage may be disabled; the server session is already cleared. */ }
      window.location.replace('/signin');
    } catch {
      setError(true);
      setPending(false);
    }
  }

  return <div>
    <button type="button" disabled={pending} onClick={signOut} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
    {error && <p role="alert" className="mt-2 text-sm text-rose-700">Could not sign out. Please retry.</p>}
  </div>;
}
