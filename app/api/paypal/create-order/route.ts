import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { createCheckout } from '@/lib/paypal/checkout';
import { paypalCreateOrderSchema } from '@/lib/validations';
import { apiError } from '@/lib/api-error';
export async function POST(req: NextRequest) {
  try {
    const body = paypalCreateOrderSchema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: 'Invalid checkout request' }, { status: 400 });
    const data = await createCheckout(await getRepository(), body.data.proposal_id, body.data.token);
    return NextResponse.json(data);
  } catch (error) { return apiError('create_checkout', error); }
}
