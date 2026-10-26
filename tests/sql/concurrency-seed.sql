INSERT INTO freelancers(id,email,name) VALUES('f0000000-0000-4000-8000-000000000021','parallel@example.com','Parallel test');
INSERT INTO projects(id,freelancer_id,name,client_name,client_email) VALUES('b0000000-0000-4000-8000-000000000021','f0000000-0000-4000-8000-000000000021','Parallel project','Buyer','buyer@example.com');
INSERT INTO change_requests(id,project_id,client_request_text) VALUES('d0000000-0000-4000-8000-000000000021','b0000000-0000-4000-8000-000000000021','Parallel request');
INSERT INTO change_proposals(id,project_id,change_request_id,title,description,acceptance_criteria,amount_cents) VALUES('c0000000-0000-4000-8000-000000000021','b0000000-0000-4000-8000-000000000021','d0000000-0000-4000-8000-000000000021','Parallel proposal','Test proposal for concurrency','["Test"]',100);
SELECT (approve_proposal('{"proposal_id":"c0000000-0000-4000-8000-000000000021","proposal_version":1,"client_name":"Buyer","client_email":"buyer@example.com"}')).proposal_version;
