import { apiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { getCurrentFreelancer } from '@/lib/auth/session';
import { scopeItemSchema } from '@/lib/validations';
import { z } from 'zod';
import { verifyCitations } from '@/lib/ai/citation-verifier';

export async function POST(
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
      return NextResponse.json({ error: 'Forbidden: not your project' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = z.object({ items: z.array(scopeItemSchema).min(1).max(100), agreement_id: z.string().uuid() }).safeParse(body);
    if (!parsed.success || !parsed.data.items.some(item => item.is_confirmed)) return NextResponse.json({ error: 'Confirm at least one valid scope item.' }, { status: 400 });
    const items = parsed.data.items;

    const agreement = await repo.getLatestAgreement(projectId);
    if (!agreement) {
      return NextResponse.json({ error: 'No agreement found for project' }, { status: 404 });
    }

    if (parsed.data.agreement_id !== agreement.id) return NextResponse.json({ error: 'Agreement changed. Reload before confirming.' }, { status: 409 });
    if (!verifyCitations(items.flatMap(item => item.verbatim_quote ? [item.verbatim_quote] : []), agreement.raw_text).allVerified) return NextResponse.json({ error: 'A quotation does not match this agreement.' }, { status: 422 });
    const itemsToSave = items.map((item) => ({
      project_id: projectId,
      agreement_id: agreement.id,
      type: item.type,
      title: item.title,
      description: item.description,
      verbatim_quote: item.verbatim_quote,
      is_confirmed: item.is_confirmed !== undefined ? item.is_confirmed : true,
    }));

    const saved = await repo.saveScopeItems(itemsToSave);

    return NextResponse.json({
      success: true,
      items: saved,
    });
  } catch (err) {
    return apiError('projects/[id]/confirm-scope', err);
  }
}
