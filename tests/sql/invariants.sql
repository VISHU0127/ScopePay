-- Run only against a disposable database after both migrations. Rolls back fixture data.
BEGIN;
DO $$
DECLARE owner_id uuid:=gen_random_uuid(); project_id uuid:=gen_random_uuid(); request_id uuid:=gen_random_uuid(); proposal_id uuid:=gen_random_uuid(); a payment_attempts; b payment_attempts; approval client_approvals;
BEGIN
 INSERT INTO freelancers(id,email,name) VALUES(owner_id, owner_id || '@example.com','Test owner');
 INSERT INTO projects(id,freelancer_id,name,client_name,client_email) VALUES(project_id,owner_id,'Test','Buyer','buyer@example.com');
 INSERT INTO change_requests(id,project_id,client_request_text) VALUES(request_id,project_id,'Additional feature');
 INSERT INTO change_proposals(id,project_id,change_request_id,title,description,acceptance_criteria,amount_cents,currency) VALUES(proposal_id,project_id,request_id,'Test proposal','Additional feature with review','["Reviewed feature"]',15000,'USD');
 BEGIN
   PERFORM reserve_payment(proposal_id);
   RAISE EXCEPTION 'TEST FAILURE: unapproved checkout allowed';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'TEST FAILURE:%' THEN RAISE; END IF; END;
 approval:=approve_proposal(jsonb_build_object('proposal_id',proposal_id,'proposal_version',1,'client_name','Buyer','client_email','buyer@example.com'));
 IF approval.id <> (approve_proposal(jsonb_build_object('proposal_id',proposal_id,'proposal_version',1))).id THEN RAISE EXCEPTION 'Approval retry is not idempotent'; END IF;
 BEGIN
   UPDATE change_proposals SET amount_cents=1 WHERE id=proposal_id;
   RAISE EXCEPTION 'TEST FAILURE: approved amount mutable';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'TEST FAILURE:%' THEN RAISE; END IF; END;
 a:=reserve_payment(proposal_id); b:=reserve_payment(proposal_id);
 IF a.id<>b.id OR a.proposal_version<>1 OR a.amount_cents<>15000 THEN RAISE EXCEPTION 'Reservation invariant failed'; END IF;
 a:=attach_payment_order(a.id,'SQL-ORDER',null);
 PERFORM apply_payment_state('SQL-ORDER',null,'pending','{}');
 IF (SELECT payment_status FROM change_proposals WHERE id=proposal_id)<>'payment_pending' THEN RAISE EXCEPTION 'Pending was marked paid'; END IF;
 PERFORM apply_payment_state('SQL-ORDER','SQL-CAPTURE','captured','{}');
 PERFORM apply_payment_state('SQL-ORDER','SQL-CAPTURE','captured','{}');
 PERFORM apply_payment_state('SQL-ORDER',null,'failed','{}');
 IF (SELECT payment_status FROM change_proposals WHERE id=proposal_id)<>'paid' THEN RAISE EXCEPTION 'Late failure overwrote paid'; END IF;
 IF (SELECT count(*) FROM activity_events e WHERE e.proposal_id=a.proposal_id AND event_type='payment_completed')<>1 THEN RAISE EXCEPTION 'Duplicate payment activity'; END IF;
 PERFORM apply_payment_state('SQL-ORDER','SQL-CAPTURE','refunded','{}');
 PERFORM apply_payment_state('SQL-ORDER','SQL-CAPTURE','captured','{}');
 IF (SELECT payment_status FROM change_proposals WHERE id=proposal_id)<>'refunded' THEN RAISE EXCEPTION 'Late completion overwrote refund'; END IF;
 BEGIN
   PERFORM revise_proposal(proposal_id,'{"amount_cents": 16000}');
   RAISE EXCEPTION 'TEST FAILURE: checkout proposal revised';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'TEST FAILURE:%' THEN RAISE; END IF; END;
 IF has_function_privilege('authenticated','public.reserve_payment(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Public mutation RPC'; END IF;
 IF has_table_privilege('authenticated','public.change_proposals','UPDATE') THEN RAISE EXCEPTION 'Public write permission'; END IF;
END $$;
ROLLBACK;
