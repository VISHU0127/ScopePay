import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryStore, DEMO_PROPOSAL_ID, DEMO_CLIENT_RAW_TOKEN } from '../lib/db/memory-store';
import { createCheckout, captureCheckout, clientProposal } from '../lib/paypal/checkout';
import { PayPalService, requestId } from '../lib/paypal/client';
import { AIService } from '../lib/ai/adapter';
import { dollarsToCents } from '../lib/validations';
import { hashToken } from '../lib/crypto';

async function approvedStore() {
  const store = new MemoryStore();
  await store.recordClientApproval({ proposal_id: DEMO_PROPOSAL_ID, proposal_version: 1, client_name: 'Buyer', client_email: 'buyer@example.com' });
  return store;
}
describe('Deterministic checkout invariants (no provider calls)', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it('requires approval and preserves the approved price despite duplicate requests', async () => {
    await expect(createCheckout(new MemoryStore(), DEMO_PROPOSAL_ID, DEMO_CLIENT_RAW_TOKEN)).rejects.toThrow('Approve');
    const store = await approvedStore();
    const orders = await Promise.all(Array.from({ length: 12 }, () => createCheckout(store, DEMO_PROPOSAL_ID, DEMO_CLIENT_RAW_TOKEN)));
    expect(new Set(orders.map(o => o.orderId)).size).toBe(1);
    expect((await store.getPaymentAttemptByProposal(DEMO_PROPOSAL_ID))?.amount_cents).toBe(15000);
    await expect(store.createNewProposalVersion(DEMO_PROPOSAL_ID, { amount_cents: 1 })).rejects.toThrow('checkout');
    const results = await Promise.all(orders.map(o => captureCheckout(store, DEMO_PROPOSAL_ID, DEMO_CLIENT_RAW_TOKEN, o.orderId)));
    expect(results.every(r => r.success)).toBe(true);
    const proposal = await store.getProposal(DEMO_PROPOSAL_ID);
    expect((await store.listActivity(proposal!.project_id)).filter(e => e.event_type === 'payment_completed')).toHaveLength(1);
  });
  it('rejects unknown and mismatched orders before capture', async () => {
    const store = await approvedStore();
    await expect(captureCheckout(store, DEMO_PROPOSAL_ID, DEMO_CLIENT_RAW_TOKEN, 'foreign-order')).rejects.toThrow('Order');
    const order = await createCheckout(store, DEMO_PROPOSAL_ID, DEMO_CLIENT_RAW_TOKEN);
    const attempt = await store.getPaymentAttemptByOrderId(order.orderId);
    attempt!.proposal_version = 2;
    await expect(captureCheckout(store, DEMO_PROPOSAL_ID, DEMO_CLIENT_RAW_TOKEN, order.orderId)).rejects.toThrow('Order');
  });
  it('keeps pending unpaid, prevents stale failure overwriting paid, and retains refunds', async () => {
    const store = await approvedStore();
    const order = await createCheckout(store, DEMO_PROPOSAL_ID, DEMO_CLIENT_RAW_TOKEN);
    await store.updatePaymentAttemptCapture(order.orderId, '', 'pending');
    expect((await store.getProposal(DEMO_PROPOSAL_ID))?.payment_status).toBe('payment_pending');
    await captureCheckout(store, DEMO_PROPOSAL_ID, DEMO_CLIENT_RAW_TOKEN, order.orderId);
    await store.updatePaymentAttemptCapture(order.orderId, '', 'failed');
    expect((await store.getProposal(DEMO_PROPOSAL_ID))?.payment_status).toBe('paid');
    await store.updatePaymentAttemptCapture(order.orderId, 'refund-capture', 'refunded');
    await store.updatePaymentAttemptCapture(order.orderId, 'refund-capture', 'captured');
    expect((await store.getProposal(DEMO_PROPOSAL_ID))?.payment_status).toBe('refunded');
  });
  it('rejects revoked and expired links, and isolates stores', async () => {
    const first = await approvedStore(); const second = new MemoryStore();
    const record = await first.getClientAccessTokenByHash(hashToken(DEMO_CLIENT_RAW_TOKEN));
    await first.revokeClientAccessToken(record!.id);
    await expect(clientProposal(first, DEMO_PROPOSAL_ID, DEMO_CLIENT_RAW_TOKEN)).rejects.toThrow('expired');
    expect((await clientProposal(second, DEMO_PROPOSAL_ID, DEMO_CLIENT_RAW_TOKEN)).approval_status).toBe('sent');
    await second.createClientAccessToken(DEMO_PROPOSAL_ID, 'expired-token-value', -1);
    await expect(clientProposal(second, DEMO_PROPOSAL_ID, 'expired-token-value')).rejects.toThrow('expired');
  });
  it('does not use Acme fixture clauses for another agreement', async () => {
    vi.stubEnv('GEMINI_API_KEY', ''); vi.stubEnv('GOOGLE_API_KEY', '');
    const ai = new AIService();
    const result = await ai.analyzeRequest('Acme: booking integration is included.', [], 'Add a booking widget please');
    expect(result.data.classification).toBe('ambiguous');
    expect(result.data.verbatim_citations).toEqual([]);
    const extract = await ai.extractScope('Acme: create a single-page prototype.');
    expect(extract.data.exclusions).toEqual([]);
  });
  it('rejects invalid money instead of silently coercing it', () => {
    for (const amount of ['abc', '1.999', '-5', '12x3', 'Infinity', '']) expect(() => dollarsToCents(amount)).toThrow();
    expect(dollarsToCents('1.01')).toBe(101);
  });
});

describe('PayPal HTTP adapter using mocked responses, not sandbox verification', () => {
  beforeEach(() => {
    for (const name of ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID']) vi.stubEnv(name, 'test-value');
    vi.stubEnv('PAYPAL_MERCHANT_ID', 'MERCHANT'); vi.stubEnv('PAYPAL_API_BASE', 'https://api-m.sandbox.paypal.com');
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  const order = () => ({ id: 'ORDER', status: 'APPROVED', purchase_units: [{ custom_id: DEMO_PROPOSAL_ID, reference_id: DEMO_PROPOSAL_ID, payee: { merchant_id: 'MERCHANT' }, amount: { value: '150.00', currency_code: 'USD' } }] });
  it.each(['merchant', 'amount', 'currency', 'proposal', 'order', 'missing'])('rejects %s mismatch', reason => {
    const data = order();
    if (reason === 'merchant') data.purchase_units[0].payee.merchant_id = 'OTHER';
    if (reason === 'amount') data.purchase_units[0].amount.value = '1.00';
    if (reason === 'currency') data.purchase_units[0].amount.currency_code = 'EUR';
    if (reason === 'proposal') data.purchase_units[0].custom_id = 'OTHER';
    if (reason === 'order') data.id = 'OTHER';
    if (reason === 'missing') data.purchase_units = [];
    expect(() => new PayPalService().validateOrder(data, 'ORDER', DEMO_PROPOSAL_ID, 15000, 'USD')).toThrow();
  });
  it('reconciles a capture timeout and keeps a pending capture unpaid', async () => {
    const captured = { ...order(), purchase_units: [{ ...order().purchase_units[0], payments: { captures: [{ id: 'CAPTURE', status: 'PENDING', amount: { value: '150.00', currency_code: 'USD' } }] } }] };
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ access_token: 'fake', expires_in: 3600 }))
      .mockResolvedValueOnce(Response.json(order())).mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(Response.json(captured)).mockResolvedValueOnce(Response.json(captured.purchase_units[0].payments.captures[0]));
    vi.stubGlobal('fetch', fetcher);
    const result = await new PayPalService().captureOrder('ORDER', DEMO_PROPOSAL_ID, 15000, 'USD');
    expect(result.success).toBe(false); expect(result.status).toBe('PENDING');
    expect(fetcher.mock.calls[2][1].headers['PayPal-Request-Id']).toBe(requestId('capture', 'ORDER'));
  });
  it('accepts only SUCCESS from documented webhook verification API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ access_token: 'fake', expires_in: 3600 })).mockResolvedValueOnce(Response.json({ verification_status: 'FAILURE' })));
    expect(await new PayPalService().verifyWebhookSignature({ transmissionId: 'id', transmissionTime: 'time', certUrl: 'https://example.com/cert', authAlgo: 'SHA256withRSA', transmissionSig: 'sig', webhookId: 'test', webhookEvent: {} })).toBe(false);
  });
});
