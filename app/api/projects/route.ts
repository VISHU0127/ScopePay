import { apiError } from '@/lib/api-error';
import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { getCurrentFreelancer } from '@/lib/auth/session';

export async function GET() {
  try {
    const freelancer = await getCurrentFreelancer();
    if (!freelancer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const repo = await getRepository();
    const [projects, proposals] = await Promise.all([repo.listProjects(freelancer.id), repo.listProposalsForFreelancer(freelancer.id)]);
    const current = proposals.filter(p => !['superseded', 'rejected'].includes(p.approval_status));
    const outstandingProposals = current.filter(p => !['paid', 'refunded', 'reversed'].includes(p.payment_status));
    const sum = (items: typeof proposals) => items.reduce((total, p) => total + p.amount_cents, 0);
    const metrics = { proposed: sum(current.filter(p => ['draft', 'sent'].includes(p.approval_status))), approvedUnpaid: sum(current.filter(p => p.approval_status === 'approved' && ['unpaid', 'payment_pending', 'payment_failed'].includes(p.payment_status))), paid: sum(proposals.filter(p => p.payment_status === 'paid')) };

    return NextResponse.json({
      freelancer,
      projects,
      outstandingProposals,
      metrics,
    });
  } catch (err) {
    return apiError('projects', err);
  }
}
