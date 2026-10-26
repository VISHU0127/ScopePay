import { apiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { getCurrentFreelancer } from '@/lib/auth/session';
import { aiService } from '@/lib/ai/adapter';
import { createProjectSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const freelancer = await getCurrentFreelancer();
    if (!freelancer) {
      return NextResponse.json({ error: 'Unauthorized: please sign in' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 400 });
    }

    const { name, client_name, client_email, agreement_text } = parsed.data;
    const repo = await getRepository();

    const extractionResult = await aiService.extractScope(agreement_text);
    // 1. Create project & agreement
    const { project, agreement } = await repo.createProject(
      {
        freelancer_id: freelancer.id,
        name,
        client_name,
        client_email,
        status: 'active',
      },
      agreement_text
    );



    return NextResponse.json({
      project,
      agreement,
      extractedScope: extractionResult.data,
      isFixture: extractionResult.isFixture,
      modelUsed: extractionResult.modelUsed,
    });
  } catch (err) {
    return apiError('projects/create', err);
  }
}
