import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStore, DEMO_FREELANCER_ID, DEMO_AGREEMENT_TEXT } from '../lib/db/memory-store';
import { AIService } from '../lib/ai/adapter';
import { verifyCitations } from '../lib/ai/citation-verifier';
import { generateSecureToken, hashToken } from '../lib/crypto';

describe('ScopePay Full End-to-End Workflow', () => {
  let store: MemoryStore;
  let ai: AIService;

  beforeEach(() => {
    store = new MemoryStore();
    ai = new AIService();
  });

  it('executes the full lifecycle: Agreement -> Extract -> Request -> Analyze -> Propose -> Approve -> Pay', async () => {
    // 1. Create Project
    const { project, agreement } = await store.createProject(
      {
        freelancer_id: DEMO_FREELANCER_ID,
        name: 'Acme Studio Redesign',
        client_name: 'Sarah Jenkins',
        client_email: 'sarah@acmestudio.example',
        status: 'active',
      },
      DEMO_AGREEMENT_TEXT
    );

    expect(project.id).toBeDefined();
    expect(agreement.version).toBe(1);

    // 2. Extract Scope
    const extraction = await ai.extractScope(DEMO_AGREEMENT_TEXT);
    expect(extraction.data.deliverables.length).toBeGreaterThan(0);
    expect(extraction.data.exclusions.length).toBeGreaterThan(0);

    // Save Confirmed Scope
    const savedScope = await store.saveScopeItems(
      extraction.data.deliverables.map((d) => ({
        project_id: project.id,
        agreement_id: agreement.id,
        type: d.type,
        title: d.title,
        description: d.description,
        verbatim_quote: d.verbatim_quote,
        is_confirmed: true,
      }))
    );
    expect(savedScope.length).toBe(extraction.data.deliverables.length);

    // 3. Client submits Out of Scope request
    const requestText =
      'We would love to add an appointment booking widget with Google Calendar sync directly on the services page.';
    const changeRequest = await store.createChangeRequest({
      project_id: project.id,
      client_request_text: requestText,
      submitted_by_name: 'Sarah Jenkins',
      submitted_by_email: 'sarah@acmestudio.example',
    });
    expect(changeRequest.status).toBe('pending_analysis');

    // 4. AI analyzes request and verifies quotations
    const analysis = await ai.analyzeRequest(
      agreement.raw_text,
      savedScope,
      requestText
    );
    expect(analysis.data.classification).toBe('out_of_scope');
    expect(analysis.data.verbatim_citations.length).toBeGreaterThan(0);

    // Verify citations exist in raw agreement
    const citationCheck = verifyCitations(
      analysis.data.verbatim_citations,
      agreement.raw_text
    );
    expect(citationCheck.allVerified).toBe(true);

    // Save analysis
    const savedAnalysis = await store.saveScopeAnalysis({
      change_request_id: changeRequest.id,
      project_id: project.id,
      agreement_version: agreement.version,
      classification: analysis.data.classification,
      explanation: analysis.data.explanation,
      relevant_scope_item_ids: analysis.data.relevant_scope_item_ids,
      verbatim_citations: analysis.data.verbatim_citations,
      identified_additional_work: analysis.data.identified_additional_work,
      clarification_questions: analysis.data.clarification_questions,
      draft_client_reply: analysis.data.draft_client_reply,
      is_citation_verified: citationCheck.allVerified,
      unverified_citations: citationCheck.unverifiedCitations,
    });
    expect(savedAnalysis.id).toBeDefined();

    // 5. Freelancer creates priced proposal ($150.00 = 15000 cents)
    const proposal = await store.createChangeProposal({
      project_id: project.id,
      change_request_id: changeRequest.id,
      title: 'Appointment Booking & Calendar Sync',
      description: 'Implement Google Calendar appointment scheduling widget.',
      acceptance_criteria: [
        'Booking widget embedded on Services page',
        'Google Calendar two-way synchronization',
      ],
      amount_cents: 15000, // $150.00
      currency: 'USD',
    });
    expect(proposal.approval_status).toBe('draft');
    expect(proposal.amount_cents).toBe(15000);

    // Generate Client Link Token
    const rawClientToken = generateSecureToken();
    const tokenRecord = await store.createClientAccessToken(proposal.id, rawClientToken);
    expect(tokenRecord.token_hash).toBe(hashToken(rawClientToken));

    // 6. Client visits link and formally records approval
    const clientApproval = await store.recordClientApproval({
      proposal_id: proposal.id,
      proposal_version: proposal.version,
      client_name: 'Sarah Jenkins',
      client_email: 'sarah@acmestudio.example',
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0 Test Browser',
      notes: 'Approved as discussed.',
    });
    expect(clientApproval.proposal_version).toBe(1);

    // Proposal is frozen
    const approvedProposal = await store.getProposal(proposal.id);
    expect(approvedProposal?.approval_status).toBe('approved');
    expect(approvedProposal?.frozen_at).toBeDefined();

    // 7. Client initiates PayPal Sandbox payment
    const paypalOrderId = 'SANDBOX-ORDER-ACME-150';
    await store.createPaymentAttempt({
      proposal_id: proposal.id,
      paypal_order_id: paypalOrderId,
      amount_cents: approvedProposal!.amount_cents,
      currency: approvedProposal!.currency,
      status: 'created',
    });

    // 8. PayPal captures payment on server
    const capturedAttempt = await store.updatePaymentAttemptCapture(
      paypalOrderId,
      'SANDBOX-CAPTURE-ACME-999',
      'captured',
      {
        email: 'sarah@acmestudio.example',
        name: 'Sarah Jenkins',
      }
    );
    expect(capturedAttempt.status).toBe('captured');

    // 9. Proposal payment status is paid
    const finalProposal = await store.getProposal(proposal.id);
    expect(finalProposal?.payment_status).toBe('paid');

    // Change request status is resolved
    const finalRequest = await store.getChangeRequest(changeRequest.id);
    expect(finalRequest?.status).toBe('resolved');

    // 10. Audit Activity Trail records each step
    const activityList = await store.listActivity(project.id);
    expect(activityList.length).toBeGreaterThanOrEqual(5);
    const eventTypes = activityList.map((a) => a.event_type);
    expect(eventTypes).toContain('scope_extracted');
    expect(eventTypes).toContain('scope_confirmed');
    expect(eventTypes).toContain('request_submitted');
    expect(eventTypes).toContain('analysis_completed');
    expect(eventTypes).toContain('proposal_created');
    expect(eventTypes).toContain('client_approved');
    expect(eventTypes).toContain('payment_completed');
  });
});
