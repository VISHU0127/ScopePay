import { hashToken } from '@/lib/crypto';
import { apiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { getCurrentFreelancer } from '@/lib/auth/session';
import { aiService } from '@/lib/ai/adapter';
import { verifyCitations } from '@/lib/ai/citation-verifier';
import { z } from 'zod';

const analyzeRequestInputSchema = z.object({
  change_request_id: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const freelancer = await getCurrentFreelancer();
    if (!freelancer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = analyzeRequestInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    const { change_request_id } = parsed.data;
    const repo = await getRepository();

    const changeRequest = await repo.getChangeRequest(change_request_id);
    if (!changeRequest) {
      return NextResponse.json({ error: 'Change request not found' }, { status: 404 });
    }

    const project = await repo.getProject(changeRequest.project_id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.freelancer_id !== freelancer.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Load agreement and confirmed scope
    const agreement = await repo.getLatestAgreement(project.id);
    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    const confirmedScope = await repo.getConfirmedScopeItems(project.id);

    if (!confirmedScope.length) return NextResponse.json({ error: 'Review and confirm scope before analysis.' }, { status: 409 });
    const scopeFingerprint = hashToken(JSON.stringify(confirmedScope.map(item => item.id).sort()));
    const existingAnalysis = await repo.getScopeAnalysisByRequest(change_request_id);
    if (existingAnalysis?.agreement_version === agreement.version && existingAnalysis.scope_fingerprint === scopeFingerprint) return NextResponse.json({ analysis: existingAnalysis, cached: true });
    // Run AI analysis
    const result = await aiService.analyzeRequest(
      agreement.raw_text,
      confirmedScope,
      changeRequest.client_request_text
    );

    // Verify citations against source agreement
    const citationCheck = verifyCitations(
      result.data.verbatim_citations,
      agreement.raw_text
    );

    if (!citationCheck.allVerified || result.data.relevant_scope_item_ids.some(id => !confirmedScope.some(item => item.id === id))) return NextResponse.json({ error: 'Analysis contained unsupported evidence. Review the agreement and retry.' }, { status: 422 });
    if (hashToken(JSON.stringify((await repo.getConfirmedScopeItems(project.id)).map(item => item.id).sort())) !== scopeFingerprint) return NextResponse.json({ error: 'Scope changed during analysis. Please retry.' }, { status: 409 });
    // Save analysis to repository
    const saved = await repo.saveScopeAnalysis({
      change_request_id,
      scope_fingerprint: scopeFingerprint,
      project_id: project.id,
      agreement_version: agreement.version,
      classification: result.data.classification,
      explanation: result.data.explanation,
      relevant_scope_item_ids: result.data.relevant_scope_item_ids,
      verbatim_citations: result.data.verbatim_citations,
      identified_additional_work: result.data.identified_additional_work,
      clarification_questions: result.data.clarification_questions,
      draft_client_reply: result.data.draft_client_reply,
      sub_parts: result.data.sub_parts,
      is_citation_verified: citationCheck.allVerified,
      unverified_citations: citationCheck.unverifiedCitations,
    });

    return NextResponse.json({
      analysis: saved,
      isFixture: result.isFixture,
      modelUsed: result.modelUsed,
      citationCheck,
    });
  } catch (err) {
    return apiError('requests/analyze', err);
  }
}
