import { MemoryStore } from '@/lib/db/memory-store';
import { apiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { hashToken } from '@/lib/crypto';
import { payPalService } from '@/lib/paypal/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: proposalId } = await params;
    const token = req.headers.get('authorization')?.replace(/^Bearer /, '');

    if (!token) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 401 });
    }

    const repo = await getRepository();
    const tokenHash = hashToken(token);
    const tokenRecord = await repo.getClientAccessTokenByHash(tokenHash);

    if (!tokenRecord || tokenRecord.proposal_id !== proposalId) {
      return NextResponse.json({ error: 'Invalid or unauthorized access token' }, { status: 403 });
    }

    if (tokenRecord.revoked_at) {
      return NextResponse.json({ error: 'This proposal link has been revoked' }, { status: 403 });
    }

    if (new Date(tokenRecord.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'This proposal link has expired' }, { status: 403 });
    }

    const proposal = await repo.getProposal(proposalId);
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const project = await repo.getProject(proposal.project_id);
    const approval = await repo.getClientApproval(proposal.id, proposal.version);
    const isPayPalLive = !(repo instanceof MemoryStore) && payPalService.isConfigured();
    const attempt = await repo.getPaymentAttemptByProposal(proposal.id);

    return NextResponse.json({
      proposal,
      project: project ? { name: project.name, client_name: project.client_name } : null,
      approval: approval ? { client_name: approval.client_name, approved_at: approval.approved_at, proposal_version: approval.proposal_version } : null,
      orderId: attempt && !attempt.paypal_order_id.startsWith('reserved:') ? attempt.paypal_order_id : null,
      isPayPalLive,
      isDemo: repo instanceof MemoryStore,
    });
  } catch (err) {
    return apiError('client/proposals/[id]', err);
  }
}
