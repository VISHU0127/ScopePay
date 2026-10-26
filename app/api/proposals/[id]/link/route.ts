import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { getCurrentFreelancer } from '@/lib/auth/session';
import { generateSecureToken } from '@/lib/crypto';
import { apiError } from '@/lib/api-error';
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentFreelancer();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const repo = await getRepository();
    const proposal = await repo.getProposal((await params).id);
    const project = proposal && await repo.getProject(proposal.project_id);
    if (!proposal || !project || project.freelancer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (proposal.approval_status === 'superseded') return NextResponse.json({ error: 'Use the latest version' }, { status: 409 });
    const token = generateSecureToken();
    await repo.createClientAccessToken(proposal.id, token);
    return NextResponse.json({ clientLink: `/client/proposals/${proposal.id}#token=${token}` });
  } catch (error) { return apiError('create_client_link', error); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentFreelancer();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const repo = await getRepository(); const proposal = await repo.getProposal((await params).id);
    const project = proposal && await repo.getProject(proposal.project_id);
    if (!proposal || !project || project.freelancer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await repo.revokeProposalLinks(proposal.id);
    return NextResponse.json({ success: true });
  } catch (error) { return apiError('revoke_client_links', error); }
}
