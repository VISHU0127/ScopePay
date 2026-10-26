-- Review existing duplicate attempts before applying. This migration intentionally fails
-- if legacy data violates the one-checkout-per-immutable-proposal invariant.
ALTER TABLE public.scope_analyses ADD COLUMN scope_fingerprint text;
ALTER TABLE public.payment_attempts ADD COLUMN proposal_version integer;
ALTER TABLE public.payment_attempts ADD COLUMN approval_url text;
UPDATE public.payment_attempts a SET proposal_version = p.version FROM public.change_proposals p WHERE p.id = a.proposal_id;
ALTER TABLE public.payment_attempts ALTER COLUMN proposal_version SET NOT NULL;
ALTER TABLE public.payment_attempts ADD CONSTRAINT one_attempt_per_proposal UNIQUE(proposal_id);
ALTER TABLE public.payment_attempts DROP CONSTRAINT payment_attempts_status_check;
ALTER TABLE public.payment_attempts ADD CHECK (status IN ('created','pending','captured','failed','refunded','reversed'));
ALTER TABLE public.payment_attempts ADD CHECK (amount_cents > 0 AND currency = 'USD');
ALTER TABLE public.change_proposals DROP CONSTRAINT change_proposals_payment_status_check;
ALTER TABLE public.change_proposals ADD CHECK (payment_status IN ('unpaid','payment_pending','paid','payment_failed','refunded','reversed'));
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_scope_project ON public.scope_items(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_project ON public.scope_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_request ON public.scope_analyses(change_request_id, created_at DESC);

-- Browser roles are read-only. Every write uses an authorized server endpoint.
REVOKE INSERT, UPDATE, DELETE ON public.freelancers, public.projects, public.agreements, public.scope_items, public.change_requests, public.scope_analyses, public.change_proposals, public.client_access_tokens, public.client_approvals, public.payment_attempts, public.processed_webhook_events, public.activity_events FROM anon, authenticated;

CREATE FUNCTION public.proposal_integrity() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM change_requests WHERE id = NEW.change_request_id AND project_id = NEW.project_id) THEN RAISE EXCEPTION 'Request/project mismatch'; END IF;
  IF NEW.amount_cents < 1 OR NEW.amount_cents > 100000000 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF TG_OP = 'UPDATE' AND OLD.frozen_at IS NOT NULL AND
    (NEW.title, NEW.description, NEW.acceptance_criteria, NEW.amount_cents, NEW.currency, NEW.project_id, NEW.change_request_id, NEW.version, NEW.frozen_at)
    IS DISTINCT FROM (OLD.title, OLD.description, OLD.acceptance_criteria, OLD.amount_cents, OLD.currency, OLD.project_id, OLD.change_request_id, OLD.version, OLD.frozen_at)
  THEN RAISE EXCEPTION 'Approved terms are immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER proposal_integrity BEFORE INSERT OR UPDATE ON public.change_proposals FOR EACH ROW EXECUTE FUNCTION public.proposal_integrity();

CREATE FUNCTION public.payment_attempt_integrity() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM change_proposals p WHERE p.id=NEW.proposal_id AND p.version=NEW.proposal_version AND p.amount_cents=NEW.amount_cents AND p.currency=NEW.currency AND p.approval_status='approved') THEN RAISE EXCEPTION 'Attempt must match approved proposal'; END IF;
 IF TG_OP='UPDATE' AND (NEW.proposal_id,NEW.proposal_version,NEW.amount_cents,NEW.currency) IS DISTINCT FROM (OLD.proposal_id,OLD.proposal_version,OLD.amount_cents,OLD.currency) THEN RAISE EXCEPTION 'Attempt terms immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER payment_attempt_integrity BEFORE INSERT OR UPDATE ON public.payment_attempts FOR EACH ROW EXECUTE FUNCTION public.payment_attempt_integrity();

CREATE FUNCTION public.approve_proposal(approval_arg jsonb) RETURNS public.client_approvals LANGUAGE plpgsql SET search_path = public AS $$
DECLARE p change_proposals; a client_approvals;
BEGIN
 SELECT * INTO STRICT p FROM change_proposals WHERE id = (approval_arg->>'proposal_id')::uuid FOR UPDATE;
 IF p.version <> (approval_arg->>'proposal_version')::int OR p.approval_status NOT IN ('draft','sent','approved') THEN RAISE EXCEPTION 'Invalid version'; END IF;
 SELECT * INTO a FROM client_approvals WHERE proposal_id = p.id AND proposal_version = p.version;
 IF FOUND THEN RETURN a; END IF;
 INSERT INTO client_approvals(proposal_id,proposal_version,client_name,client_email,notes)
 VALUES(p.id,p.version,approval_arg->>'client_name',approval_arg->>'client_email',approval_arg->>'notes') RETURNING * INTO a;
 UPDATE change_proposals SET approval_status='approved', frozen_at=now(), updated_at=now() WHERE id=p.id;
 INSERT INTO activity_events(project_id,proposal_id,event_type,description) VALUES(p.project_id,p.id,'client_approved','Client link holder approved version ' || p.version);
 RETURN a;
END $$;

CREATE FUNCTION public.revise_proposal(proposal_id_arg uuid, updates_arg jsonb) RETURNS public.change_proposals LANGUAGE plpgsql SET search_path = public AS $$
DECLARE p change_proposals; n change_proposals;
BEGIN
 SELECT * INTO STRICT p FROM change_proposals WHERE id=proposal_id_arg FOR UPDATE;
 IF p.approval_status='superseded' OR EXISTS(SELECT 1 FROM payment_attempts WHERE proposal_id=p.id) THEN RAISE EXCEPTION 'Cannot revise this version after checkout begins'; END IF;
 UPDATE change_proposals SET approval_status='superseded',updated_at=now() WHERE id=p.id;
 UPDATE client_access_tokens SET revoked_at=now() WHERE proposal_id=p.id AND revoked_at IS NULL;
 INSERT INTO change_proposals(project_id,change_request_id,version,title,description,acceptance_criteria,amount_cents,currency)
 VALUES(p.project_id,p.change_request_id,p.version+1,coalesce(updates_arg->>'title',p.title),coalesce(updates_arg->>'description',p.description),coalesce(updates_arg->'acceptance_criteria',p.acceptance_criteria),coalesce((updates_arg->>'amount_cents')::int,p.amount_cents),p.currency) RETURNING * INTO n;
 INSERT INTO activity_events(project_id,proposal_id,event_type,description) VALUES(p.project_id,n.id,'proposal_created','New proposal version ' || n.version || ' requires approval');
 RETURN n;
END $$;

CREATE FUNCTION public.reserve_payment(proposal_id_arg uuid) RETURNS public.payment_attempts LANGUAGE plpgsql SET search_path = public AS $$
DECLARE p change_proposals; a payment_attempts;
BEGIN
 SELECT * INTO STRICT p FROM change_proposals WHERE id=proposal_id_arg FOR UPDATE;
 IF p.approval_status <> 'approved' OR NOT EXISTS(SELECT 1 FROM client_approvals WHERE proposal_id=p.id AND proposal_version=p.version) THEN RAISE EXCEPTION 'Approval required'; END IF;
 SELECT * INTO a FROM payment_attempts WHERE proposal_id=p.id;
 IF FOUND THEN RETURN a; END IF;
 INSERT INTO payment_attempts(proposal_id,proposal_version,paypal_order_id,amount_cents,currency)
 VALUES(p.id,p.version,'reserved:' || p.id,p.amount_cents,p.currency) RETURNING * INTO a;
 UPDATE change_proposals SET payment_status='payment_pending',updated_at=now() WHERE id=p.id;
 RETURN a;
END $$;

CREATE FUNCTION public.attach_payment_order(attempt_id_arg uuid,order_id_arg text,approval_url_arg text) RETURNS public.payment_attempts LANGUAGE plpgsql SET search_path = public AS $$
DECLARE a payment_attempts; p change_proposals;
BEGIN
 SELECT * INTO STRICT a FROM payment_attempts WHERE id=attempt_id_arg FOR UPDATE;
 IF a.paypal_order_id NOT LIKE 'reserved:%' THEN
   IF a.paypal_order_id <> order_id_arg THEN RAISE EXCEPTION 'Order already attached'; END IF;
   RETURN a;
 END IF;
 UPDATE payment_attempts SET paypal_order_id=order_id_arg,approval_url=approval_url_arg WHERE id=a.id RETURNING * INTO a;
 SELECT * INTO STRICT p FROM change_proposals WHERE id=a.proposal_id;
 INSERT INTO activity_events(project_id,proposal_id,event_type,description) VALUES(p.project_id,p.id,'paypal_order_created','Sandbox checkout created');
 RETURN a;
END $$;

CREATE FUNCTION public.apply_payment_state(order_id_arg text,capture_id_arg text,status_arg text,details_arg jsonb) RETURNS public.payment_attempts LANGUAGE plpgsql SET search_path = public AS $$
DECLARE a payment_attempts; p change_proposals; next_status text;
BEGIN
 SELECT * INTO STRICT a FROM payment_attempts WHERE paypal_order_id=order_id_arg FOR UPDATE;
 SELECT * INTO STRICT p FROM change_proposals WHERE id=a.proposal_id FOR UPDATE;
 IF a.status IN ('refunded','reversed') OR (a.status='captured' AND status_arg NOT IN ('refunded','reversed')) OR a.status=status_arg THEN RETURN a; END IF;
 IF p.approval_status <> 'approved' OR a.proposal_version <> p.version OR a.amount_cents <> p.amount_cents OR a.currency <> p.currency THEN RAISE EXCEPTION 'Attempt mismatch'; END IF;
 IF status_arg NOT IN ('captured','pending','failed','refunded','reversed') THEN RAISE EXCEPTION 'Invalid payment state'; END IF;
 IF status_arg IN ('captured','refunded','reversed') AND capture_id_arg IS NULL THEN RAISE EXCEPTION 'Capture required'; END IF;
 next_status := CASE status_arg WHEN 'captured' THEN 'paid' WHEN 'pending' THEN 'payment_pending' WHEN 'failed' THEN 'payment_failed' ELSE status_arg END;
 UPDATE payment_attempts SET status=status_arg,paypal_capture_id=coalesce(capture_id_arg,paypal_capture_id),captured_at=CASE WHEN status_arg='captured' THEN now() ELSE captured_at END WHERE id=a.id RETURNING * INTO a;
 UPDATE change_proposals SET payment_status=next_status,updated_at=now() WHERE id=p.id;
 IF status_arg='captured' THEN UPDATE change_requests SET status='resolved' WHERE id=p.change_request_id; END IF;
 INSERT INTO activity_events(project_id,proposal_id,event_type,description) VALUES(p.project_id,p.id,CASE WHEN status_arg='captured' THEN 'payment_completed' ELSE 'payment_' || status_arg END,'Verified sandbox payment state: ' || status_arg);
 RETURN a;
END $$;

CREATE FUNCTION public.replace_scope(project_id_arg uuid,agreement_id_arg uuid,items_arg jsonb) RETURNS SETOF public.scope_items LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 PERFORM 1 FROM projects WHERE id=project_id_arg FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM agreements WHERE id=agreement_id_arg AND project_id=project_id_arg) THEN RAISE EXCEPTION 'Agreement mismatch'; END IF;
 DELETE FROM scope_analyses WHERE project_id=project_id_arg;
 DELETE FROM scope_items WHERE project_id=project_id_arg;
 RETURN QUERY INSERT INTO scope_items(project_id,agreement_id,type,title,description,verbatim_quote,is_confirmed)
 SELECT project_id_arg,agreement_id_arg,i->>'type',i->>'title',i->>'description',i->>'verbatim_quote',(i->>'is_confirmed')::boolean FROM jsonb_array_elements(items_arg) i RETURNING *;
 INSERT INTO activity_events(project_id,event_type,description) VALUES(project_id_arg,'scope_confirmed','Reviewed scope replaced; previous analyses invalidated');
END $$;

-- Functions run with caller privileges. Only service role may invoke mutation RPCs.
REVOKE EXECUTE ON FUNCTION public.approve_proposal(jsonb), public.revise_proposal(uuid,jsonb), public.reserve_payment(uuid), public.attach_payment_order(uuid,text,text), public.apply_payment_state(text,text,text,jsonb), public.replace_scope(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_proposal(jsonb), public.revise_proposal(uuid,jsonb), public.reserve_payment(uuid), public.attach_payment_order(uuid,text,text), public.apply_payment_state(text,text,text,jsonb), public.replace_scope(uuid,uuid,jsonb) TO service_role;

-- Project and source agreement must be created together.
CREATE FUNCTION public.create_project_with_agreement(project_arg jsonb, agreement_text_arg text) RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE p projects; a agreements;
BEGIN
 INSERT INTO projects(freelancer_id,name,client_name,client_email,status) VALUES((project_arg->>'freelancer_id')::uuid,project_arg->>'name',project_arg->>'client_name',project_arg->>'client_email','active') RETURNING * INTO p;
 INSERT INTO agreements(project_id,version,raw_text) VALUES(p.id,1,agreement_text_arg) RETURNING * INTO a;
 INSERT INTO activity_events(project_id,event_type,description) VALUES(p.id,'scope_extracted','Project and source agreement created; scope awaits review');
 RETURN jsonb_build_object('project',to_jsonb(p),'agreement',to_jsonb(a));
END $$;
REVOKE EXECUTE ON FUNCTION public.create_project_with_agreement(jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_project_with_agreement(jsonb,text) TO service_role;
