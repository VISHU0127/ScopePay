'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  DollarSign,
  CornerDownRight,
} from 'lucide-react';
import { ChangeRequest, ScopeAnalysis, Project } from '@/lib/types';

export default function RequestAnalysisPage({
  params,
}: {
  params: Promise<{ id: string; requestId: string }>;
}) {
  const { id: projectId, requestId } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [request, setRequest] = useState<ChangeRequest | null>(null);
  const [analysis, setAnalysis] = useState<ScopeAnalysis | null>(null);
  const [isFixture, setIsFixture] = useState(false);
  const [modelUsed, setModelUsed] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copiedReply, setCopiedReply] = useState(false);

  const [editedReply, setEditedReply] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // 1. Fetch project to get request object
        const projRes = await fetch(`/api/projects/${projectId}`);
        const projData = await projRes.json();
        setProject(projData.project);

        const foundReq = (projData.requests || []).find((r: ChangeRequest) => r.id === requestId);
        setRequest(foundReq || null);

        // 2. Trigger or load analysis
        const anRes = await fetch('/api/requests/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ change_request_id: requestId }),
        });

        const anData = await anRes.json();
        if (!anRes.ok) throw new Error(anData.error || 'Analysis unavailable. Please retry.');
        if (anData.analysis) {
          setAnalysis(anData.analysis);
          setIsFixture(Boolean(anData.isFixture));
          setModelUsed(anData.modelUsed || '');
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Analysis unavailable');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [projectId, requestId]);

  function copyReply() {
    if (!analysis?.draft_client_reply) return;
    navigator.clipboard.writeText(editedReply ?? analysis.draft_client_reply);
    setCopiedReply(true);
    setTimeout(() => setCopiedReply(false), 2500);
  }

  if (loadError) return <div role="alert" className="mx-auto max-w-lg p-8 text-sm text-rose-800">{loadError}<button onClick={() => window.location.reload()} className="ml-4 underline">Retry analysis</button><Link className="ml-4 underline" href={`/projects/${projectId}`}>Return to project</Link></div>;

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600 animate-spin mb-4">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Comparing Request with Scope...</h2>
        <p className="mt-1 text-sm text-slate-500">
          Validating contract clauses and checking citations against the original agreement.
        </p>
      </div>
    );
  }

  if (!request || !analysis) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-900">Analysis Not Found</h2>
        <Link href={`/projects/${projectId}`} className="mt-4 inline-block text-sm text-teal-600 font-semibold">
          &larr; Back to Project
        </Link>
      </div>
    );
  }

  const isOutOfScope = analysis.classification === 'out_of_scope';
  const isInScope = analysis.classification === 'in_scope';

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb Header */}
      <div className="border-b border-slate-200 pb-6 mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2">
          <Link href="/dashboard" className="hover:text-slate-800">Projects</Link>
          <span>/</span>
          <Link href={`/projects/${projectId}`} className="hover:text-slate-800">{project?.name || 'Project'}</Link>
          <span>/</span>
          <span className="text-teal-700">Scope Analysis</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Change Request Evaluation
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Evaluated against confirmed Agreement v{analysis.agreement_version}
            </p>
          </div>

          {isOutOfScope && (
            <Link
              href={`/projects/${projectId}/proposals/new?request_id=${requestId}`}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition"
            >
              <DollarSign className="h-4 w-4" />
              <span>Draft Change Proposal</span>
            </Link>
          )}
        </div>
      </div>

      {/* Model & Grounding Notice Banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-600" />
          <span>
            Evaluator: <strong className="text-slate-800">{modelUsed || 'Saved analysis (provider not recorded)'}</strong>
            {isFixture && ' (Offline Grounded Demo Fixture)'}
          </span>
        </div>

        <div>
          {analysis.is_citation_verified ? (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Quoted text matches this agreement</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Unverified Citations Flagged</span>
            </span>
          )}
        </div>
      </div>

<p className="mb-6 text-sm text-slate-600">Suggestions require your review. A matching quotation does not establish that the interpretation is correct. Confirm scope and pricing with your client.</p>
      {/* Client Request Card */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Incoming Client Request
          </span>
          <span className="text-xs text-slate-500">
            {new Date(request.created_at).toLocaleDateString()}
          </span>
        </div>
        <p className="text-base text-slate-900 font-medium italic">
          &ldquo;{request.client_request_text}&rdquo;
        </p>
      </div>

      {/* Classification Card */}
      <div
        className={`mb-8 rounded-xl border p-6 shadow-sm ${
          isOutOfScope
            ? 'border-rose-200 bg-rose-50/40'
            : isInScope
            ? 'border-emerald-200 bg-emerald-50/40'
            : 'border-sky-200 bg-sky-50/40'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${
                isOutOfScope
                  ? 'bg-rose-100 text-rose-800'
                  : isInScope
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-sky-100 text-sky-800'
              }`}
            >
              {analysis.classification.replace('_', ' ')}
            </span>
            <span className="text-xs font-semibold text-slate-600">
              {isOutOfScope
                ? 'Requires Additional Change Proposal & Payment'
                : isInScope
                ? 'Covered in Original Scope / Revision Limit'
                : 'Needs Client Clarification Before Proceeding'}
            </span>
          </div>
        </div>

        <p className="text-sm text-slate-800 leading-relaxed font-normal">
          {analysis.explanation}
        </p>
      </div>

      {/* Sub-Parts Breakdown for Mixed Requests */}
      {analysis.sub_parts && analysis.sub_parts.length > 0 && (
        <div className="mb-8 rounded-xl border border-purple-200 bg-purple-50/30 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
            <CornerDownRight className="h-4 w-4 text-purple-700" />
            <span>Multi-Part Request Breakdown</span>
          </h3>

          <div className="space-y-3">
            {analysis.sub_parts.map((part, idx) => (
              <div key={idx} className="rounded-lg border border-purple-100 bg-white p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">Part: &ldquo;{part.part_text}&rdquo;</span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      part.classification === 'in_scope'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {part.classification.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{part.reasoning}</p>
                {part.scope_item_title && (
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">
                    Referenced Scope Item: {part.scope_item_title}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verbatim Contract Citations */}
      {analysis.verbatim_citations && analysis.verbatim_citations.length > 0 && (
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Verbatim Contract Evidence
          </h3>

          <div className="space-y-2">
            {analysis.verbatim_citations.map((quote, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-800"
              >
                &ldquo;{quote}&rdquo;
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Identified Additional Work (if out of scope) */}
      {analysis.identified_additional_work && analysis.identified_additional_work.length > 0 && (
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Identified Additional Work Items
          </h3>

          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-700">
            {analysis.identified_additional_work.map((work, idx) => (
              <li key={idx}>{work}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Clarification Questions (if ambiguous or out of scope) */}
      {analysis.clarification_questions && analysis.clarification_questions.length > 0 && (
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Questions for Client
          </h3>

          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-700">
            {analysis.clarification_questions.map((q, idx) => (
              <li key={idx}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Draft Client Reply */}
      <div className="mb-8 rounded-xl border border-teal-200 bg-teal-50/30 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900">
            Suggested Client-Facing Reply
          </h3>

          <button
            type="button"
            onClick={copyReply}
            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
          >
            {copiedReply ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Reply Text</span>
              </>
            )}
          </button>
        </div>

<textarea aria-label="Review and edit client reply" rows={6} className="w-full rounded-lg border border-teal-200 bg-white p-4 text-sm leading-relaxed text-slate-800" value={editedReply ?? analysis.draft_client_reply} onChange={event => setEditedReply(event.target.value)} />
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-6">
        <Link
          href={`/projects/${projectId}`}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          &larr; Return to Project Detail
        </Link>

        {isOutOfScope && (
          <Link
            href={`/projects/${projectId}/proposals/new?request_id=${requestId}`}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition"
          >
            <DollarSign className="h-4 w-4" />
            <span>Create Change Proposal &rarr;</span>
          </Link>
        )}
      </div>
    </div>
  );
}
