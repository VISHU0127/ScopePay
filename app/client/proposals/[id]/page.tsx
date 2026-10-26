'use client';

import { use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Lock,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { ChangeProposal, ClientApprovalRecord } from '@/lib/types';
import { centsToDollars } from '@/lib/validations';

import { Suspense } from 'react';

export default function ClientProposalPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-slate-500">Loading proposal...</div>}>
      <ClientProposalContent {...props} />
    </Suspense>
  );
}

function ClientProposalContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: proposalId } = use(params);
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);


  const [proposal, setProposal] = useState<ChangeProposal | null>(null);
  const [project, setProject] = useState<{ name: string; client_name: string } | null>(null);
  const [approval, setApproval] = useState<ClientApprovalRecord | null>(null);
  const [isPayPalLive, setIsPayPalLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1)).get('token');
    const legacy = new URLSearchParams(window.location.search).get('token');
    const value = fragment || (legacy && (/^[a-f0-9]{64}$/.test(legacy) || legacy === 'demo-acme-approval-token-2026') ? legacy : '') || sessionStorage.getItem(`client_access_${proposalId}`) || '';
    if (value) sessionStorage.setItem(`client_access_${proposalId}`, value);
    const url = new URL(window.location.href); url.hash = ''; url.searchParams.delete('token');
    window.history.replaceState(null, '', url.pathname + url.search);
    // Synchronize a browser-only bearer token after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(value);
    if (!value) { setError('Use the complete proposal link from your freelancer.'); setLoading(false); }
  }, [proposalId]);

  // Approval Form State
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [approving, setApproving] = useState(false);

  // Payment State
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<{
    orderId: string;
    captureId?: string;
    payerEmail?: string;
    mode: string;
    message?: string;
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;

    fetch(`/api/client/proposals/${proposalId}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.error) {
          setError(data.error);
        } else {
          setProposal(data.proposal);
          setProject(data.project);
          setApproval(data.approval || null);
          setIsPayPalLive(Boolean(data.isPayPalLive));
          setIsDemo(Boolean(data.isDemo));
          setOrderId(data.orderId || null);
          if (data.project?.client_name) {
            setClientName(data.project.client_name);
          }
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Error loading proposal');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [proposalId, token]);

  function refreshProposal() {
    if (!token) return;
    fetch(`/api/client/proposals/${proposalId}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.proposal) {
          setProposal(data.proposal);
          setApproval(data.approval || null);
        }
      });
  }

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim() || !clientEmail.trim()) {
      setError('Please provide your name and email to record approval.');
      return;
    }

    setApproving(true);
    setError(null);

    try {
      const res = await fetch(`/api/proposals/${proposalId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          client_name: clientName,
          client_email: clientEmail,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Approval failed');
      }

      setApproval(data.approval);
      setProposal(data.proposal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setApproving(false);
    }
  }

  async function handlePayment() {
    setPaying(true);
    setError(null);

    try {
      if (orderId && searchParams.get('checkout') === 'return') {
        await finishCapture(orderId); return;
      }
      // 1. Create or resume the reserved order on server
      const orderRes = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_id: proposalId,
          token,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to initialize payment');
      }

      setOrderId(orderData.orderId);
      if (orderData.mode === 'live_sandbox') {
        if (!orderData.approveUrl) throw new Error('Checkout needs merchant review. No approval link is available.');
        window.location.assign(orderData.approveUrl);
        return;
      }
      await finishCapture(orderData.orderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  }

  async function finishCapture(id: string) {
    const res = await fetch('/api/paypal/capture-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposal_id: proposalId, token, order_id: id }) });
    const data = await res.json();
    if (!res.ok) throw new Error('Payment outcome is not yet known. Refresh status before retrying.');
    if (!data.success) { setError(`Payment status: ${data.status}. No completed payment is recorded. Check status again shortly.`); refreshProposal(); return; }
    setPaymentSuccess(true);
    setPaymentReceipt({ orderId: id, captureId: data.captureId, mode: data.mode });
    refreshProposal();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-sm text-slate-500">Loading proposal details securely...</p>
      </div>
    );
  }

  if (error && !proposal) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-600">{error}</p>
      </div>
    );
  }

  if (!proposal) return null;

  const isApproved = proposal.approval_status === 'approved';
  const isPaid = proposal.payment_status === 'paid' || (paymentSuccess && !['refunded', 'reversed'].includes(proposal.payment_status));

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Client Header */}
      <div className="border-b border-slate-200 pb-6 mb-8 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
          <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800 border border-teal-200">
            {project?.name || 'Project'}
          </span>
          <span className="text-xs text-slate-500">&bull;</span>
          <span className="text-xs text-slate-500">Revision v{proposal.version}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Change Proposal: {proposal.title}
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Presented to <span className="font-semibold text-slate-700">{project?.client_name}</span> &bull; ScopePay Secure Client Portal
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-700 border border-rose-200">
          {error}
        </div>
      )}

      {searchParams.get('checkout') === 'cancelled' && <p role="status" className="mb-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Checkout was cancelled. No success is assumed. You can resume the same order.</p>}
      {searchParams.get('checkout') === 'return' && !isPaid && <p role="status" className="mb-6 rounded-lg bg-teal-50 p-4 text-sm text-teal-900">Returned from PayPal. Select “Verify payment status” to complete server capture and verification.</p>}
      <p className="mb-4 text-sm text-slate-600">{isDemo ? 'Private demo · simulated payments only. No PayPal transaction occurs.' : 'PayPal Sandbox · one configured receiving account. No real money moves.'}</p>
      {/* Proposal Summary Box */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Proposed Price
            </span>
            <div className="text-3xl font-black text-slate-900 mt-0.5">
              ${centsToDollars(proposal.amount_cents)}{' '}
              <span className="text-sm font-semibold text-slate-500 uppercase">{proposal.currency}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                isApproved
                  ? 'bg-teal-100 text-teal-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              Approval: {proposal.approval_status}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                isPaid
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              Payment: {isPaid ? 'paid' : proposal.payment_status}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Description of Additional Deliverables
            </h3>
            <p className="text-sm text-slate-800 leading-relaxed">
              {proposal.description}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Acceptance Criteria Checklist
            </h3>
            <ul className="space-y-2">
              {proposal.acceptance_criteria.map((criterion, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span>{criterion}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {proposal.frozen_at && (
          <div className="mt-6 rounded-lg bg-slate-50 p-3 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <Lock className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <span>
              <strong>Frozen Agreement:</strong> This proposal version was formally approved and locked on{' '}
              {new Date(proposal.frozen_at).toLocaleDateString()}. Any further changes will require a new version.
            </span>
          </div>
        )}
      </div>

      {['refunded', 'reversed'].includes(proposal.payment_status) && <p role="status" className="mb-6 rounded-lg bg-amber-50 p-4 text-amber-900">This payment was {proposal.payment_status}. Contact the merchant for the transaction details.</p>}
      {/* Step 1: Formal Client Approval */}
      {!isApproved && proposal.approval_status !== 'superseded' ? (
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Step 1 of 2
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Review and Record Approval
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Confirm your acceptance of the additional deliverables and proposed pricing.
            </p>
          </div>

          <form onSubmit={handleApprove} className="space-y-4">
            <div>
              <label htmlFor="clientName" className="block text-xs font-semibold text-slate-700 uppercase">
                Your Full Name *
              </label>
              <input
                id="clientName"
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Sarah Jenkins"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label htmlFor="clientEmail" className="block text-xs font-semibold text-slate-700 uppercase">
                Your Email Address *
              </label>
              <input
                id="clientEmail"
                type="email"
                required
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="sarah@acmestudio.example"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-xs font-semibold text-slate-700 uppercase">
                Approval Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special notes or scheduling constraints..."
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Disclaimer: This action records approval through this secure proposal link. It is not identity verification or a certified electronic signature.
            </p>

            <button
              type="submit"
              disabled={approving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 transition"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{approving ? 'Recording Approval...' : `Approve Proposal v${proposal.version} & Proceed to Payment`}</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="mb-8 rounded-xl border border-teal-200 bg-teal-50/50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-teal-700 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-teal-900">
                Proposal v{proposal.version} Formally Approved
              </h3>
              <p className="text-xs text-teal-800 mt-1">
                Approved by <strong>{approval?.client_name || clientName}</strong>  on{' '}
                {approval?.approved_at ? new Date(approval.approved_at).toLocaleString() : 'recently'}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: PayPal Payment */}
      {isApproved && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Step 2 of 2
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Payment via PayPal Checkout
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Secure payment for approved change proposal amount.
            </p>
          </div>

          {isPaid ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-emerald-900">{isDemo ? 'Simulated payment recorded' : 'Sandbox payment verified'}</h3>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">
                Thank you! Payment of <strong>${centsToDollars(proposal.amount_cents)} USD</strong> is recorded for this proposal. The payment state is recorded in the project activity history.
              </p>

              {paymentReceipt && (
                <div className="mt-4 rounded-lg bg-white p-4 border border-emerald-200 text-left text-xs font-mono space-y-1 text-slate-700 max-w-md mx-auto">
                  <p><strong>PayPal Order ID:</strong> {paymentReceipt.orderId}</p>
                  {paymentReceipt.captureId && (
                    <p><strong>Capture ID:</strong> {paymentReceipt.captureId}</p>
                  )}
                  <p><strong>Status:</strong> COMPLETED</p>
                  <p><strong>Mode:</strong> {paymentReceipt.mode}</p>
                  {paymentReceipt.message && (
                    <p className="text-[11px] text-slate-500 mt-2 font-sans">{paymentReceipt.message}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Total Due Now</p>
                  <p className="text-xl font-black text-slate-900">
                    ${centsToDollars(proposal.amount_cents)} USD
                  </p>
                </div>
                <CreditCard className="h-6 w-6 text-slate-500" />
              </div>

              {!isPayPalLive && (
                <div className="rounded-lg bg-amber-50 p-3.5 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{isDemo ? 'Simulation mode' : 'Checkout unavailable'}</p>
                    <p className="text-amber-800 mt-0.5">
                      {isDemo ? 'This private demo simulates checkout. It does not contact PayPal.' : 'Sandbox checkout is currently unavailable. Contact the workspace owner.'}
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handlePayment}
                disabled={paying || (!isPayPalLive && !isDemo) || ['refunded', 'reversed'].includes(proposal.payment_status)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0070ba] hover:bg-[#003087] px-6 py-3.5 text-sm font-bold text-white shadow-sm disabled:opacity-50 transition"
              >
                <CreditCard className="h-4 w-4" />
                <span>
                  {paying
                    ? 'Processing Payment...'
                    : searchParams.get('checkout') === 'return' ? 'Verify payment status' : isDemo ? 'Simulate demo payment' : `Continue to PayPal · $${centsToDollars(proposal.amount_cents)} USD`}
                </span>
              </button>

              {orderId && <button type="button" disabled={paying} className="w-full py-2 text-sm font-semibold text-teal-700 underline" onClick={async () => { setPaying(true); setError(null); try { await finishCapture(orderId); } catch { setError('Payment outcome is still unknown. Check again before retrying checkout.'); } finally { setPaying(false); } }}>Check existing payment status</button>}
              <p className="text-center text-[11px] text-slate-500">
                Single sandbox receiving account configured for hackathon demonstration. Server verifies amount and capture status before recording payment.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
