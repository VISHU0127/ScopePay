import { z } from 'zod';
import { centsToDollars } from '@/lib/validations';
import { hashToken } from '@/lib/crypto';
const BASE = 'https://api-m.sandbox.paypal.com';
export const requestId = (operation: string, id: string) => hashToken(`${operation}:${id}`).slice(0, 38);
const money = z.object({ value: z.string(), currency_code: z.string() });
const captureSchema = z.object({ id: z.string().min(1), status: z.string(), amount: money });
const orderSchema = z.object({
  id: z.string(), status: z.string(),
  purchase_units: z.array(z.object({ custom_id: z.string(), reference_id: z.string(), payee: z.object({ merchant_id: z.string() }), amount: money, payments: z.object({ captures: z.array(captureSchema) }).optional() })).length(1),
  links: z.array(z.object({ rel: z.string(), href: z.string() })).optional(),
});
export interface PayPalCaptureResult {
  success: boolean; orderId: string; captureId?: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'REVERSED';
  errorMessage?: string;
}
export interface PayPalCreateOrderParams {
  proposalId: string; amountCents: number; currency: 'USD'; title: string;
  returnUrl?: string; cancelUrl?: string; idempotencyKey?: string;
}
export class PayPalService {
  private cachedToken: { token: string; expires: number } | undefined;
  isConfigured() {
    return ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_MERCHANT_ID', 'PAYPAL_WEBHOOK_ID'].every(name => {
      const value = process.env[name]; return value && !value.startsWith('your_');
    }) && (!process.env.PAYPAL_API_BASE || process.env.PAYPAL_API_BASE === BASE);
  }
  private async getAccessToken() {
    if (!this.isConfigured()) throw new Error('Sandbox checkout is unavailable');
    if (this.cachedToken && this.cachedToken.expires > Date.now()) return this.cachedToken.token;
    const res = await fetch(`${BASE}/v1/oauth2/token`, { method: 'POST', signal: AbortSignal.timeout(15000), cache: 'no-store', headers: { Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
    if (!res.ok) throw new Error('PayPal authentication failed');
    const data = z.object({ access_token: z.string(), expires_in: z.number() }).parse(await res.json());
    this.cachedToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
    return data.access_token;
  }
  private async call(path: string, method = 'GET', body?: unknown, key?: string) {
    const token = await this.getAccessToken();
    const res = await fetch(`${BASE}${path}`, { method, cache: 'no-store', signal: AbortSignal.timeout(20000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(key ? { 'PayPal-Request-Id': key } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (!res.ok) throw new Error('PayPal request outcome requires reconciliation');
    return res.json();
  }
  async createOrder(params: PayPalCreateOrderParams) {
    const data = await this.call('/v2/checkout/orders', 'POST', {
      intent: 'CAPTURE', purchase_units: [{ reference_id: params.proposalId, custom_id: params.proposalId, description: params.title.slice(0, 120), payee: { merchant_id: process.env.PAYPAL_MERCHANT_ID }, amount: { currency_code: params.currency, value: centsToDollars(params.amountCents) } }],
      payment_source: { paypal: { experience_context: { brand_name: 'ScopePay Sandbox', user_action: 'PAY_NOW', return_url: params.returnUrl, cancel_url: params.cancelUrl } } },
    }, params.idempotencyKey || requestId('create', params.proposalId));
    const parsed = z.object({ id: z.string().min(1), status: z.string(), links: z.array(z.object({ rel: z.string(), href: z.string() })) }).parse(data);
    const approveUrl = parsed.links.find(l => ['approve', 'payer-action'].includes(l.rel))?.href;
    if (approveUrl && new URL(approveUrl).origin !== 'https://www.sandbox.paypal.com') throw new Error('Unexpected approval URL');
    return { orderId: parsed.id, status: parsed.status, approveUrl };
  }
  async getOrder(orderId: string) { return this.call(`/v2/checkout/orders/${encodeURIComponent(orderId)}`); }
  validateOrder(data: unknown, orderId: string, proposalId: string, cents: number, currency: string) {
    const order = orderSchema.parse(data);
    const unit = order.purchase_units[0];
    if (order.id !== orderId || unit.custom_id !== proposalId || unit.reference_id !== proposalId || !process.env.PAYPAL_MERCHANT_ID || unit.payee.merchant_id !== process.env.PAYPAL_MERCHANT_ID || unit.amount.value !== centsToDollars(cents) || unit.amount.currency_code !== currency) throw new Error('PayPal order does not match approved proposal or receiver');
    return order;
  }
  async reconcileOrder(orderId: string, proposalId: string, cents: number, currency: 'USD'): Promise<PayPalCaptureResult> {
    const order = this.validateOrder(await this.getOrder(orderId), orderId, proposalId, cents, currency);
    const captures = order.purchase_units[0].payments?.captures || [];
    if (!captures.length) return { success: false, orderId, status: 'PENDING' };
    if (captures.length !== 1) throw new Error('Unexpected capture count');
    // Capture GET reflects later refunds/reversals; order snapshots alone are insufficient.
    const capture = captureSchema.parse(await this.call(`/v2/payments/captures/${encodeURIComponent(captures[0].id)}`));
    if (capture.id !== captures[0].id || capture.amount.value !== centsToDollars(cents) || capture.amount.currency_code !== currency) throw new Error('Capture amount or currency mismatch');
    const status = capture.status === 'COMPLETED' ? 'COMPLETED' : ['REFUNDED', 'PARTIALLY_REFUNDED'].includes(capture.status) ? 'REFUNDED' : capture.status === 'REVERSED' ? 'REVERSED' : ['DECLINED', 'DENIED', 'FAILED'].includes(capture.status) ? 'FAILED' : 'PENDING';
    return { success: status === 'COMPLETED', orderId, captureId: capture.id, status };
  }
  async captureOrder(orderId: string, proposalId: string, cents: number, currency: 'USD', key?: string): Promise<PayPalCaptureResult> {
    const order = this.validateOrder(await this.getOrder(orderId), orderId, proposalId, cents, currency);
    if (order.purchase_units[0].payments?.captures?.length) return this.reconcileOrder(orderId, proposalId, cents, currency);
    if (order.status !== 'APPROVED') return { success: false, orderId, status: 'PENDING' };
    try { await this.call(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, 'POST', {}, key || requestId('capture', orderId)); }
    catch { /* A timeout/409/5xx is unknown, never proof of failure. Read the provider before retrying. */ }
    return this.reconcileOrder(orderId, proposalId, cents, currency);
  }
  async verifyWebhookSignature(params: { transmissionId: string; transmissionTime: string; certUrl: string; authAlgo: string; transmissionSig: string; webhookId: string; webhookEvent: Record<string, unknown> }) {
    if (!this.isConfigured()) return false;
    const data = await this.call('/v1/notifications/verify-webhook-signature', 'POST', { transmission_id: params.transmissionId, transmission_time: params.transmissionTime, cert_url: params.certUrl, auth_algo: params.authAlgo, transmission_sig: params.transmissionSig, webhook_id: params.webhookId, webhook_event: params.webhookEvent });
    return data.verification_status === 'SUCCESS';
  }
}
export const payPalService = new PayPalService();
