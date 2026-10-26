import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStore, DEMO_PROPOSAL_ID } from '../lib/db/memory-store';

describe('PayPal Payments and Webhook Idempotency', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  it('records payment attempts with unique paypal_order_id', async () => {
    const orderId = 'TEST-ORDER-12345';
    const attempt = await store.createPaymentAttempt({
      proposal_id: DEMO_PROPOSAL_ID,
      paypal_order_id: orderId,
      amount_cents: 15000,
      currency: 'USD',
      status: 'created',
    });

    expect(attempt.paypal_order_id).toBe(orderId);
    expect(attempt.status).toBe('created');

    // Duplicate create returns existing attempt without duplicate error
    const duplicate = await store.createPaymentAttempt({
      proposal_id: DEMO_PROPOSAL_ID,
      paypal_order_id: orderId,
      amount_cents: 15000,
      currency: 'USD',
      status: 'created',
    });

    expect(duplicate.id).toBe(attempt.id);
  });

  it('marks proposal paid upon successful order capture', async () => {
    const orderId = 'TEST-ORDER-CAPTURE';
    await store.createPaymentAttempt({
      proposal_id: DEMO_PROPOSAL_ID,
      paypal_order_id: orderId,
      amount_cents: 15000,
      currency: 'USD',
      status: 'created',
    });

    const updated = await store.updatePaymentAttemptCapture(
      orderId,
      'TEST-CAPTURE-ID-999',
      'captured',
      { email: 'payer@example.com', name: 'Test Payer' }
    );

    expect(updated.status).toBe('captured');
    expect(updated.paypal_capture_id).toBe('TEST-CAPTURE-ID-999');

    const proposal = await store.getProposal(DEMO_PROPOSAL_ID);
    expect(proposal?.payment_status).toBe('paid');
  });

  it('does NOT mark proposal paid when payment attempt fails or is pending', async () => {
    const orderId = 'TEST-ORDER-FAILED';
    await store.createPaymentAttempt({
      proposal_id: DEMO_PROPOSAL_ID,
      paypal_order_id: orderId,
      amount_cents: 15000,
      currency: 'USD',
      status: 'created',
    });

    await store.updatePaymentAttemptCapture(
      orderId,
      'UNKNOWN',
      'failed',
      { error: 'Card declined' }
    );

    const proposal = await store.getProposal(DEMO_PROPOSAL_ID);
    expect(proposal?.payment_status).toBe('payment_failed');
    expect(proposal?.payment_status).not.toBe('paid');
  });

  it('enforces idempotency on webhook events preventing duplicate processing', async () => {
    const eventId = 'WH-EVENT-UNIQUE-777';

    // First check: not processed
    expect(await store.isWebhookEventProcessed(eventId)).toBe(false);

    // Record processed
    await store.recordProcessedWebhookEvent(eventId, 'PAYMENT.CAPTURE.COMPLETED');

    // Second check: is processed
    expect(await store.isWebhookEventProcessed(eventId)).toBe(true);
  });
});
