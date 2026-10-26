'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  CheckCircle2,
  ArrowRight,
  PlusCircle,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  DollarSign,
} from 'lucide-react';
import {
  Project,
  Agreement,
  ScopeItem,
  ChangeRequest,
  ChangeProposal,
  ActivityEvent,
  ScopeAnalysis,
} from '@/lib/types';
import { centsToDollars } from '@/lib/validations';

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([]);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [proposals, setProposals] = useState<ChangeProposal[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [analyses, setAnalyses] = useState<ScopeAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // New Request Form State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [newRequestText, setNewRequestText] = useState('');
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const loadProjectData = useCallback(() => {
    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.project) {
          setProject(data.project);
          setAgreement(data.agreement);
          setScopeItems(data.scopeItems || []);
          setRequests(data.requests || []);
          setProposals(data.proposals || []);
          setActivity(data.activity || []);
          setAnalyses(data.analyses || []);
        }
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  async function handlePreset(text: string) {
    setNewRequestText(text);
    setShowRequestModal(true);
  }

  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!newRequestText.trim()) return;

    setSubmittingRequest(true); setRequestError(null);
    try {
      const res = await fetch('/api/requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          client_request_text: newRequestText,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save request');
      if (data.changeRequest) {
        setShowRequestModal(false);
        setNewRequestText('');
        loadProjectData();
        // Redirect to analysis screen immediately
        router.push(`/projects/${projectId}/requests/${data.changeRequest.id}`);
      }
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Could not save request. Please retry.');
    } finally {
      setSubmittingRequest(false);
    }
  }

  async function handleResetDemo() {
    if (!confirm('Reset workspace to initial Acme Studio demo state?')) return;
    await fetch('/api/demo/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    loadProjectData();
  }

  async function copyClientLink(proposalId: string, open = false) {
    try {
      const res = await fetch(`/api/proposals/${proposalId}/link`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Link unavailable');
      const url = `${window.location.origin}${data.clientLink}`;
      if (open) { router.push(data.clientLink); return; }
      await navigator.clipboard.writeText(url);
      setCopiedTokenId(proposalId);
      setTimeout(() => setCopiedTokenId(null), 2500);
    } catch { alert('Could not create or copy the link. Please retry.'); }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-sm text-slate-500">Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-900">Project Not Found</h2>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-teal-600 font-semibold">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Project Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xs font-semibold text-slate-500 hover:text-slate-800">
              &larr; Projects
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-teal-700">Project Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Client: <span className="font-semibold text-slate-800">{project.client_name}</span> ({project.client_email})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetDemo}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            <span>Reset Demo Data</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRequestModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ Test Client Request</span>
          </button>
        </div>
      </div>

      {/* Demo Preset Request Bar */}
      <div className="mb-8 rounded-xl border border-teal-200 bg-teal-50/50 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900">
              Interactive Test Presets (Try These Scenarios)
            </h3>
          </div>
          <span className="text-xs text-teal-700">Click any preset to simulate incoming client message:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() =>
              handlePreset('We would love to add an appointment booking widget with Google Calendar sync directly on the services page.')
            }
            className="text-left rounded-lg border border-rose-200 bg-white p-3 hover:border-rose-300 hover:shadow-xs transition"
          >
            <span className="inline-block rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 uppercase mb-1">
              Additional work example
            </span>
            <p className="text-xs text-slate-800 line-clamp-2">
              Add appointment booking with Google Calendar sync
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              handlePreset('Could we change the main headline on the homepage to "Design that drives sustainable brand growth" before launch?')
            }
            className="text-left rounded-lg border border-emerald-200 bg-white p-3 hover:border-emerald-300 hover:shadow-xs transition"
          >
            <span className="inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase mb-1">
              Revision availability
            </span>
            <p className="text-xs text-slate-800 line-clamp-2">
              Update homepage headline copy within revision round
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              handlePreset('We want to improve website performance so it feels super fast on all mobile devices.')
            }
            className="text-left rounded-lg border border-sky-200 bg-white p-3 hover:border-sky-300 hover:shadow-xs transition"
          >
            <span className="inline-block rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800 uppercase mb-1">
              Ambiguous Scope
            </span>
            <p className="text-xs text-slate-800 line-clamp-2">
              Improve website performance (unspecified metrics)
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              handlePreset('Please fix the typo in our office phone number on the contact page, and also set up automated SMS text message alerts to our sales director whenever someone submits the inquiry form.')
            }
            className="text-left rounded-lg border border-purple-200 bg-white p-3 hover:border-purple-300 hover:shadow-xs transition"
          >
            <span className="inline-block rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800 uppercase mb-1">
              Mixed Request
            </span>
            <p className="text-xs text-slate-800 line-clamp-2">
              Fix typo (in scope) + SMS alert integration (out of scope)
            </p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Scope & Change Requests (2 cols) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Confirmed Scope Box */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Confirmed Scope &amp; Exclusions (v{agreement?.version || 1})
                </h2>
              </div>
              <Link
                href={`/projects/${projectId}/review-scope`}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800"
              >
                Edit Scope
              </Link>
            </div>

            <div className="divide-y divide-slate-100 p-6 space-y-4">
              {scopeItems.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500">No scope items confirmed yet.</p>
                  <Link
                    href={`/projects/${projectId}/review-scope`}
                    className="mt-2 inline-block text-xs font-semibold text-teal-600"
                  >
                    Extract and confirm scope &rarr;
                  </Link>
                </div>
              ) : (
                scopeItems.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          item.type === 'exclusion'
                            ? 'bg-rose-100 text-rose-800'
                            : item.type === 'revision_limit'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {item.type.replace('_', ' ')}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                    </div>
                    <p className="text-xs text-slate-600">{item.description}</p>
                    {item.verbatim_quote && (
                      <p className="mt-1 text-[11px] font-mono text-slate-500 italic bg-slate-50 p-1.5 rounded border border-slate-100">
                        &ldquo;{item.verbatim_quote}&rdquo;
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Change Requests Section */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-700" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Change Requests ({requests.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Submit Request</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 p-6 space-y-4">
              {requests.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500">No client change requests recorded yet.</p>
                </div>
              ) : (
                requests.map((req) => {
                  const analysis = analyses.find((a) => a.change_request_id === req.id);
                  const proposal = proposals.find((p) => p.change_request_id === req.id);

                  return (
                    <div key={req.id} className="pt-4 first:pt-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">
                              {req.submitted_by_name || 'Client'}
                            </span>
                            <span className="text-slate-300">&bull;</span>
                            <span className="text-[11px] text-slate-500">
                              {new Date(req.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-900 font-medium">
                            &ldquo;{req.client_request_text}&rdquo;
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {analysis && (
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                                analysis.classification === 'in_scope'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : analysis.classification === 'out_of_scope'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {analysis.classification.replace('_', ' ')}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-medium capitalize">
                            Status: {req.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-50 pt-2 mt-2">
                        <Link
                          href={`/projects/${projectId}/requests/${req.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                        >
                          <span>View Grounded AI Analysis</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>

                        {analysis?.classification === 'out_of_scope' && !proposal && (
                          <Link
                            href={`/projects/${projectId}/proposals/new?request_id=${req.id}`}
                            className="inline-flex items-center gap-1 rounded bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                          >
                            <DollarSign className="h-3 w-3" />
                            <span>Create Change Proposal</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Proposals & Activity Log (1 col) */}
        <div className="space-y-8">
          {/* Change Proposals Card */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/60">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Change Proposals ({proposals.length})
              </h2>
            </div>

            <div className="divide-y divide-slate-100 p-6 space-y-4">
              {proposals.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No change proposals generated yet.</p>
              ) : (
                proposals.map((proposal) => {
                  const isApproved = proposal.approval_status === 'approved';
                  const isPaid = proposal.payment_status === 'paid';

                  return (
                    <div key={proposal.id} className="pt-3 first:pt-0 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[11px] font-semibold text-slate-500">v{proposal.version}</span>
                          <h4 className="text-sm font-bold text-slate-900">{proposal.title}</h4>
                        </div>
                        <span className="text-base font-extrabold text-slate-900">
                          ${centsToDollars(proposal.amount_cents)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span
                          className={`rounded px-1.5 py-0.5 font-bold uppercase ${
                            isApproved
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {proposal.approval_status}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 font-bold uppercase ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {proposal.payment_status}
                        </span>
                      </div>

                      {proposal.approval_status !== 'superseded' && proposal.payment_status === 'unpaid' && <Link className="block py-2 text-sm font-semibold text-teal-700 underline" href={`/projects/${projectId}/proposals/new?request_id=${proposal.change_request_id}&revision_id=${proposal.id}`}>Revise as a new version</Link>}
                      <button type="button" className="block py-2 text-xs text-slate-600 underline" onClick={async () => { const res = await fetch(`/api/proposals/${proposal.id}/link`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } }); alert(res.ok ? 'Existing links revoked. Generate a new link when ready.' : 'Could not revoke links. Please retry.'); }}>Revoke existing client links</button>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => copyClientLink(proposal.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {copiedTokenId === proposal.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span className="text-emerald-700">Link Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 text-slate-500" />
                              <span>Copy Client Link</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => copyClientLink(proposal.id, true)}
                          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 hover:text-slate-800"
                          title="Open Client Approval Page"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Activity Log */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 bg-slate-50/60">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Activity &amp; Audit Trail
              </h2>
            </div>

            <div className="p-6">
              <ol className="relative border-l border-slate-200 space-y-6 ml-2">
                {activity.map((act) => (
                  <li key={act.id} className="ml-4">
                    <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-teal-700" />
                    <time className="text-[10px] font-semibold uppercase text-slate-500">
                      {new Date(act.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                    <p className="text-xs font-medium text-slate-800 mt-0.5">
                      {act.description}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Change Request Dialog */}
      {showRequestModal && (
        <dialog ref={node => { if (node && !node.open) node.showModal(); }} onCancel={() => setShowRequestModal(false)} aria-labelledby="request-dialog-title" className="fixed inset-0 m-auto w-full max-w-lg rounded-xl bg-transparent p-4 backdrop:bg-slate-900/50">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 id="request-dialog-title" className="text-lg font-bold text-slate-900 mb-2">
              Submit New Client Change Request
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter the request text as sent by the client. AI will evaluate it against the confirmed scope.
            </p>

            {requestError && <p role="alert" className="mb-3 text-sm text-rose-700">{requestError}</p>}
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label htmlFor="request-description" className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Client Request Description *
                </label>
                <textarea
                  id="request-description" autoFocus
                  rows={4}
                  required
                  value={newRequestText}
                  onChange={(e) => setNewRequestText(e.target.value)}
                  placeholder="e.g. Could you add a customer testimonial slider on the homepage?"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest || !newRequestText.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{submittingRequest ? 'Analyzing...' : 'Analyze with AI'}</span>
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
}
