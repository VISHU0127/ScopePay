'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Plus,
  Trash2,
  Info,
  Sparkles,
} from 'lucide-react';
import { ScopeItemType } from '@/lib/types';

interface ScopeDraftItem {
  type: ScopeItemType;
  title: string;
  description: string;
  verbatim_quote?: string;
  is_confirmed: boolean;
}

interface ExtractedScopeData {
  project_summary?: string;
  deliverables?: ScopeDraftItem[];
  exclusions?: ScopeDraftItem[];
  revision_limits?: ScopeDraftItem[];
  timelines?: ScopeDraftItem[];
  acceptance_criteria?: ScopeDraftItem[];
  missing_details?: string[];
  clarification_questions?: string[];
}

export default function ScopeExtractionReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();

  const [items, setItems] = useState<ScopeDraftItem[]>([]);
  const [missingDetails, setMissingDetails] = useState<string[]>([]);
  const [clarifications, setClarifications] = useState<string[]>([]);

  const [agreement, setAgreement] = useState<{ id: string; raw_text: string; version: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {

    let active = true;

    // Fallback: fetch project details from API if not in cache
    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.error) { setError(data.error); return; }
        setAgreement(data.agreement);
        // Read browser-only drafts after hydration, once source identity is loaded.
        try {
          const cached = sessionStorage.getItem(`draft_scope_${projectId}`);
          if (cached) {
            const parsed: ExtractedScopeData = JSON.parse(cached);
            setItems([
              ...(parsed.deliverables || []).map(item => ({ ...item, type: 'deliverable' as const, is_confirmed: true })),
              ...(parsed.exclusions || []).map(item => ({ ...item, type: 'exclusion' as const, is_confirmed: true })),
              ...(parsed.revision_limits || []).map(item => ({ ...item, type: 'revision_limit' as const, is_confirmed: true })),
              ...(parsed.timelines || []).map(item => ({ ...item, type: 'timeline' as const, is_confirmed: true })),
              ...(parsed.acceptance_criteria || []).map(item => ({ ...item, type: 'acceptance_criteria' as const, is_confirmed: true })),
            ]);
            setMissingDetails(parsed.missing_details || []);
            setClarifications(parsed.clarification_questions || []);
            return;
          }
        } catch { /* A stale browser draft must not block loading saved scope. */ }
        if (data.scopeItems && data.scopeItems.length > 0) {
          setItems(current => current.length ? current : data.scopeItems);
        }
      })
      .catch(() => { if (active) setError('Could not load the source agreement. Reload to retry.'); });

    return () => {
      active = false;
    };
  }, [projectId]);

  function handleToggle(index: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, is_confirmed: !item.is_confirmed } : item
      )
    );
  }

  function handleUpdate(index: number, field: keyof ScopeDraftItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function handleRemove(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAdd(type: ScopeItemType) {
    setItems((prev) => [
      ...prev,
      {
        type,
        title: `New ${type.replace('_', ' ')}`,
        description: 'Describe scope item specification...',
        is_confirmed: true,
      },
    ]);
  }

  async function handleConfirm() {
    const confirmedItems = items.filter((i) => i.is_confirmed);
    if (confirmedItems.length === 0) {
      setError('Please select at least one item to confirm.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/confirm-scope`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: confirmedItems, agreement_id: agreement?.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to confirm scope');
      }

      sessionStorage.removeItem(`draft_scope_${projectId}`);
      router.push(`/projects/${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm scope');
      setLoading(false);
    }
  }

  const categoryTitles: Record<ScopeItemType, { title: string; color: string }> = {
    deliverable: { title: 'Agreed Deliverables', color: 'border-teal-200 bg-teal-50/40 text-teal-900' },
    exclusion: { title: 'Explicit Exclusions (Crucial for Scope Creep)', color: 'border-rose-200 bg-rose-50/40 text-rose-900' },
    revision_limit: { title: 'Revision Limits & Caps', color: 'border-amber-200 bg-amber-50/40 text-amber-900' },
    timeline: { title: 'Timeline & Milestones', color: 'border-sky-200 bg-sky-50/40 text-sky-900' },
    acceptance_criteria: { title: 'Acceptance Criteria', color: 'border-purple-200 bg-purple-50/40 text-purple-900' },
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
        <div>
          <span className="text-xs font-semibold uppercase text-teal-700 tracking-wider">
            Step 2 of Scope Onboarding
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Review &amp; Confirm Initial Scope
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review the extracted deliverables, explicit exclusions, and revision rounds. Items are drafts until you confirm them.
          </p>
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading || items.length === 0 || !agreement}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 transition"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{loading ? 'Confirming...' : 'Confirm reviewed scope'}</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-700 border border-rose-200">
          {error}
        </div>
      )}

      {agreement && <details open className="mb-8 rounded-xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-semibold">Source agreement · version {agreement.version}</summary><pre tabIndex={0} aria-label="Source agreement text" className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap font-sans text-sm leading-7 text-slate-700">{agreement.raw_text}</pre></details>}
      {/* Human-in-the-loop notice */}
      <div className="mb-8 rounded-xl border border-teal-200 bg-teal-50/50 p-4 sm:p-5 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-teal-700 flex-shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-teal-900 space-y-1">
          <p className="font-semibold">Reviewer Control &amp; Verbatim Grounding</p>
          <p className="text-teal-800 leading-relaxed">
            AI analysis provides initial extraction with contract quotations. You have final editorial authority to adjust descriptions, remove irrelevant points, or add custom scope items.
          </p>
        </div>
      </div>

      {/* Categories */}
      {(['deliverable', 'exclusion', 'revision_limit', 'timeline', 'acceptance_criteria'] as ScopeItemType[]).map(
        (type) => {
          const categoryItems = items
            .map((item, originalIndex) => ({ ...item, originalIndex }))
            .filter((item) => item.type === type);

          return (
            <div key={type} className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/60">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    {categoryTitles[type].title}
                  </h2>
                  <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    {categoryItems.length}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={!agreement} onClick={() => handleAdd(type)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 p-4 sm:p-6 space-y-4">
                {categoryItems.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">
                    No items in this category. (Click &ldquo;Add Item&rdquo; if needed).
                  </p>
                ) : (
                  categoryItems.map((item) => (
                    <div
                      key={item.originalIndex}
                      className={`p-4 rounded-lg border transition ${
                        item.is_confirmed
                          ? 'border-slate-200 bg-white'
                          : 'border-slate-200 bg-slate-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="checkbox"
                            aria-label={`Confirm ${item.title}`}
                            checked={item.is_confirmed}
                            onChange={() => handleToggle(item.originalIndex)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              aria-label="Scope item title"
                              value={item.title}
                              onChange={(e) =>
                                handleUpdate(item.originalIndex, 'title', e.target.value)
                              }
                              className="w-full text-sm font-bold text-slate-900 bg-transparent border-0 border-b border-transparent focus:border-teal-500 focus:ring-0 p-0"
                            />
                            <textarea
                              rows={2}
                              aria-label="Scope item description"
                              value={item.description}
                              onChange={(e) =>
                                handleUpdate(item.originalIndex, 'description', e.target.value)
                              }
                              className="w-full text-xs text-slate-600 bg-transparent border-0 border-b border-transparent focus:border-teal-500 focus:ring-0 p-0 resize-y"
                            />

                            {item.verbatim_quote && (
                              <div className="rounded bg-slate-50 p-2 border border-slate-200/80 text-[11px] text-slate-600 font-mono">
                                <span className="font-semibold text-slate-700">Verbatim Citation: </span>
                                &ldquo;{item.verbatim_quote}&rdquo;
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemove(item.originalIndex)}
                          title="Remove item" aria-label={`Remove ${item.title}`}
                          className="text-slate-500 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        }
      )}

      {/* Missing Details / Clarifications Card */}
      {(missingDetails.length > 0 || clarifications.length > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm mb-8">
          <h3 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-600" />
            <span>Missing Contract Details &amp; Clarifications</span>
          </h3>

          {missingDetails.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-amber-800 uppercase mb-1">
                Unspecified or Absent Terms in Text:
              </p>
              <ul className="list-disc list-inside text-xs text-amber-900 space-y-0.5">
                {missingDetails.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            </div>
          )}

          {clarifications.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-800 uppercase mb-1">
                Suggested Questions to Ask Client:
              </p>
              <ul className="list-disc list-inside text-xs text-amber-900 space-y-0.5">
                {clarifications.map((q, idx) => (
                  <li key={idx}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-4 border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading || items.length === 0 || !agreement}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 transition"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{loading ? 'Saving Confirmed Scope...' : 'Confirm reviewed scope'}</span>
        </button>
      </div>
    </div>
  );
}
