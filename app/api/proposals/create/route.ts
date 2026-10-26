import { apiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { getCurrentFreelancer } from '@/lib/auth/session';
import { generateSecureToken } from '@/lib/crypto';
import { createProposalSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const freelancer = await getCurrentFreelancer();
    if (!freelancer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createProposalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 400 });
    }

    const { project_id, change_request_id, title, description, acceptance_criteria, amount_cents, currency } = parsed.data;
    const repo = await getRepository();

    const project = await repo.getProject(project_id);
    if (!project || project.freelancer_id !== freelancer.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const request = await repo.getChangeRequest(change_request_id);
    if (!request || request.project_id !== project_id) return NextResponse.json({ error: 'Request does not belong to this project' }, { status: 403 });
    if (await repo.getProposalByRequest(change_request_id)) return NextResponse.json({ error: 'Create a new version of the existing proposal instead.' }, { status: 409 });
    // Create proposal (v1)
    const proposal = await repo.createChangeProposal({
      project_id,
      change_request_id,
      title,
      description,
      acceptance_criteria,
      amount_cents,
      currency,
    });

    // Generate high-entropy secure client link token
    const rawToken = generateSecureToken();
    await repo.createClientAccessToken(proposal.id, rawToken);

    return NextResponse.json({
      success: true,
      proposal,
      rawToken,
      clientLink: `/client/proposals/${proposal.id}#token=${rawToken}`,
    });
  } catch (err) {
    return apiError('proposals/create', err);
  }
}
