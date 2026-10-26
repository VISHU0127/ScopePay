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

export interface IScopePayRepository {
  // Freelancers
  getFreelancer(id: string): Promise<Freelancer | null>;
  getFreelancerByEmail(email: string): Promise<Freelancer | null>;
  createFreelancer(freelancer: Omit<Freelancer, 'created_at'>): Promise<Freelancer>;

  // Projects
  createProject(
    project: Omit<Project, 'id' | 'created_at'>,
    agreementText: string
  ): Promise<{ project: Project; agreement: Agreement }>;
  getProject(id: string): Promise<Project | null>;
  listProjects(freelancerId: string): Promise<Project[]>;

  // Agreements & Scope
  getLatestAgreement(projectId: string): Promise<Agreement | null>;
  saveScopeItems(items: Omit<ScopeItem, 'id' | 'created_at'>[]): Promise<ScopeItem[]>;
  getScopeItems(projectId: string): Promise<ScopeItem[]>;
  getConfirmedScopeItems(projectId: string): Promise<ScopeItem[]>;

  // Change Requests
  createChangeRequest(
    request: Omit<ChangeRequest, 'id' | 'created_at' | 'status'>
  ): Promise<ChangeRequest>;
  getChangeRequest(id: string): Promise<ChangeRequest | null>;
  listChangeRequests(projectId: string): Promise<ChangeRequest[]>;
  updateChangeRequestStatus(id: string, status: ChangeRequest['status']): Promise<void>;

  // AI Analyses
  saveScopeAnalysis(
    analysis: Omit<ScopeAnalysis, 'id' | 'created_at'>
  ): Promise<ScopeAnalysis>;
  listScopeAnalyses(projectId: string): Promise<ScopeAnalysis[]>;
  getScopeAnalysisByRequest(requestId: string): Promise<ScopeAnalysis | null>;

  // Proposals
  createChangeProposal(
    proposal: Omit<ChangeProposal, 'id' | 'created_at' | 'updated_at' | 'version' | 'approval_status' | 'payment_status'>
  ): Promise<ChangeProposal>;
  getProposal(id: string): Promise<ChangeProposal | null>;
  getProposalByRequest(requestId: string): Promise<ChangeProposal | null>;
  listProposals(projectId: string): Promise<ChangeProposal[]>;
  listProposalsForFreelancer(freelancerId: string): Promise<ChangeProposal[]>;
  createNewProposalVersion(
    currentProposalId: string,
    updates: Partial<Pick<ChangeProposal, 'title' | 'description' | 'acceptance_criteria' | 'amount_cents'>>
  ): Promise<ChangeProposal>;
  freezeProposal(id: string): Promise<ChangeProposal>;
  updateProposalPaymentStatus(id: string, status: ChangeProposal['payment_status']): Promise<void>;

  // Client Access Tokens
  createClientAccessToken(proposalId: string, rawToken: string, expiresInHours?: number): Promise<ClientAccessToken>;
  getClientAccessTokenByHash(tokenHash: string): Promise<ClientAccessToken | null>;
  revokeProposalLinks(proposalId: string): Promise<void>;
  revokeClientAccessToken(id: string): Promise<void>;

  // Client Approvals
  recordClientApproval(approval: Omit<ClientApprovalRecord, 'id' | 'approved_at'>): Promise<ClientApprovalRecord>;
  getClientApproval(proposalId: string, version: number): Promise<ClientApprovalRecord | null>;

  reservePayment(proposal: ChangeProposal): Promise<PaymentAttempt>;
  attachPaymentOrder(attemptId: string, orderId: string, approvalUrl?: string): Promise<PaymentAttempt>;
  getPaymentAttemptByProposal(proposalId: string): Promise<PaymentAttempt | null>;

  // Payment Attempts
  createPaymentAttempt(
    attempt: Omit<PaymentAttempt, 'id' | 'created_at'>
  ): Promise<PaymentAttempt>;
  getPaymentAttemptByCaptureId(captureId: string): Promise<PaymentAttempt | null>;
  getPaymentAttemptByOrderId(paypalOrderId: string): Promise<PaymentAttempt | null>;
  updatePaymentAttemptCapture(
    paypalOrderId: string,
    paypalCaptureId: string,
    status: 'captured' | 'failed' | 'pending' | 'refunded' | 'reversed',
    payerDetails?: { email?: string; name?: string; error?: string }
  ): Promise<PaymentAttempt>;

  // Webhook Idempotency
  isWebhookEventProcessed(eventId: string): Promise<boolean>;
  recordProcessedWebhookEvent(eventId: string, eventType: string): Promise<ProcessedWebhookEvent>;

  // Activity Audit Log
  logActivity(activity: Omit<ActivityEvent, 'id' | 'created_at'>): Promise<ActivityEvent>;
  listActivity(projectId: string): Promise<ActivityEvent[]>;

  // Demo Reset / Seed
  resetDemoData(): Promise<void>;
}
