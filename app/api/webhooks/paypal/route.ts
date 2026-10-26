import { NextRequest, NextResponse } from 'next/server';
import { getPersistentRepository } from '@/lib/db';
import { payPalService } from '@/lib/paypal/client';
import { applyResult } from '@/lib/paypal/checkout';
import { apiError } from '@/lib/api-error';
import { z } from 'zod';
export async function POST(req: NextRequest) {
  try {
    if (!payPalService.isConfigured()) return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 });
    const raw = await req.text();
    if (raw.length > 131072) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    const event = JSON.parse(raw);
    const parsed = z.object({ id: z.string().min(1), event_type: z.string(), resource: z.object({ id: z.string(), supplementary_data: z.object({ related_ids: z.object({ order_id: z.string().optional(), capture_id: z.string().optional() }) }).optional() }) }).safeParse(event);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
    const names = ['paypal-transmission-id', 'paypal-transmission-time', 'paypal-cert-url', 'paypal-auth-algo', 'paypal-transmission-sig'];
    const values = names.map(name => req.headers.get(name));
    if (values.some(v => !v)) return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 });
    const valid = await payPalService.verifyWebhookSignature({ transmissionId: values[0]!, transmissionTime: values[1]!, certUrl: values[2]!, authAlgo: values[3]!, transmissionSig: values[4]!, webhookId: process.env.PAYPAL_WEBHOOK_ID!, webhookEvent: event });
    if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    const repo = getPersistentRepository();
    if (await repo.isWebhookEventProcessed(event.id)) return NextResponse.json({ status: 'already_processed' });
    if (event.event_type.startsWith('PAYMENT.CAPTURE.')) {
      const related = parsed.data.resource.supplementary_data?.related_ids;
      const captureAttempt = !related?.order_id ? await repo.getPaymentAttemptByCaptureId(related?.capture_id || parsed.data.resource.id) : null;
      const orderId = related?.order_id || captureAttempt?.paypal_order_id;
      // Do not acknowledge an unmapped financial event as processed: merchant must reconcile it.
      if (!orderId) return NextResponse.json({ error: 'Order mapping requires reconciliation' }, { status: 503 });
      const attempt = await repo.getPaymentAttemptByOrderId(orderId);
      if (!attempt) return NextResponse.json({ error: 'Order mapping not yet available' }, { status: 503 });
      const result = await payPalService.reconcileOrder(orderId, attempt.proposal_id, attempt.amount_cents, attempt.currency);
      // A verified reversal event for this exact capture is authoritative even if the
      // read API has not yet reflected the reversal. Terminal state cannot regress.
      if (event.event_type === 'PAYMENT.CAPTURE.REVERSED' && parsed.data.resource.id === result.captureId) result.status = 'REVERSED';
      await applyResult(repo, result);
    }
    await repo.recordProcessedWebhookEvent(event.id, event.event_type);
    return NextResponse.json({ status: 'processed' });
  } catch (error) { return apiError('paypal_webhook', error); }
}
