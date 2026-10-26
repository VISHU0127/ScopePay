export type ProposalApprovalStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'superseded';
export type ProposalPaymentStatus = 'unpaid' | 'payment_pending' | 'paid' | 'payment_failed' | 'refunded' | 'reversed';
export type RequestAnalysisClassification = 'in_scope' | 'out_of_scope' | 'ambiguous';
export type ScopeItemType = 'deliverable' | 'exclusion' | 'revision_limit' | 'timeline' | 'acceptance_criteria';

export interface Freelancer {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Project {
  id: string;
  freelancer_id: string;
  name: string;
  client_name: string;
  client_email: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
}

export interface Agreement {
  id: string;
  project_id: string;
  version: number;
  raw_text: string;
  created_at: string;
}

export interface ScopeItem {
  id: string;
  agreement_id: string;
  project_id: string;
  type: ScopeItemType;
  title: string;
  description: string;
  verbatim_quote?: string;
  is_confirmed: boolean;
  created_at: string;
}

export interface ChangeRequest {
  id: string;
  project_id: string;
  client_request_text: string;
  submitted_by_name?: string;
  submitted_by_email?: string;
  status: 'pending_analysis' | 'analyzed' | 'proposed' | 'resolved';
  created_at: string;
}

export interface SubPartAnalysis {
  part_text: string;
  classification: RequestAnalysisClassification;
  reasoning: string;
  scope_item_title?: string;
}

export interface ScopeAnalysis {
  scope_fingerprint?: string;
  id: string;
  change_request_id: string;
  project_id: string;
  agreement_version: number;
  classification: RequestAnalysisClassification;
  explanation: string;
  relevant_scope_item_ids: string[];
  verbatim_citations: string[];
  identified_additional_work: string[];
  clarification_questions: string[];
  draft_client_reply: string;
  sub_parts?: SubPartAnalysis[];
  is_citation_verified: boolean;
  unverified_citations?: string[];
  created_at: string;
}

export interface ChangeProposal {
  id: string;
  project_id: string;
  change_request_id: string;
  version: number;
  title: string;
  description: string;
  acceptance_criteria: string[];
  amount_cents: number; // Stored in integer cents (e.g. 15000 = $150.00)
  currency: 'USD';
  approval_status: ProposalApprovalStatus;
  payment_status: ProposalPaymentStatus;
  frozen_at?: string; // Timestamp when proposal was approved and frozen
  created_at: string;
  updated_at: string;
}

export interface ClientAccessToken {
  id: string;
  proposal_id: string;
  token_hash: string; // SHA-256 hash of token
  expires_at: string;
  revoked_at?: string;
  created_at: string;
}

export interface ClientApprovalRecord {
  id: string;
  proposal_id: string;
  proposal_version: number;
  client_name: string;
  client_email: string;
  approved_at: string;
  ip_address?: string;
  user_agent?: string;
  notes?: string;
}

export interface PaymentAttempt {
  proposal_version?: number;
  approval_url?: string;
  id: string;
  proposal_id: string;
  paypal_order_id: string;
  paypal_capture_id?: string;
  amount_cents: number;
  currency: 'USD';
  status: 'created' | 'captured' | 'failed' | 'pending' | 'refunded' | 'reversed';
  payer_email?: string;
  payer_name?: string;
  error_message?: string;
  created_at: string;
  captured_at?: string;
}

export interface ProcessedWebhookEvent {
  id: string;
  event_id: string;
  event_type: string;
  processed_at: string;
}

export interface ActivityEvent {
  id: string;
  project_id: string;
  proposal_id?: string;
  event_type:
    | 'scope_extracted'
    | 'scope_confirmed'
    | 'request_submitted'
    | 'analysis_completed'
    | 'proposal_created'
    | 'proposal_sent'
    | 'client_approved'
    | 'paypal_order_created'
    | 'payment_pending'
    | 'payment_completed'
    | 'payment_failed';
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}
