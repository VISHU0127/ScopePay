'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, BookOpen } from 'lucide-react';
import { DEMO_AGREEMENT_TEXT } from '@/lib/demo-agreement';

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [agreementText, setAgreementText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadDemoTemplate() {
    setName('Acme Studio Website');
    setClientName('Sarah Jenkins');
    setClientEmail('sarah@acmestudio.example');
    setAgreementText(DEMO_AGREEMENT_TEXT);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          client_name: clientName,
          client_email: clientEmail,
          agreement_text: agreementText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      // Store extracted scope in sessionStorage for the review screen
      if (data.extractedScope) {
        sessionStorage.setItem(
          `draft_scope_${data.project.id}`,
          JSON.stringify(data.extractedScope)
        );
      }

      router.push(`/projects/${data.project.id}/review-scope`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Create New Project &amp; Paste Scope
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          ScopePay uses your agreement or project brief to extract confirmed deliverables, exclusions, and revision caps with verbatim evidence.
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-700 border border-rose-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-base font-bold text-slate-900">Project &amp; Client Details</h2>
          <button
            type="button"
            onClick={loadDemoTemplate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Load Acme Studio Demo Agreement</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3">
            <label htmlFor="name" className="block text-xs font-semibold text-slate-700 uppercase">
              Project Name *
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Studio Website Redesign"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="sm:col-span-1">
            <label htmlFor="clientName" className="block text-xs font-semibold text-slate-700 uppercase">
              Client Contact Name *
            </label>
            <input
              id="clientName"
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Sarah Jenkins"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="clientEmail" className="block text-xs font-semibold text-slate-700 uppercase">
              Client Email Address *
            </label>
            <input
              id="clientEmail"
              type="email"
              required
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="sarah@acmestudio.example"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="agreement" className="block text-xs font-semibold text-slate-700 uppercase">
              Agreed Contract or Project Brief *
            </label>
            <span className="text-xs text-slate-500">
              {agreementText.length} characters (min 20)
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-2">
            Paste the raw text of your client proposal, signed agreement, or statement of work.
          </p>

          <textarea
            id="agreement"
            rows={10}
            required
            value={agreementText}
            onChange={(e) => setAgreementText(e.target.value)}
            placeholder="Paste your signed agreement, scope section, deliverables, exclusions, and revision limits here..."
            className="block w-full font-mono text-xs rounded-lg border border-slate-300 p-3 text-slate-900 placeholder:text-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="rounded-lg bg-teal-50/60 p-4 border border-teal-100 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-teal-900 space-y-1">
            <p className="font-semibold">Next Step: Scope Extraction &amp; Review</p>
            <p className="text-teal-800">
              AI extracts a structured draft of deliverables, explicit exclusions, and revision rounds. You will review, edit, or adjust items before confirming the initial baseline.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 transition"
          >
            <span>{loading ? 'Extracting Scope...' : 'Create & Extract Scope'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
