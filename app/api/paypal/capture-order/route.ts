import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { captureCheckout } from '@/lib/paypal/checkout';
import { paypalCaptureOrderSchema } from '@/lib/validations';
import { apiError } from '@/lib/api-error';
export async function POST(req: NextRequest) {
  try {
    const body = paypalCaptureOrderSchema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: 'Invalid capture request' }, { status: 400 });
    const result = await captureCheckout(await getRepository(), body.data.proposal_id, body.data.token, body.data.order_id);
    return NextResponse.json(result, { status: result.success ? 200 : 202 });
  } catch (error) { return apiError('capture_checkout_outcome_unknown', error); }
}
