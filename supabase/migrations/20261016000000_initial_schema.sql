-- ScopePay Initial Database Schema
-- Compatible with Supabase PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Freelancers Profile
CREATE TABLE IF NOT EXISTS public.freelancers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. Projects
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    freelancer_id UUID NOT NULL REFERENCES public.freelancers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Versioned Agreements
CREATE TABLE IF NOT EXISTS public.agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    raw_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(project_id, version)
);

-- 4. Scope Items
CREATE TABLE IF NOT EXISTS public.scope_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('deliverable', 'exclusion', 'revision_limit', 'timeline', 'acceptance_criteria')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    verbatim_quote TEXT,
    is_confirmed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 5. Change Requests
CREATE TABLE IF NOT EXISTS public.change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    client_request_text TEXT NOT NULL,
    submitted_by_name TEXT,
    submitted_by_email TEXT,
    status TEXT NOT NULL DEFAULT 'pending_analysis' CHECK (status IN ('pending_analysis', 'analyzed', 'proposed', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 6. AI Scope Analyses
CREATE TABLE IF NOT EXISTS public.scope_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    change_request_id UUID NOT NULL REFERENCES public.change_requests(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    agreement_version INTEGER NOT NULL,
    classification TEXT NOT NULL CHECK (classification IN ('in_scope', 'out_of_scope', 'ambiguous')),
    explanation TEXT NOT NULL,
    relevant_scope_item_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    verbatim_citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    identified_additional_work JSONB NOT NULL DEFAULT '[]'::jsonb,
    clarification_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    draft_client_reply TEXT NOT NULL,
    sub_parts JSONB DEFAULT '[]'::jsonb,
    is_citation_verified BOOLEAN NOT NULL DEFAULT false,
    unverified_citations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 7. Change Proposals (Versioned & Frozen on approval)
CREATE TABLE IF NOT EXISTS public.change_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    change_request_id UUID NOT NULL REFERENCES public.change_requests(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    acceptance_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
    approval_status TEXT NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft', 'sent', 'approved', 'rejected', 'superseded')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'payment_pending', 'paid', 'payment_failed')),
    frozen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(change_request_id, version)
);

-- 8. Client Access Tokens (Hashed, Expiring, Revocable)
CREATE TABLE IF NOT EXISTS public.client_access_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES public.change_proposals(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 9. Recorded Client Approvals
CREATE TABLE IF NOT EXISTS public.client_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES public.change_proposals(id) ON DELETE CASCADE,
    proposal_version INTEGER NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    ip_address TEXT,
    user_agent TEXT,
    notes TEXT,
    UNIQUE(proposal_id, proposal_version)
);

-- 10. Payment Attempts & PayPal Transactions
CREATE TABLE IF NOT EXISTS public.payment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES public.change_proposals(id) ON DELETE CASCADE,
    paypal_order_id TEXT NOT NULL UNIQUE,
    paypal_capture_id TEXT UNIQUE,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'captured', 'failed')),
    payer_email TEXT,
    payer_name TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    captured_at TIMESTAMPTZ
);

-- 11. Processed Webhook Events (Idempotency)
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 12. Activity Audit Log
CREATE TABLE IF NOT EXISTS public.activity_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    proposal_id UUID REFERENCES public.change_proposals(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Indexes for performant lookups
CREATE INDEX IF NOT EXISTS idx_projects_freelancer ON public.projects(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_agreements_project ON public.agreements(project_id);
CREATE INDEX IF NOT EXISTS idx_scope_items_agreement ON public.scope_items(agreement_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_project ON public.change_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_project ON public.change_proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_request ON public.change_proposals(change_request_id);
CREATE INDEX IF NOT EXISTS idx_tokens_hash ON public.client_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_payments_proposal ON public.payment_attempts(proposal_id);
CREATE INDEX IF NOT EXISTS idx_activity_project ON public.activity_events(project_id, created_at DESC);

-- Row Level Security (RLS) setup
ALTER TABLE public.freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scope_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scope_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS for server-side trusted operations
CREATE POLICY "Freelancers can view own profile" ON public.freelancers
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Freelancers can view and edit own projects" ON public.projects
    FOR ALL USING (auth.uid() = freelancer_id);

CREATE POLICY "Freelancers can access agreements of own projects" ON public.agreements
    FOR ALL USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = agreements.project_id AND projects.freelancer_id = auth.uid()));

CREATE POLICY "Freelancers can access scope items of own projects" ON public.scope_items
    FOR ALL USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = scope_items.project_id AND projects.freelancer_id = auth.uid()));

CREATE POLICY "Freelancers can access change requests of own projects" ON public.change_requests
    FOR ALL USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = change_requests.project_id AND projects.freelancer_id = auth.uid()));

CREATE POLICY "Freelancers can access change proposals of own projects" ON public.change_proposals
    FOR ALL USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = change_proposals.project_id AND projects.freelancer_id = auth.uid()));

CREATE POLICY "Freelancers can access activities of own projects" ON public.activity_events
    FOR ALL USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = activity_events.project_id AND projects.freelancer_id = auth.uid()));
