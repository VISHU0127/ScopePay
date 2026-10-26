import { hashToken } from '@/lib/crypto';
import { apiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { getCurrentFreelancer } from '@/lib/auth/session';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const freelancer = await getCurrentFreelancer();
    if (!freelancer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const repo = await getRepository();
    const project = await repo.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.freelancer_id !== freelancer.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [agreement, scopeItems, requests, proposals, activity, analyses] = await Promise.all([
      repo.getLatestAgreement(projectId), repo.getScopeItems(projectId), repo.listChangeRequests(projectId), repo.listProposals(projectId), repo.listActivity(projectId), repo.listScopeAnalyses(projectId),
    ]);

    return NextResponse.json({
      project,
      agreement,
      scopeItems,
      requests,
      proposals,
      activity,
      analyses: analyses.filter(a => a.agreement_version === agreement?.version && (!a.scope_fingerprint || a.scope_fingerprint === hashToken(JSON.stringify(scopeItems.filter(item => item.is_confirmed).map(item => item.id).sort())))),
    });
  } catch (err) {
    return apiError('projects/[id]', err);
  }
}
