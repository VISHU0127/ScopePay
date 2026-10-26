import { apiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { hashToken } from '@/lib/crypto';
import { clientApprovalSchema } from '@/lib/validations';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: proposalId } = await params;
    const body = await req.json();

    const parsed = clientApprovalSchema.safeParse({
      ...body,
      proposal_id: proposalId,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 400 });
    }

    const { token, client_name, client_email, notes } = parsed.data;
    const repo = await getRepository();

    // 1. Verify token
    const tokenHash = hashToken(token);
    const tokenRecord = await repo.getClientAccessTokenByHash(tokenHash);

    if (!tokenRecord || tokenRecord.proposal_id !== proposalId) {
      return NextResponse.json({ error: 'Invalid or unauthorized client access token' }, { status: 403 });
    }

    if (tokenRecord.revoked_at || new Date(tokenRecord.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Access token expired or revoked' }, { status: 403 });
    }

    // 2. Load proposal
    const proposal = await repo.getProposal(proposalId);
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    if (proposal.approval_status === 'superseded') {
      return NextResponse.json(
        { error: 'This proposal version has been superseded by a newer revision and cannot be approved.' },
        { status: 400 }
      );
    }

    // If already approved, return existing approval
    if (proposal.approval_status === 'approved') {
      const existing = await repo.getClientApproval(proposal.id, proposal.version);
      return NextResponse.json({
        success: true,
        already_approved: true,
        approval: existing,
        proposal,
      });
    }

    // 3. Extract IP address & user agent for audit record
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // 4. Record client approval and freeze proposal
    const approval = await repo.recordClientApproval({
      proposal_id: proposal.id,
      proposal_version: proposal.version,
      client_name,
      client_email,
      ip_address: ip.split(',')[0].trim(),
      user_agent: userAgent,
      notes,
    });

    const frozenProposal = await repo.getProposal(proposal.id);

    return NextResponse.json({
      success: true,
      approval,
      proposal: frozenProposal,
    });
  } catch (err) {
    return apiError('proposals/[id]/approve', err);
  }
}
