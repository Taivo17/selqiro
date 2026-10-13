-- NEW SYNTHETIC ROWS, only inside this run's isolated PostgreSQL helper.
INSERT INTO auth.users(id) VALUES('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222'),('33333333-3333-3333-3333-333333333333');
INSERT INTO public.identities(id,type,user_id,display_name) VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','private','11111111-1111-1111-1111-111111111111','Synthetic A'),('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','private','22222222-2222-2222-2222-222222222222','Synthetic B'),('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee','private','33333333-3333-3333-3333-333333333333','Synthetic C');
INSERT INTO public.identities(id,type,business_account_id,display_name) VALUES('cccccccc-cccc-cccc-cccc-cccccccccccc','business','dddddddd-dddd-dddd-dddd-dddddddddddd','Synthetic shared');
INSERT INTO public.business_members(business_account_id,user_id,role,status) VALUES
 ('dddddddd-dddd-dddd-dddd-dddddddddddd','11111111-1111-1111-1111-111111111111','owner','active'),('dddddddd-dddd-dddd-dddd-dddddddddddd','22222222-2222-2222-2222-222222222222','member','active');
INSERT INTO public.profiles(id,active_identity_id) VALUES('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),('22222222-2222-2222-2222-222222222222','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),('33333333-3333-3333-3333-333333333333','eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
INSERT INTO public.publication_policy_documents(id,policy_key,policy_version,locale,title,body_text,content_hash,status,applies_to_content_types,effective_from)
 VALUES('99999999-9999-9999-9999-999999999999','marketplace-general','synthetic-v1','et-EE','Synthetic rules','Synthetic test-only publication rules, not live legal text.',repeat('a',64),'active',ARRAY['listing'],now()-interval '1 day');
INSERT INTO public.user_publication_policy_acceptances(user_id,policy_document_id,policy_key,policy_version,locale,content_hash)
 VALUES('11111111-1111-1111-1111-111111111111','99999999-9999-9999-9999-999999999999','marketplace-general','synthetic-v1','et-EE',repeat('a',64)),
       ('22222222-2222-2222-2222-222222222222','99999999-9999-9999-9999-999999999999','marketplace-general','synthetic-v1','et-EE',repeat('a',64));
