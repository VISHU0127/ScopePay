import {
  Freelancer,
  Project,
  Agreement,
  ScopeItem,
  ChangeRequest,
  ScopeAnalysis,
  ChangeProposal,
  ClientAccessToken,
  ClientApprovalRecord,
  PaymentAttempt,
  ProcessedWebhookEvent,
  ActivityEvent,
} from '@/lib/types';
import { IScopePayRepository } from './repository';
import { hashToken } from '@/lib/crypto';

// Deterministic seed IDs for predictable testing and demo flows
export const DEMO_FREELANCER_ID = 'f0000000-0000-4000-8000-000000000001';
export const DEMO_PROJECT_ID = 'b0000000-0000-4000-8000-000000000001';
export const DEMO_AGREEMENT_ID = 'a0000000-0000-4000-8000-000000000001';
export const DEMO_OUT_OF_SCOPE_REQUEST_ID = 'd0000000-0000-4000-8000-000000000001';
export const DEMO_IN_SCOPE_REQUEST_ID = 'd0000000-0000-4000-8000-000000000002';
export const DEMO_AMBIGUOUS_REQUEST_ID = 'd0000000-0000-4000-8000-000000000003';
export const DEMO_MIXED_REQUEST_ID = 'd0000000-0000-4000-8000-000000000004';
export const DEMO_PROPOSAL_ID = 'c0000000-0000-4000-8000-000000000001';
export const DEMO_CLIENT_RAW_TOKEN = 'demo-acme-approval-token-2026';

import { DEMO_AGREEMENT_TEXT } from '@/lib/demo-agreement';
export { DEMO_AGREEMENT_TEXT } from '@/lib/demo-agreement';

export class MemoryStore implements IScopePayRepository {
  private freelancers: Map<string, Freelancer> = new Map();
  private projects: Map<string, Project> = new Map();
  private agreements: Map<string, Agreement> = new Map();
  private scopeItems: Map<string, ScopeItem> = new Map();
  private changeRequests: Map<string, ChangeRequest> = new Map();
  private scopeAnalyses: Map<string, ScopeAnalysis> = new Map();
  private changeProposals: Map<string, ChangeProposal> = new Map();
  private clientTokens: Map<string, ClientAccessToken> = new Map();
  private clientApprovals: Map<string, ClientApprovalRecord> = new Map();
  private paymentAttempts: Map<string, PaymentAttempt> = new Map();
  private processedWebhooks: Map<string, ProcessedWebhookEvent> = new Map();
  private activityEvents: ActivityEvent[] = [];

  constructor() {
    this.seedDemoData();
  }

  public async resetDemoData(): Promise<void> {
    this.freelancers.clear();
    this.projects.clear();
    this.agreements.clear();
    this.scopeItems.clear();
    this.changeRequests.clear();
    this.scopeAnalyses.clear();
    this.changeProposals.clear();
    this.clientTokens.clear();
    this.clientApprovals.clear();
    this.paymentAttempts.clear();
    this.processedWebhooks.clear();
    this.activityEvents = [];
    this.seedDemoData();
  }

  private seedDemoData(): void {
    const now = new Date().toISOString();

    // 1. Freelancer Alex Morgan
    const freelancer: Freelancer = {
      id: DEMO_FREELANCER_ID,
      email: 'alex@morgandigital.dev',
      name: 'Alex Morgan',
      created_at: now,
    };
    this.freelancers.set(freelancer.id, freelancer);

    // 2. Project Acme Studio Website
    const project: Project = {
      id: DEMO_PROJECT_ID,
      freelancer_id: DEMO_FREELANCER_ID,
      name: 'Acme Studio Website',
      client_name: 'Sarah Jenkins',
      client_email: 'sarah@acmestudio.example',
      status: 'active',
      created_at: now,
    };
    this.projects.set(project.id, project);

    // 3. Agreement
    const agreement: Agreement = {
      id: DEMO_AGREEMENT_ID,
      project_id: DEMO_PROJECT_ID,
      version: 1,
      raw_text: DEMO_AGREEMENT_TEXT,
      created_at: now,
    };
    this.agreements.set(agreement.id, agreement);

    // 4. Confirmed Scope Items
    const items: ScopeItem[] = [
      {
        id: 'e0000000-0000-4000-8000-000000000001',
        agreement_id: DEMO_AGREEMENT_ID,
        project_id: DEMO_PROJECT_ID,
        type: 'deliverable',
        title: '5-Page Responsive Marketing Website',
        description: 'Home, About, Services, Case Studies, Contact with desktop and mobile layouts.',
        verbatim_quote: '5-page responsive marketing website (Home, About, Services, Case Studies, Contact).',
        is_confirmed: true,
        created_at: now,
      },
      {
        id: 'e0000000-0000-4000-8000-000000000002',
        agreement_id: DEMO_AGREEMENT_ID,
        project_id: DEMO_PROJECT_ID,
        type: 'deliverable',
        title: 'Contact Inquiry Form',
        description: 'Delivering email submissions via SMTP.',
        verbatim_quote: 'Functional contact inquiry form delivering email submissions via SMTP.',
        is_confirmed: true,
        created_at: now,
      },
      {
        id: 'e0000000-0000-4000-8000-000000000003',
        agreement_id: DEMO_AGREEMENT_ID,
        project_id: DEMO_PROJECT_ID,
        type: 'exclusion',
        title: 'Booking & Calendar Integration Excluded',
        description: 'Direct booking, appointment scheduling, or calendar integration functionality is strictly excluded.',
        verbatim_quote: 'Direct booking, appointment scheduling, or calendar integration functionality is strictly excluded from this phase.',
        is_confirmed: true,
        created_at: now,
      },
      {
        id: 'e0000000-0000-4000-8000-000000000004',
        agreement_id: DEMO_AGREEMENT_ID,
        project_id: DEMO_PROJECT_ID,
        type: 'revision_limit',
        title: 'Two Revision Rounds Included',
        description: 'Up to two consolidated rounds of design and content revisions prior to final launch.',
        verbatim_quote: 'The project fee includes up to two (2) consolidated rounds of design and content revisions prior to final launch.',
        is_confirmed: true,
        created_at: now,
      },
    ];

    for (const item of items) {
      this.scopeItems.set(item.id, item);
    }

    // 5. Demo Requests
    // Request 1: Out of Scope (Booking)
    const req1: ChangeRequest = {
      id: DEMO_OUT_OF_SCOPE_REQUEST_ID,
      project_id: DEMO_PROJECT_ID,
      client_request_text: 'Hi Alex! We would love to add an appointment booking widget with Google Calendar sync directly on the services page.',
      submitted_by_name: 'Sarah Jenkins',
      submitted_by_email: 'sarah@acmestudio.example',
      status: 'proposed',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    };
    this.changeRequests.set(req1.id, req1);

    // Analysis for Request 1
    const analysis1: ScopeAnalysis = {
      id: 'an000000-0000-4000-8000-000000000001',
      change_request_id: req1.id,
      project_id: DEMO_PROJECT_ID,
      agreement_version: 1,
      classification: 'out_of_scope',
      explanation: 'The request asks for appointment booking and calendar synchronization, which is explicitly listed as an excluded deliverable in Section 2 of the agreement.',
      relevant_scope_item_ids: ['e0000000-0000-4000-8000-000000000003'],
      verbatim_citations: [
        'Direct booking, appointment scheduling, or calendar integration functionality is strictly excluded from this phase.',
      ],
      identified_additional_work: [
        'Calendar provider authentication & OAuth setup',
        'Interactive slot picker booking UI component',
        'Confirmation email notifications and booking cancellation flow',
      ],
      clarification_questions: [
        'Which specific calendar provider (Google Calendar, Calendly, or Cal.com) do you prefer?',
        'Do you need automatic time zone detection for clients booking outside your region?',
      ],
      draft_client_reply: 'Hi Sarah, thanks for reaching out! Under our initial project agreement, appointment booking and calendar integration was explicitly excluded for phase one. I would be delighted to build this for you as an add-on change proposal.',
      is_citation_verified: true,
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    };
    this.scopeAnalyses.set(analysis1.id, analysis1);

    // Proposal for Request 1 (Priced at $150 = 15000 cents)
    const proposal1: ChangeProposal = {
      id: DEMO_PROPOSAL_ID,
      project_id: DEMO_PROJECT_ID,
      change_request_id: req1.id,
      version: 1,
      title: 'Appointment Booking & Calendar Sync Add-on',
      description: 'Implement a streamlined appointment scheduling widget integrated with Google Calendar on the Services page.',
      acceptance_criteria: [
        'Interactive booking widget displaying available times from Google Calendar',
        'Instant confirmation email with calendar invite to client and Acme Studio admin',
        'Responsive mobile layout tested on iOS and Android viewports',
      ],
      amount_cents: 15000, // $150.00
      currency: 'USD',
      approval_status: 'sent',
      payment_status: 'unpaid',
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    };
    this.changeProposals.set(proposal1.id, proposal1);

    // Pre-create token for Proposal 1
    const tokenHash = hashToken(DEMO_CLIENT_RAW_TOKEN);
    const clientToken: ClientAccessToken = {
      id: 'tok00000-0000-4000-8000-000000000001',
      proposal_id: proposal1.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 86400000 * 14).toISOString(), // 14 days
      created_at: now,
    };
    this.clientTokens.set(tokenHash, clientToken);

    // Request 2: In-Scope
    const req2: ChangeRequest = {
      id: DEMO_IN_SCOPE_REQUEST_ID,
      project_id: DEMO_PROJECT_ID,
      client_request_text: 'Could we change the main headline on the homepage to "Design that drives sustainable brand growth" before launch?',
      submitted_by_name: 'Sarah Jenkins',
      status: 'analyzed',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    };
    this.changeRequests.set(req2.id, req2);

    const analysis2: ScopeAnalysis = {
      id: 'an000000-0000-4000-8000-000000000002',
      change_request_id: req2.id,
      project_id: DEMO_PROJECT_ID,
      agreement_version: 1,
      classification: 'in_scope',
      explanation: 'Modifying the homepage headline copy is explicitly included within the two consolidated revision rounds specified in Section 3.',
      relevant_scope_item_ids: ['e0000000-0000-4000-8000-000000000004'],
      verbatim_citations: [
        'The project fee includes up to two (2) consolidated rounds of design and content revisions prior to final launch.',
        'Copy and typographical updates within existing page layouts are included in the revision rounds.',
      ],
      identified_additional_work: [],
      clarification_questions: [],
      draft_client_reply: "Hi Sarah, absolutely! If an agreed revision round remains, I'll update the headline to your requested text right away with no extra charge.",
      is_citation_verified: true,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    };
    this.scopeAnalyses.set(analysis2.id, analysis2);

    // Request 3: Ambiguous
    const req3: ChangeRequest = {
      id: DEMO_AMBIGUOUS_REQUEST_ID,
      project_id: DEMO_PROJECT_ID,
      client_request_text: 'We want to improve website performance so it feels super fast on all devices.',
      submitted_by_name: 'Sarah Jenkins',
      status: 'analyzed',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    };
    this.changeRequests.set(req3.id, req3);

    const analysis3: ScopeAnalysis = {
      id: 'an000000-0000-4000-8000-000000000003',
      change_request_id: req3.id,
      project_id: DEMO_PROJECT_ID,
      agreement_version: 1,
      classification: 'ambiguous',
      explanation: 'The agreement outlines deliverables for a responsive website, but does not define target performance metrics, Core Web Vitals thresholds, or server-level caching guarantees.',
      relevant_scope_item_ids: ['e0000000-0000-4000-8000-000000000001'],
      verbatim_citations: ['5-page responsive marketing website (Home, About, Services, Case Studies, Contact).'],
      identified_additional_work: [
        'Standard image optimization and code-splitting (standard build)',
        'Advanced performance auditing, CDN edge routing, or sub-second LCP tuning (requires quantified scope)',
      ],
      clarification_questions: [
        'Are you experiencing slowness on a specific page or device?',
        'Do you have a specific target metric (e.g., Google PageSpeed score > 90, or mobile load time < 2s)?',
      ],
      draft_client_reply: 'Hi Sarah, the agreement does not specify performance targets, so to make sure we hit your exact expectations, could you clarify if you have a target metric like Google PageSpeed or a specific device in mind?',
      is_citation_verified: true,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    };
    this.scopeAnalyses.set(analysis3.id, analysis3);

    // Request 4: Mixed Request
    const req4: ChangeRequest = {
      id: DEMO_MIXED_REQUEST_ID,
      project_id: DEMO_PROJECT_ID,
      client_request_text: 'Please fix the typo in our office phone number on the contact page, and also set up automated SMS text message alerts to our sales director whenever someone submits the inquiry form.',
      submitted_by_name: 'Sarah Jenkins',
      status: 'analyzed',
      created_at: now,
    };
    this.changeRequests.set(req4.id, req4);

    const analysis4: ScopeAnalysis = {
      id: 'an000000-0000-4000-8000-000000000004',
      change_request_id: req4.id,
      project_id: DEMO_PROJECT_ID,
      agreement_version: 1,
      classification: 'out_of_scope', // Overall classified out of scope due to the SMS add-on
      explanation: 'This request is mixed: updating the phone number is covered under revision rounds, but SMS notification routing requires third-party API integration not included in the standard email SMTP deliverable.',
      relevant_scope_item_ids: [
        'e0000000-0000-4000-8000-000000000002',
        'e0000000-0000-4000-8000-000000000004',
      ],
      verbatim_citations: [
        'Functional contact inquiry form delivering email submissions via SMTP.',
        'Copy and typographical updates within existing page layouts are included in the revision rounds.',
      ],
      identified_additional_work: [
        'Twilio / SMS gateway account configuration & webhook handler',
        'Phone number international formatting & carrier delivery logic',
      ],
      clarification_questions: [
        'Do you already have a Twilio account or would you like me to set one up?',
      ],
      draft_client_reply: "Hi Sarah! The phone number correction may fit an available revision round. For the automated SMS notifications, since the original agreement only covered email delivery via SMTP, I can prepare a quick change proposal for Twilio SMS integration.",
      sub_parts: [
        {
          part_text: 'Fix typo in office phone number on contact page',
          classification: 'in_scope',
          reasoning: 'Typographical updates are explicitly covered under Revision Rounds.',
          scope_item_title: 'Two Revision Rounds Included',
        },
        {
          part_text: 'Automated SMS text alerts on form submission',
          classification: 'out_of_scope',
          reasoning: 'The agreement specifies email submissions via SMTP only; SMS gateways are external additions.',
          scope_item_title: 'Contact Inquiry Form',
        },
      ],
      is_citation_verified: true,
      created_at: now,
    };
    this.scopeAnalyses.set(analysis4.id, analysis4);

    // Initial Activities
    this.activityEvents.push(
      {
        id: 'act-1',
        project_id: DEMO_PROJECT_ID,
        event_type: 'scope_confirmed',
        description: 'Original project scope and exclusions confirmed by Alex Morgan (Agreement v1).',
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
      {
        id: 'act-2',
        project_id: DEMO_PROJECT_ID,
        event_type: 'request_submitted',
        description: 'Client Sarah Jenkins submitted a new request: "Add appointment booking widget".',
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      {
        id: 'act-3',
        project_id: DEMO_PROJECT_ID,
        event_type: 'analysis_completed',
        description: 'AI analyzed change request: Classified OUT OF SCOPE based on explicit Section 2 exclusions.',
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: 'act-4',
        project_id: DEMO_PROJECT_ID,
        proposal_id: DEMO_PROPOSAL_ID,
        event_type: 'proposal_created',
        description: 'Proposal created for $150.00 USD: Appointment Booking & Calendar Sync Add-on.',
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
      {
        id: 'act-5',
        project_id: DEMO_PROJECT_ID,
        proposal_id: DEMO_PROPOSAL_ID,
        event_type: 'proposal_sent',
        description: 'Sample client review link generated. No email is sent by ScopePay.',
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      }
    );
  }

  // --- Freelancer Methods ---
  async getFreelancer(id: string): Promise<Freelancer | null> {
    return this.freelancers.get(id) || null;
  }

  async getFreelancerByEmail(email: string): Promise<Freelancer | null> {
    for (const f of this.freelancers.values()) {
      if (f.email.toLowerCase() === email.toLowerCase()) return f;
    }
    return null;
  }

  async createFreelancer(data: Omit<Freelancer, 'created_at'>): Promise<Freelancer> {
    const freelancer: Freelancer = {
      ...data,
      created_at: new Date().toISOString(),
    };
    this.freelancers.set(freelancer.id, freelancer);
    return freelancer;
  }

  // --- Project Methods ---
  async createProject(
    data: Omit<Project, 'id' | 'created_at'>,
    agreementText: string
  ): Promise<{ project: Project; agreement: Agreement }> {
    const projectId = crypto.randomUUID();
    const now = new Date().toISOString();

    const project: Project = {
      ...data,
      id: projectId,
      created_at: now,
    };
    this.projects.set(projectId, project);

    const agreement: Agreement = {
      id: crypto.randomUUID(),
      project_id: projectId,
      version: 1,
      raw_text: agreementText,
      created_at: now,
    };
    this.agreements.set(agreement.id, agreement);

    await this.logActivity({
      project_id: projectId,
      event_type: 'scope_extracted',
      description: `Project "${project.name}" created with agreement text.`,
    });

    return { project, agreement };
  }

  async getProject(id: string): Promise<Project | null> {
    return this.projects.get(id) || null;
  }

  async listProjects(freelancerId: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      (p) => p.freelancer_id === freelancerId
    );
  }

  // --- Agreement & Scope Methods ---
  async getLatestAgreement(projectId: string): Promise<Agreement | null> {
    const matches = Array.from(this.agreements.values())
      .filter((a) => a.project_id === projectId)
      .sort((a, b) => b.version - a.version);
    return matches[0] || null;
  }

  async saveScopeItems(
    items: Omit<ScopeItem, 'id' | 'created_at'>[]
  ): Promise<ScopeItem[]> {
    if (!items.length) return [];
    for (const [id, item] of this.scopeItems) if (item.project_id === items[0].project_id) this.scopeItems.delete(id);
    for (const [id, analysis] of this.scopeAnalyses) if (analysis.project_id === items[0].project_id) this.scopeAnalyses.delete(id);
    const saved: ScopeItem[] = [];
    const now = new Date().toISOString();

    for (const item of items) {
      const scopeItem: ScopeItem = {
        ...item,
        id: crypto.randomUUID(),
        created_at: now,
      };
      this.scopeItems.set(scopeItem.id, scopeItem);
      saved.push(scopeItem);
    }

    if (saved.length > 0) {
      await this.logActivity({
        project_id: saved[0].project_id,
        event_type: 'scope_confirmed',
        description: `Confirmed ${saved.length} scope items for agreement.`,
      });
    }

    return saved;
  }

  async getScopeItems(projectId: string): Promise<ScopeItem[]> {
    return Array.from(this.scopeItems.values()).filter(
      (s) => s.project_id === projectId
    );
  }

  async getConfirmedScopeItems(projectId: string): Promise<ScopeItem[]> {
    return Array.from(this.scopeItems.values()).filter(
      (s) => s.project_id === projectId && s.is_confirmed
    );
  }

  // --- Change Requests ---
  async createChangeRequest(
    data: Omit<ChangeRequest, 'id' | 'created_at' | 'status'>
  ): Promise<ChangeRequest> {
    const id = crypto.randomUUID();
    const request: ChangeRequest = {
      ...data,
      id,
      status: 'pending_analysis',
      created_at: new Date().toISOString(),
    };
    this.changeRequests.set(id, request);

    await this.logActivity({
      project_id: data.project_id,
      event_type: 'request_submitted',
      description: 'New client request recorded.',
    });

    return request;
  }

  async getChangeRequest(id: string): Promise<ChangeRequest | null> {
    return this.changeRequests.get(id) || null;
  }

  async listChangeRequests(projectId: string): Promise<ChangeRequest[]> {
    return Array.from(this.changeRequests.values())
      .filter((r) => r.project_id === projectId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async updateChangeRequestStatus(id: string, status: ChangeRequest['status']): Promise<void> {
    const req = this.changeRequests.get(id);
    if (req) {
      req.status = status;
    }
  }

  // --- Scope Analyses ---
  async saveScopeAnalysis(
    data: Omit<ScopeAnalysis, 'id' | 'created_at'>
  ): Promise<ScopeAnalysis> {
    const id = crypto.randomUUID();
    const analysis: ScopeAnalysis = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };
    this.scopeAnalyses.set(id, analysis);

    // Update request status
    const req = this.changeRequests.get(data.change_request_id);
    if (req && req.status === 'pending_analysis') {
      req.status = 'analyzed';
    }

    await this.logActivity({
      project_id: data.project_id,
      event_type: 'analysis_completed',
      description: `AI analyzed change request: Classified as ${data.classification.toUpperCase()}.`,
      metadata: { classification: data.classification },
    });

    return analysis;
  }

  async listScopeAnalyses(projectId: string) { return Array.from(this.scopeAnalyses.values()).filter(a => a.project_id === projectId); }

  async getScopeAnalysisByRequest(requestId: string): Promise<ScopeAnalysis | null> {
    for (const an of Array.from(this.scopeAnalyses.values()).reverse()) {
      if (an.change_request_id === requestId) return an;
    }
    return null;
  }

  // --- Change Proposals ---
  async createChangeProposal(
    data: Omit<ChangeProposal, 'id' | 'created_at' | 'updated_at' | 'version' | 'approval_status' | 'payment_status'>
  ): Promise<ChangeProposal> {
    const request = this.changeRequests.get(data.change_request_id);
    if (!request || request.project_id !== data.project_id) throw new Error('Request/project mismatch');
    if (Array.from(this.changeProposals.values()).some(p => p.change_request_id === data.change_request_id)) throw new Error('Use a new version of the existing proposal');
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const proposal: ChangeProposal = {
      ...data,
      id,
      version: 1,
      approval_status: 'draft',
      payment_status: 'unpaid',
      created_at: now,
      updated_at: now,
    };
    this.changeProposals.set(id, proposal);

    // Update change request status to 'proposed'
    const req = this.changeRequests.get(data.change_request_id);
    if (req) req.status = 'proposed';

    await this.logActivity({
      project_id: data.project_id,
      proposal_id: id,
      event_type: 'proposal_created',
      description: `Proposal v1 created: "${proposal.title}" for $${(proposal.amount_cents / 100).toFixed(2)} USD.`,
    });

    return proposal;
  }

  async getProposal(id: string): Promise<ChangeProposal | null> {
    return this.changeProposals.get(id) || null;
  }

  async getProposalByRequest(requestId: string): Promise<ChangeProposal | null> {
    const matches = Array.from(this.changeProposals.values())
      .filter((p) => p.change_request_id === requestId)
      .sort((a, b) => b.version - a.version);
    return matches[0] || null;
  }

  async listProposals(projectId: string): Promise<ChangeProposal[]> {
    return Array.from(this.changeProposals.values())
      .filter((p) => p.project_id === projectId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async listProposalsForFreelancer(freelancerId: string): Promise<ChangeProposal[]> {
    const freelancerProjects = new Set(
      Array.from(this.projects.values())
        .filter((p) => p.freelancer_id === freelancerId)
        .map((p) => p.id)
    );

    return Array.from(this.changeProposals.values()).filter(
      (p) => freelancerProjects.has(p.project_id)
    );
  }

  async createNewProposalVersion(
    currentProposalId: string,
    updates: Partial<Pick<ChangeProposal, 'title' | 'description' | 'acceptance_criteria' | 'amount_cents'>>
  ): Promise<ChangeProposal> {
    const current = this.changeProposals.get(currentProposalId);
    if (!current) throw new Error('Proposal not found');

    if (current.approval_status === 'superseded') throw new Error('Use the latest proposal');
    if (Array.from(this.paymentAttempts.values()).some(a => a.proposal_id === currentProposalId)) throw new Error('Cannot revise a proposal after checkout has started; reconcile payment first');
    for (const token of this.clientTokens.values()) if (token.proposal_id === currentProposalId) token.revoked_at = new Date().toISOString();
    // Mark current proposal as superseded
    current.approval_status = 'superseded';
    current.updated_at = new Date().toISOString();

    const newVersion = current.version + 1;
    const now = new Date().toISOString();
    const newId = crypto.randomUUID();

    const updatedProposal: ChangeProposal = {
      id: newId,
      project_id: current.project_id,
      change_request_id: current.change_request_id,
      version: newVersion,
      title: updates.title ?? current.title,
      description: updates.description ?? current.description,
      acceptance_criteria: updates.acceptance_criteria ?? current.acceptance_criteria,
      amount_cents: updates.amount_cents ?? current.amount_cents,
      currency: 'USD',
      approval_status: 'draft',
      payment_status: 'unpaid',
      created_at: now,
      updated_at: now,
    };

    this.changeProposals.set(newId, updatedProposal);

    await this.logActivity({
      project_id: current.project_id,
      proposal_id: newId,
      event_type: 'proposal_created',
      description: `Created revision v${newVersion} of proposal "${updatedProposal.title}". Previous version superseded.`,
    });

    return updatedProposal;
  }

  async freezeProposal(id: string): Promise<ChangeProposal> {
    const proposal = this.changeProposals.get(id);
    if (!proposal) throw new Error('Proposal not found');

    proposal.approval_status = 'approved';
    proposal.frozen_at = new Date().toISOString();
    proposal.updated_at = proposal.frozen_at;

    return proposal;
  }

  async updateProposalPaymentStatus(id: string, status: ChangeProposal['payment_status']): Promise<void> {
    const proposal = this.changeProposals.get(id);
    if (proposal) {
      proposal.payment_status = status;
      proposal.updated_at = new Date().toISOString();
    }
  }

  // --- Client Access Tokens ---
  async createClientAccessToken(
    proposalId: string,
    rawToken: string,
    expiresInHours: number = 336 // 14 days default
  ): Promise<ClientAccessToken> {
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInHours * 3600000).toISOString();

    const clientToken: ClientAccessToken = {
      id: crypto.randomUUID(),
      proposal_id: proposalId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_at: now.toISOString(),
    };

    this.clientTokens.set(tokenHash, clientToken);

    const proposal = this.changeProposals.get(proposalId);
    if (proposal && proposal.approval_status === 'draft') {
      proposal.approval_status = 'sent';
      await this.logActivity({
        project_id: proposal.project_id,
        proposal_id: proposal.id,
        event_type: 'proposal_sent',
        description: `Secure proposal link generated for client review.`,
      });
    }

    return clientToken;
  }

  async getClientAccessTokenByHash(tokenHash: string): Promise<ClientAccessToken | null> {
    return this.clientTokens.get(tokenHash) || null;
  }

  async revokeProposalLinks(proposalId: string) { for (const t of this.clientTokens.values()) if (t.proposal_id === proposalId) t.revoked_at = new Date().toISOString(); }

  async revokeClientAccessToken(id: string): Promise<void> {
    for (const token of this.clientTokens.values()) {
      if (token.id === id) {
        token.revoked_at = new Date().toISOString();
        break;
      }
    }
  }

  // --- Client Approvals ---
  async recordClientApproval(
    data: Omit<ClientApprovalRecord, 'id' | 'approved_at'>
  ): Promise<ClientApprovalRecord> {
    const proposalToApprove = this.changeProposals.get(data.proposal_id);
    if (!proposalToApprove || proposalToApprove.version !== data.proposal_version || proposalToApprove.approval_status === 'superseded') throw new Error('Invalid proposal version');
    const existing = this.clientApprovals.get(`${data.proposal_id}_${data.proposal_version}`);
    if (existing) return existing;
    const id = crypto.randomUUID();
    const approvedAt = new Date().toISOString();

    const approval: ClientApprovalRecord = {
      ...data,
      id,
      approved_at: approvedAt,
    };
    const key = `${data.proposal_id}_${data.proposal_version}`;
    this.clientApprovals.set(key, approval);

    // Freeze proposal
    await this.freezeProposal(data.proposal_id);

    const proposal = this.changeProposals.get(data.proposal_id);
    if (proposal) {
      await this.logActivity({
        project_id: proposal.project_id,
        proposal_id: proposal.id,
        event_type: 'client_approved',
        description: `Client link holder approved Proposal v${data.proposal_version} ($${(proposal.amount_cents / 100).toFixed(2)} USD).`,
        metadata: {
          client_name: data.client_name,
          proposal_version: data.proposal_version,
        },
      });
    }

    return approval;
  }

  async getClientApproval(proposalId: string, version: number): Promise<ClientApprovalRecord | null> {
    return this.clientApprovals.get(`${proposalId}_${version}`) || null;
  }

  async getPaymentAttemptByProposal(proposalId: string) {
    return Array.from(this.paymentAttempts.values()).find(a => a.proposal_id === proposalId) || null;
  }
  async reservePayment(proposal: ChangeProposal) {
    // Synchronous reservation before any await: one attempt per immutable proposal.
    const existing = Array.from(this.paymentAttempts.values()).find(a => a.proposal_id === proposal.id);
    if (existing) return existing;
    if (proposal.approval_status !== 'approved') throw new Error('Approval required');
    const attempt: PaymentAttempt = { id: crypto.randomUUID(), proposal_id: proposal.id, proposal_version: proposal.version, paypal_order_id: `reserved:${proposal.id}`, amount_cents: proposal.amount_cents, currency: proposal.currency, status: 'created', created_at: new Date().toISOString() };
    this.paymentAttempts.set(attempt.paypal_order_id, attempt);
    proposal.payment_status = 'payment_pending';
    return attempt;
  }
  async attachPaymentOrder(attemptId: string, orderId: string, approvalUrl?: string) {
    const attempt = Array.from(this.paymentAttempts.values()).find(a => a.id === attemptId);
    if (!attempt) throw new Error('Attempt missing');
    if (!attempt.paypal_order_id.startsWith('reserved:') && attempt.paypal_order_id !== orderId) throw new Error('Order already attached');
    this.paymentAttempts.delete(attempt.paypal_order_id);
    attempt.paypal_order_id = orderId; attempt.approval_url = approvalUrl;
    this.paymentAttempts.set(orderId, attempt);
    return attempt;
  }

  // --- Payment Attempts ---
  async createPaymentAttempt(
    data: Omit<PaymentAttempt, 'id' | 'created_at'>
  ): Promise<PaymentAttempt> {
    // Uniqueness check for paypal_order_id
    if (this.paymentAttempts.has(data.paypal_order_id)) {
      return this.paymentAttempts.get(data.paypal_order_id)!;
    }

    const id = crypto.randomUUID();
    const attempt: PaymentAttempt = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };
    this.paymentAttempts.set(data.paypal_order_id, attempt);

    // Set proposal payment status to pending
    const proposal = this.changeProposals.get(data.proposal_id);
    if (proposal && proposal.payment_status === 'unpaid') {
      proposal.payment_status = 'payment_pending';
      await this.logActivity({
        project_id: proposal.project_id,
        proposal_id: proposal.id,
        event_type: 'paypal_order_created',
        description: `PayPal order ${data.paypal_order_id} created for $${(data.amount_cents / 100).toFixed(2)} USD.`,
      });
    }

    return attempt;
  }

  async getPaymentAttemptByCaptureId(captureId: string) { return Array.from(this.paymentAttempts.values()).find(a => a.paypal_capture_id === captureId) || null; }

  async getPaymentAttemptByOrderId(paypalOrderId: string): Promise<PaymentAttempt | null> {
    return this.paymentAttempts.get(paypalOrderId) || null;
  }

  async updatePaymentAttemptCapture(
    paypalOrderId: string,
    paypalCaptureId: string,
    status: 'captured' | 'failed' | 'pending' | 'refunded' | 'reversed',
    payerDetails?: { email?: string; name?: string; error?: string }
  ): Promise<PaymentAttempt> {
    const attempt = this.paymentAttempts.get(paypalOrderId);
    if (!attempt) throw new Error(`Payment attempt for order ${paypalOrderId} not found`);

    if (['refunded', 'reversed'].includes(attempt.status) || (attempt.status === 'captured' && !['refunded', 'reversed'].includes(status)) || attempt.status === status) return attempt;
    if (paypalCaptureId && Array.from(this.paymentAttempts.values()).some(a => a.id !== attempt.id && a.paypal_capture_id === paypalCaptureId)) throw new Error('Capture already assigned');
    if (paypalCaptureId) attempt.paypal_capture_id = paypalCaptureId;
    attempt.status = status;
    attempt.captured_at = new Date().toISOString();
    if (payerDetails) {
      if (payerDetails.email) attempt.payer_email = payerDetails.email;
      if (payerDetails.name) attempt.payer_name = payerDetails.name;
      if (payerDetails.error) attempt.error_message = payerDetails.error;
    }

    const proposal = this.changeProposals.get(attempt.proposal_id);
    if (proposal) {
      if (status === 'captured') {
        proposal.payment_status = 'paid';
        // Also mark change request as resolved
        const req = this.changeRequests.get(proposal.change_request_id);
        if (req) req.status = 'resolved';

        await this.logActivity({
          project_id: proposal.project_id,
          proposal_id: proposal.id,
          event_type: 'payment_completed',
          description: `Payment captured via PayPal ($${(attempt.amount_cents / 100).toFixed(2)} USD). Capture ID: ${paypalCaptureId}.`,
          metadata: { paypal_order_id: paypalOrderId, paypal_capture_id: paypalCaptureId },
        });
      } else {
        proposal.payment_status = status === 'pending' ? 'payment_pending' : status === 'refunded' ? 'refunded' : status === 'reversed' ? 'reversed' : 'payment_failed';
        await this.logActivity({
          project_id: proposal.project_id,
          proposal_id: proposal.id,
          event_type: 'payment_failed',
          description: `Payment failed for order ${paypalOrderId}: ${payerDetails?.error || 'Unknown error'}`,
        });
      }
    }

    return attempt;
  }

  // --- Webhook Idempotency ---
  async isWebhookEventProcessed(eventId: string): Promise<boolean> {
    return this.processedWebhooks.has(eventId);
  }

  async recordProcessedWebhookEvent(eventId: string, eventType: string): Promise<ProcessedWebhookEvent> {
    const event: ProcessedWebhookEvent = {
      id: crypto.randomUUID(),
      event_id: eventId,
      event_type: eventType,
      processed_at: new Date().toISOString(),
    };
    this.processedWebhooks.set(eventId, event);
    return event;
  }

  // --- Activity Audit Log ---
  async logActivity(data: Omit<ActivityEvent, 'id' | 'created_at'>): Promise<ActivityEvent> {
    const event: ActivityEvent = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.activityEvents.unshift(event);
    return event;
  }

  async listActivity(projectId: string): Promise<ActivityEvent[]> {
    return this.activityEvents
      .filter((a) => a.project_id === projectId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}
