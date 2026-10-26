import { apiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { submitChangeRequestSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = submitChangeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 400 });
    }

    const { project_id, client_request_text, submitted_by_name, submitted_by_email } = parsed.data;
    const repo = await getRepository();

    const project = await repo.getProject(project_id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const changeRequest = await repo.createChangeRequest({
      project_id,
      client_request_text,
      submitted_by_name: submitted_by_name || project.client_name,
      submitted_by_email: submitted_by_email || project.client_email,
    });

    return NextResponse.json({
      success: true,
      changeRequest,
    });
  } catch (err) {
    return apiError('requests/create', err);
  }
}
