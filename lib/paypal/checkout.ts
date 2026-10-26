import { IScopePayRepository } from '@/lib/db/repository';
import { hashToken } from '@/lib/crypto';
import { MemoryStore } from '@/lib/db/memory-store';
import { payPalService, requestId, PayPalCaptureResult } from './client';
export async function clientProposal(repo: IScopePayRepository, id: string, token: string) {
  const access = await repo.getClientAccessTokenByHash(hashToken(token));
  if (!access || access.proposal_id !== id || access.revoked_at || Date.parse(access.expires_at) <= Date.now()) throw new Error('Invalid or expired proposal link');
  const proposal = await repo.getProposal(id);
  if (!proposal || proposal.approval_status === 'superseded') throw new Error('Proposal no longer available');
  return proposal;
}
export async function createCheckout(repo: IScopePayRepository, id: string, token: string) {
  const proposal = await clientProposal(repo, id, token);
  if (proposal.approval_status !== 'approved' || !await repo.getClientApproval(id, proposal.version)) throw new Error('Approve this version first');
  if (['paid', 'refunded', 'reversed'].includes(proposal.payment_status)) throw new Error('This checkout is closed');
  const simulated = repo instanceof MemoryStore;
  if (!simulated && !payPalService.isConfigured()) throw new Error('Sandbox checkout is not configured');
  const attempt = await repo.reservePayment(proposal);
  if (attempt.paypal_order_id.startsWith('reserved:')) {
    // PayPal retains request IDs for six hours by default. Never create again after that window.
    if (Date.now() - Date.parse(attempt.created_at) > 5 * 3600000) throw new Error('Checkout requires merchant reconciliation before retry');
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const order = simulated ? { orderId: `SIM-${attempt.id}`, approveUrl: undefined } : await payPalService.createOrder({ proposalId: id, amountCents: attempt.amount_cents, currency: attempt.currency, title: proposal.title, idempotencyKey: requestId('create', attempt.id), returnUrl: `${base}/client/proposals/${id}?checkout=return`, cancelUrl: `${base}/client/proposals/${id}?checkout=cancelled` });
    const saved = await repo.attachPaymentOrder(attempt.id, order.orderId, order.approveUrl);
    return { mode: simulated ? 'simulated_sandbox' : 'live_sandbox', orderId: saved.paypal_order_id, approveUrl: saved.approval_url };
  }
  return { mode: simulated ? 'simulated_sandbox' : 'live_sandbox', orderId: attempt.paypal_order_id, approveUrl: attempt.approval_url };
}
export async function applyResult(repo: IScopePayRepository, result: PayPalCaptureResult) {
  return repo.updatePaymentAttemptCapture(result.orderId, result.captureId || '', result.status === 'COMPLETED' ? 'captured' : result.status === 'FAILED' ? 'failed' : result.status === 'REFUNDED' ? 'refunded' : result.status === 'REVERSED' ? 'reversed' : 'pending');
}
export async function captureCheckout(repo: IScopePayRepository, id: string, token: string, orderId: string) {
  const proposal = await clientProposal(repo, id, token);
  const attempt = await repo.getPaymentAttemptByOrderId(orderId);
  if (!attempt || attempt.proposal_id !== id || attempt.proposal_version !== proposal.version || attempt.amount_cents !== proposal.amount_cents || attempt.currency !== proposal.currency || proposal.approval_status !== 'approved') throw new Error('Order does not belong to this approved version');
  const simulated = repo instanceof MemoryStore;
  const result: PayPalCaptureResult = simulated ? { success: true, orderId, captureId: `SIM-CAP-${attempt.id}`, status: 'COMPLETED' } : await payPalService.captureOrder(orderId, id, attempt.amount_cents, attempt.currency, requestId('capture', attempt.id));
  const saved = await applyResult(repo, result);
  return { success: saved.status === 'captured', status: saved.status, orderId, captureId: saved.paypal_capture_id, mode: simulated ? 'simulated_sandbox' : 'live_sandbox' };
}
