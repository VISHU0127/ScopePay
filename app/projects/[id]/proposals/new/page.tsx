'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { dollarsToCents } from '@/lib/validations';
import { ChangeRequest, ScopeAnalysis, ChangeProposal } from '@/lib/types';

import { Suspense } from 'react';

export default function NewProposalPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-slate-500">Loading proposal editor...</div>}>
      <NewProposalContent {...props} />
    </Suspense>
  );
}

function NewProposalContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get('request_id');
  const revisionId = searchParams.get('revision_id');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dollarAmount, setDollarAmount] = useState(''); // Default to $150 as in demo requirement
  const [criteria, setCriteria] = useState<string[]>(['']);
  const [contextLoading, setContextLoading] = useState(Boolean(requestId));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) return;

    // Load request & analysis to prefill proposal
    fetch(`/api/projects/${projectId}`)
      .then(async res => { if (!res.ok) throw new Error('Could not load proposal context. Reload to retry.'); return res.json(); })
      .then((data) => {
        const existing = (data.proposals || []).find((p: ChangeProposal) => p.id === revisionId);
        if (existing) { setTitle(existing.title); setDescription(existing.description); setCriteria(existing.acceptance_criteria); setDollarAmount((existing.amount_cents / 100).toFixed(2)); return; }
        const req = (data.requests || []).find((r: ChangeRequest) => r.id === requestId);
        const an = (data.analyses || []).find((a: ScopeAnalysis) => a.change_request_id === requestId);

        if (req) {
          setTitle(current => current || `Add-on: ${req.client_request_text.slice(0, 50)}...`);
          setDescription(`Implement requested functionality: ${req.client_request_text}`);
        }

        if (an && an.identified_additional_work && an.identified_additional_work.length > 0) {
          setCriteria(an.identified_additional_work);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setContextLoading(false));
  }, [projectId, requestId, revisionId]);

  function handleAddCriterion() {
    setCriteria((prev) => [...prev, 'New deliverable acceptance criterion...']);
  }

  function handleUpdateCriterion(index: number, val: string) {
    setCriteria((prev) => prev.map((c, i) => (i === index ? val : c)));
  }

  function handleRemoveCriterion(index: number) {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let parsedCents: number;
    try { parsedCents = dollarsToCents(dollarAmount); } catch { setError('Enter a valid price with at most two decimal places.'); return; }
    if (parsedCents <= 0) {
      setError('Please enter a valid price in USD.');
      return;
    }

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    if (criteria.filter((c) => c.trim().length > 0).length === 0) {
      setError('Please provide at least one acceptance criterion.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(revisionId ? `/api/proposals/${revisionId}/version` : '/api/proposals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          change_request_id: requestId,
          title,
          description,
          acceptance_criteria: criteria.filter((c) => c.trim().length > 0),
          amount_cents: parsedCents,
          currency: 'USD',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create change proposal');
      }

      // Redirect to Project detail with created proposal
      router.push(`/projects/${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proposal creation failed');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="border-b border-slate-200 pb-6 mb-8">
        <span className="text-xs font-semibold uppercase text-teal-700 tracking-wider">
          {revisionId ? 'New proposal version · fresh approval required' : 'Proposal editor'}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
          Create Priced Change Proposal
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Define the exact scope, acceptance criteria, and price. Once approved by the client, this proposal is permanently frozen and connected to PayPal payment.
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-700 border border-rose-200">
          {error}
        </div>
      )}

      {/* Pricing Authority Notice */}
      <div className="mb-8 rounded-xl border border-teal-200 bg-teal-50/50 p-4 sm:p-5 flex items-start gap-3">
        <DollarSign className="h-5 w-5 text-teal-700 flex-shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-teal-900 space-y-1">
          <p className="font-semibold">Freelancer Price Control</p>
          <p className="text-teal-800 leading-relaxed">
            You enter or explicitly confirm the price. AI never sets a binding price or charges the client automatically.
          </p>
        </div>
      </div>

      <details className="mb-6 rounded-xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-semibold">Client preview · current draft</summary><h2 className="mt-4 text-lg font-bold">{title || 'Proposal title'}</h2><p className="mt-2 whitespace-pre-wrap text-sm">{description || 'Describe the additional work.'}</p><ul className="my-3 list-inside list-disc text-sm">{criteria.filter(Boolean).map((c, i) => <li key={i}>{c}</li>)}</ul><p className="font-semibold">{dollarAmount || '—'} USD</p><p className="mt-2 text-xs text-slate-600">Approval applies to this exact version. Sandbox checkout uses one configured receiver.</p></details>
      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        {contextLoading && <p role="status">Loading request and proposal details…</p>}
        <fieldset disabled={contextLoading || loading || !requestId} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-xs font-semibold text-slate-700 uppercase">
            Proposal Title *
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Appointment Booking & Google Calendar Add-on"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-xs font-semibold text-slate-700 uppercase">
            Scope Description of Additional Work *
          </label>
          <textarea
            id="description"
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the additional deliverables, technical integration steps, and deliverables in detail..."
            className="mt-1 block w-full rounded-lg border border-slate-300 p-3 text-xs sm:text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Price & Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-slate-100 py-5">
          <div>
            <label htmlFor="price" className="block text-xs font-semibold text-slate-700 uppercase">
              Proposed Price (USD) *
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-slate-500 text-sm">$</span>
              </div>
              <input
                aria-label="Acceptance criterion"
                id="price"
                type="text"
                required
                value={dollarAmount}
                onChange={(e) => setDollarAmount(e.target.value)}
                placeholder="150.00"
                className="block w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm font-bold text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              USD only. Choose the price yourself; AI does not set your fee.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase">
              Currency
            </label>
            <input
              type="text"
              readOnly
              value="USD (United States Dollar)" aria-label="Currency"
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Acceptance Criteria */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase">
              Acceptance Criteria (Checklist for Delivery) *
            </label>
            <button
              type="button"
              onClick={handleAddCriterion}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Criterion</span>
            </button>
          </div>

          <div className="space-y-2">
            {criteria.map((criterion, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                aria-label="Acceptance criterion"
                  type="text"
                  value={criterion}
                  onChange={(e) => handleUpdateCriterion(idx, e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveCriterion(idx)}
                  className="p-1.5 text-slate-500 hover:text-rose-600"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Link
            href={`/projects/${projectId}`}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 transition"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{loading ? 'Creating Proposal...' : 'Create Proposal & Generate Link'}</span>
          </button>
        </div>
        </fieldset>
      </form>
    </div>
  );
}
