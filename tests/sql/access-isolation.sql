-- Disposable database only: grants below model Supabase's browser read permissions.
BEGIN;
GRANT USAGE ON SCHEMA public, auth TO authenticated;
GRANT SELECT ON public.projects, public.freelancers, public.client_access_tokens TO authenticated;
INSERT INTO freelancers(id,email,name) VALUES
 ('f0000000-0000-4000-8000-000000000011','owner1@example.com','Owner one'),
 ('f0000000-0000-4000-8000-000000000012','owner2@example.com','Owner two');
INSERT INTO projects(id,freelancer_id,name,client_name,client_email) VALUES
 ('b0000000-0000-4000-8000-000000000011','f0000000-0000-4000-8000-000000000011','Private one','Buyer','buyer@example.com'),
 ('b0000000-0000-4000-8000-000000000012','f0000000-0000-4000-8000-000000000012','Private two','Buyer','buyer@example.com');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000011',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM projects)<>1 THEN RAISE EXCEPTION 'Owner isolation failed'; END IF;
 IF EXISTS(SELECT 1 FROM projects WHERE name='Private two') THEN RAISE EXCEPTION 'Foreign project visible'; END IF;
 IF has_table_privilege(current_user,'public.projects','UPDATE') THEN RAISE EXCEPTION 'Browser write permitted'; END IF;
 IF EXISTS(SELECT 1 FROM client_access_tokens) THEN RAISE EXCEPTION 'Tokens visible'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
