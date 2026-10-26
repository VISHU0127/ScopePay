import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { MemoryStore, DEMO_PROPOSAL_ID } from '../lib/db/memory-store';
const mock = vi.hoisted(() => ({ repo: null as unknown, configured: vi.fn(), verify: vi.fn(), reconcile: vi.fn() }));
vi.mock('@/lib/db', () => ({ getPersistentRepository: () => mock.repo }));
vi.mock('@/lib/paypal/client', () => ({ payPalService: { isConfigured: mock.configured, verifyWebhookSignature: mock.verify, reconcileOrder: mock.reconcile }, requestId: () => 'test-key' }));
import { POST } from '../app/api/webhooks/paypal/route';
let store: MemoryStore;
const event = (id = 'EVENT', type = 'PAYMENT.CAPTURE.COMPLETED') => ({ id, event_type: type, resource: { id: 'CAPTURE', supplementary_data: { related_ids: { order_id: 'ORDER' } } } });
function request(body: unknown, signed = true) {
  return new NextRequest('http://localhost/api/webhooks/paypal', { method: 'POST', headers: signed ? { 'paypal-transmission-id': 'test', 'paypal-transmission-time': 'time', 'paypal-cert-url': 'https://example.com/cert', 'paypal-auth-algo': 'SHA256withRSA', 'paypal-transmission-sig': 'test' } : {}, body: JSON.stringify(body) });
}
beforeEach(async () => {
  vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {});
  store = new MemoryStore(); mock.repo = store;
  await store.recordClientApproval({ proposal_id: DEMO_PROPOSAL_ID, proposal_version: 1, client_name: 'Buyer', client_email: 'buyer@example.com' });
  const proposal = await store.getProposal(DEMO_PROPOSAL_ID);
  const attempt = await store.reservePayment(proposal!); await store.attachPaymentOrder(attempt.id, 'ORDER');
  mock.configured.mockReturnValue(true); mock.verify.mockResolvedValue(true);
  mock.reconcile.mockResolvedValue({ success: true, orderId: 'ORDER', captureId: 'CAPTURE', status: 'COMPLETED' });
});
afterEach(() => vi.restoreAllMocks());
it('fails closed without configuration or signature headers', async () => {
  mock.configured.mockReturnValue(false); expect((await POST(request(event()))).status).toBe(503);
  mock.configured.mockReturnValue(true); expect((await POST(request(event(), false))).status).toBe(401);
  expect(mock.reconcile).not.toHaveBeenCalled();
});
it('rejects invalid signatures and verifies even replayed IDs', async () => {
  await store.recordProcessedWebhookEvent('EVENT', 'PAYMENT.CAPTURE.COMPLETED');
  mock.verify.mockResolvedValue(false); expect((await POST(request(event()))).status).toBe(401);
  expect(mock.reconcile).not.toHaveBeenCalled();
});
it('handles duplicate and delayed events without downgrading paid', async () => {
  expect((await POST(request(event()))).status).toBe(200);
  expect((await POST(request(event()))).status).toBe(200);
  expect(mock.reconcile).toHaveBeenCalledTimes(1);
  mock.reconcile.mockResolvedValue({ success: false, orderId: 'ORDER', captureId: 'CAPTURE', status: 'PENDING' });
  expect((await POST(request(event('OLD-PENDING', 'PAYMENT.CAPTURE.PENDING')))).status).toBe(200);
  expect((await store.getProposal(DEMO_PROPOSAL_ID))?.payment_status).toBe('paid');
});
it('does not acknowledge provider validation failures as processed', async () => {
  mock.reconcile.mockRejectedValue(new Error('mismatched receiver'));
  expect((await POST(request(event()))).status).toBe(500);
  expect(await store.isWebhookEventProcessed('EVENT')).toBe(false);
  expect((await store.getProposal(DEMO_PROPOSAL_ID))?.payment_status).toBe('payment_pending');
});
it('maps a verified reversal to the exact capture and preserves terminal state', async () => {
  await POST(request(event()));
  await POST(request(event('REV', 'PAYMENT.CAPTURE.REVERSED')));
  await POST(request(event('LATE', 'PAYMENT.CAPTURE.COMPLETED')));
  expect((await store.getProposal(DEMO_PROPOSAL_ID))?.payment_status).toBe('reversed');
});
