import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

export class SupabaseStore implements IScopePayRepository {
  private client: SupabaseClient;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  async resetDemoData(): Promise<void> {
    // In production database, do not wipe tables
    // Reset can be called in test environments if desired
  }

  // --- Freelancer Methods ---
  async getFreelancer(id: string): Promise<Freelancer | null> {
    const { data, error } = await this.client
      .from('freelancers')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return data as Freelancer;
  }

  async getFreelancerByEmail(email: string): Promise<Freelancer | null> {
    const { data, error } = await this.client
      .from('freelancers')
      .select('*')
      .eq('email', email)
      .single();
    if (error || !data) return null;
    return data as Freelancer;
  }

  async createFreelancer(freelancer: Omit<Freelancer, 'created_at'>): Promise<Freelancer> {
    const { data, error } = await this.client
      .from('freelancers')
      .insert([freelancer])
      .select()
      .single();
    if (error) throw new Error(`Supabase createFreelancer failed: ${error.message}`);
    return data as Freelancer;
  }

  // --- Project Methods ---
  async createProject(
    projectData: Omit<Project, 'id' | 'created_at'>,
    agreementText: string
  ): Promise<{ project: Project; agreement: Agreement }> {
    return this.rpc<{ project: Project; agreement: Agreement }>('create_project_with_agreement', { project_arg: projectData, agreement_text_arg: agreementText });
  }

  async getProject(id: string): Promise<Project | null> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return data as Project;
  }

  async listProjects(freelancerId: string): Promise<Project[]> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('freelancer_id', freelancerId)
      .order('created_at', { ascending: false });
    if (error) throw new Error('Database read failed');
    if (!data) return [];
    return data as Project[];
  }

  // --- Agreements & Scope ---
  async getLatestAgreement(projectId: string): Promise<Agreement | null> {
    const { data, error } = await this.client
      .from('agreements')
      .select('*')
      .eq('project_id', projectId)
      .order('version', { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return null;
    return data as Agreement;
  }

  async saveScopeItems(items: Omit<ScopeItem, 'id' | 'created_at'>[]): Promise<ScopeItem[]> {
    if (!items.length) return [];
    return this.rpc<ScopeItem[]>('replace_scope', { project_id_arg: items[0].project_id, agreement_id_arg: items[0].agreement_id, items_arg: items });
  }

  async getScopeItems(projectId: string): Promise<ScopeItem[]> {
    const { data, error } = await this.client
      .from('scope_items')
      .select('*')
      .eq('project_id', projectId);
    if (error) throw new Error('Database read failed');
    if (!data) return [];
    return data as ScopeItem[];
  }

  async getConfirmedScopeItems(projectId: string): Promise<ScopeItem[]> {
    const { data, error } = await this.client
      .from('scope_items')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_confirmed', true);
    if (error) throw new Error('Database read failed');
    if (!data) return [];
    return data as ScopeItem[];
  }

  // --- Change Requests ---
  async createChangeRequest(
    data: Omit<ChangeRequest, 'id' | 'created_at' | 'status'>
  ): Promise<ChangeRequest> {
    const { data: result, error } = await this.client
      .from('change_requests')
      .insert([{ ...data, status: 'pending_analysis' }])
      .select()
      .single();
    if (error || !result) throw new Error(`Failed to create change request: ${error?.message}`);

    await this.logActivity({
      project_id: data.project_id,
      event_type: 'request_submitted',
      description: 'New client request recorded.',
    });

    return result as ChangeRequest;
  }

  async getChangeRequest(id: string): Promise<ChangeRequest | null> {
    const { data, error } = await this.client
      .from('change_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return data as ChangeRequest;
  }

  async listChangeRequests(projectId: string): Promise<ChangeRequest[]> {
    const { data, error } = await this.client
      .from('change_requests')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw new Error('Database read failed');
    if (!data) return [];
    return data as ChangeRequest[];
  }

  async updateChangeRequestStatus(id: string, status: ChangeRequest['status']): Promise<void> {
    await this.client
      .from('change_requests')
      .update({ status })
      .eq('id', id);
  }

  // --- AI Analyses ---
  async saveScopeAnalysis(
    analysis: Omit<ScopeAnalysis, 'id' | 'created_at'>
  ): Promise<ScopeAnalysis> {
    const { data, error } = await this.client
      .from('scope_analyses')
      .insert([analysis])
      .select()
      .single();
    if (error || !data) throw new Error(`Failed to save scope analysis: ${error?.message}`);

    await this.client
      .from('change_requests')
      .update({ status: 'analyzed' })
      .eq('id', analysis.change_request_id);

    await this.logActivity({
      project_id: analysis.project_id,
      event_type: 'analysis_completed',
      description: `AI analyzed change request: Classified as ${analysis.classification.toUpperCase()}.`,
      metadata: { classification: analysis.classification },
    });

    return data as ScopeAnalysis;
  }

  async listScopeAnalyses(projectId: string) { const { data, error } = await this.client.from('scope_analyses').select('*').eq('project_id', projectId); if (error) throw new Error('Analysis lookup failed'); return data as ScopeAnalysis[]; }

  async getScopeAnalysisByRequest(requestId: string): Promise<ScopeAnalysis | null> {
    const { data, error } = await this.client
      .from('scope_analyses')
      .select('*')
      .eq('change_request_id', requestId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return null;
    return data as ScopeAnalysis;
  }

  // --- Change Proposals ---
  async createChangeProposal(
    proposal: Omit<ChangeProposal, 'id' | 'created_at' | 'updated_at' | 'version' | 'approval_status' | 'payment_status'>
  ): Promise<ChangeProposal> {
    const { data, error } = await this.client
      .from('change_proposals')
      .insert([
        {
          ...proposal,
          version: 1,
          approval_status: 'draft',
          payment_status: 'unpaid',
        },
      ])
      .select()
      .single();
    if (error || !data) throw new Error(`Failed to create proposal: ${error?.message}`);

    await this.client
      .from('change_requests')
      .update({ status: 'proposed' })
      .eq('id', proposal.change_request_id);

    await this.logActivity({
      project_id: proposal.project_id,
      proposal_id: data.id,
      event_type: 'proposal_created',
      description: `Proposal v1 created: "${data.title}" for $${(data.amount_cents / 100).toFixed(2)} USD.`,
    });

    return data as ChangeProposal;
  }

  async getProposal(id: string): Promise<ChangeProposal | null> {
    const { data, error } = await this.client
      .from('change_proposals')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return data as ChangeProposal;
  }

  async getProposalByRequest(requestId: string): Promise<ChangeProposal | null> {
    const { data, error } = await this.client
      .from('change_proposals')
      .select('*')
      .eq('change_request_id', requestId)
      .order('version', { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return null;
    return data as ChangeProposal;
  }

  async listProposals(projectId: string): Promise<ChangeProposal[]> {
    const { data, error } = await this.client
      .from('change_proposals')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw new Error('Database read failed');
    if (!data) return [];
    return data as ChangeProposal[];
  }

  async listProposalsForFreelancer(freelancerId: string): Promise<ChangeProposal[]> {
    const { data: projects, error: projectError } = await this.client
      .from('projects')
      .select('id')
      .eq('freelancer_id', freelancerId);
    if (projectError) throw new Error('Project lookup failed');
    if (!projects || projects.length === 0) return [];
    const projectIds = projects.map((p) => p.id);

    const { data, error } = await this.client
      .from('change_proposals')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });
    if (error) throw new Error('Database read failed');
    if (!data) return [];
    return data as ChangeProposal[];
  }

  async createNewProposalVersion(
    currentProposalId: string,
    updates: Partial<Pick<ChangeProposal, 'title' | 'description' | 'acceptance_criteria' | 'amount_cents'>>
  ): Promise<ChangeProposal> {
    return this.rpc<ChangeProposal>('revise_proposal', { proposal_id_arg: currentProposalId, updates_arg: updates });
  }

  async freezeProposal(id: string): Promise<ChangeProposal> {
    const frozenAt = new Date().toISOString();
    const { data, error } = await this.client
      .from('change_proposals')
      .update({
        approval_status: 'approved',
        frozen_at: frozenAt,
        updated_at: frozenAt,
      })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) throw new Error(`Failed to freeze proposal: ${error?.message}`);
    return data as ChangeProposal;
  }

  async updateProposalPaymentStatus(id: string, status: ChangeProposal['payment_status']): Promise<void> {
    await this.client
      .from('change_proposals')
      .update({
        payment_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
  }

  // --- Client Access Tokens ---
  async createClientAccessToken(
    proposalId: string,
    rawToken: string,
    expiresInHours: number = 336
  ): Promise<ClientAccessToken> {
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + expiresInHours * 3600000).toISOString();

    const { data, error } = await this.client
      .from('client_access_tokens')
      .insert([
        {
          proposal_id: proposalId,
          token_hash: tokenHash,
          expires_at: expiresAt,
        },
      ])
      .select()
      .single();
    if (error || !data) throw new Error(`Failed to create client access token: ${error?.message}`);

    const proposal = await this.getProposal(proposalId);
    if (proposal && proposal.approval_status === 'draft') {
      await this.client
        .from('change_proposals')
        .update({ approval_status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', proposalId);

      await this.logActivity({
        project_id: proposal.project_id,
        proposal_id: proposal.id,
        event_type: 'proposal_sent',
        description: `Secure proposal link generated for client review.`,
      });
    }

    return data as ClientAccessToken;
  }

  async getClientAccessTokenByHash(tokenHash: string): Promise<ClientAccessToken | null> {
    const { data, error } = await this.client
      .from('client_access_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .single();
    if (error || !data) return null;
    return data as ClientAccessToken;
  }

  async revokeProposalLinks(proposalId: string) { const { error } = await this.client.from('client_access_tokens').update({ revoked_at: new Date().toISOString() }).eq('proposal_id', proposalId).is('revoked_at', null); if (error) throw new Error('Link revocation failed'); }

  async revokeClientAccessToken(id: string): Promise<void> {
    await this.client
      .from('client_access_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id);
  }

  // --- Client Approvals ---
  async recordClientApproval(
    approval: Omit<ClientApprovalRecord, 'id' | 'approved_at'>
  ): Promise<ClientApprovalRecord> {
    return this.rpc<ClientApprovalRecord>('approve_proposal', { approval_arg: approval });
  }

  async getClientApproval(proposalId: string, version: number): Promise<ClientApprovalRecord | null> {
    const { data, error } = await this.client
      .from('client_approvals')
      .select('*')
      .eq('proposal_id', proposalId)
      .eq('proposal_version', version)
      .single();
    if (error || !data) return null;
    return data as ClientApprovalRecord;
  }

  private async rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.client.rpc(name, args);
    if (error) throw new Error('Database operation failed');
    return data as T;
  }
  async getPaymentAttemptByProposal(proposalId: string) {
    const { data, error } = await this.client.from('payment_attempts').select('*').eq('proposal_id', proposalId).maybeSingle();
    if (error) throw new Error('Payment lookup failed');
    return data as PaymentAttempt | null;
  }
  async reservePayment(proposal: ChangeProposal) { return this.rpc<PaymentAttempt>('reserve_payment', { proposal_id_arg: proposal.id }); }
  async attachPaymentOrder(attemptId: string, orderId: string, approvalUrl?: string) { return this.rpc<PaymentAttempt>('attach_payment_order', { attempt_id_arg: attemptId, order_id_arg: orderId, approval_url_arg: approvalUrl || null }); }

  // --- Payment Attempts ---
  async createPaymentAttempt(
    attempt: Omit<PaymentAttempt, 'id' | 'created_at'>
  ): Promise<PaymentAttempt> {
    const { data, error } = await this.client
      .from('payment_attempts')
      .insert([attempt])
      .select()
      .single();
    if (error || !data) throw new Error(`Failed to record payment attempt: ${error?.message}`);

    const proposal = await this.getProposal(attempt.proposal_id);
    if (proposal && proposal.payment_status === 'unpaid') {
      await this.updateProposalPaymentStatus(attempt.proposal_id, 'payment_pending');
      await this.logActivity({
        project_id: proposal.project_id,
        proposal_id: proposal.id,
        event_type: 'paypal_order_created',
        description: `PayPal order ${attempt.paypal_order_id} created for $${(attempt.amount_cents / 100).toFixed(2)} USD.`,
      });
    }

    return data as PaymentAttempt;
  }

  async getPaymentAttemptByCaptureId(captureId: string) { const { data, error } = await this.client.from('payment_attempts').select('*').eq('paypal_capture_id', captureId).maybeSingle(); if (error) throw new Error('Capture lookup failed'); return data as PaymentAttempt | null; }

  async getPaymentAttemptByOrderId(paypalOrderId: string): Promise<PaymentAttempt | null> {
    const { data, error } = await this.client
      .from('payment_attempts')
      .select('*')
      .eq('paypal_order_id', paypalOrderId)
      .single();
    if (error || !data) return null;
    return data as PaymentAttempt;
  }

  async updatePaymentAttemptCapture(
    paypalOrderId: string,
    paypalCaptureId: string,
    status: 'captured' | 'failed' | 'pending' | 'refunded' | 'reversed',
    payerDetails?: { email?: string; name?: string; error?: string }
  ): Promise<PaymentAttempt> {
    return this.rpc<PaymentAttempt>('apply_payment_state', { order_id_arg: paypalOrderId, capture_id_arg: paypalCaptureId || null, status_arg: status, details_arg: payerDetails || {} });
  }

  // --- Webhook Idempotency ---
  async isWebhookEventProcessed(eventId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('processed_webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .single();
    if (error || !data) return false;
    return true;
  }

  async recordProcessedWebhookEvent(eventId: string, eventType: string): Promise<ProcessedWebhookEvent> {
    const { data, error } = await this.client
      .from('processed_webhook_events')
      .upsert([{ event_id: eventId, event_type: eventType }], { onConflict: 'event_id' })
      .select()
      .single();
    if (error || !data) throw new Error(`Failed to record processed webhook: ${error?.message}`);
    return data as ProcessedWebhookEvent;
  }

  // --- Activity Log ---
  async logActivity(activity: Omit<ActivityEvent, 'id' | 'created_at'>): Promise<ActivityEvent> {
    const { data, error } = await this.client
      .from('activity_events')
      .insert([activity])
      .select()
      .single();
    if (error || !data) throw new Error(`Failed to log activity: ${error?.message}`);
    return data as ActivityEvent;
  }

  async listActivity(projectId: string): Promise<ActivityEvent[]> {
    const { data, error } = await this.client
      .from('activity_events')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw new Error('Database read failed');
    if (!data) return [];
    return data as ActivityEvent[];
  }
}
