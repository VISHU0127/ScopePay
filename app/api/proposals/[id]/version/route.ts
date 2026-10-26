import { apiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { getCurrentFreelancer } from '@/lib/auth/session';
import { generateSecureToken } from '@/lib/crypto';
import { z } from 'zod';
import { amountCentsSchema } from '@/lib/validations';

const updateProposalSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  acceptance_criteria: z.array(z.string()).min(1).optional(),
  amount_cents: amountCentsSchema.optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: proposalId } = await params;
    const freelancer = await getCurrentFreelancer();
    if (!freelancer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const repo = await getRepository();
    const current = await repo.getProposal(proposalId);
    if (!current) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const project = await repo.getProject(current.project_id);
    if (!project || project.freelancer_id !== freelancer.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateProposalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid updates', details: parsed.error.issues }, { status: 400 });
    }

    // Creating new version supersedes current proposal and generates fresh token
    const newProposal = await repo.createNewProposalVersion(proposalId, parsed.data);
    const rawToken = generateSecureToken();
    await repo.createClientAccessToken(newProposal.id, rawToken);

    return NextResponse.json({
      success: true,
      proposal: newProposal,
      rawToken,
      clientLink: `/client/proposals/${newProposal.id}#token=${rawToken}`,
    });
  } catch (err) {
    return apiError('proposals/[id]/version', err);
  }
}
