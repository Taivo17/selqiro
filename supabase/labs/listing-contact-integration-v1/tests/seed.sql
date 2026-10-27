-- Only new identities/accounts in the isolated contact test database. No copied user data.
INSERT INTO auth.users(id) VALUES ('91000000-0000-0000-0000-000000000001'),('92000000-0000-0000-0000-000000000002'),('93000000-0000-0000-0000-000000000003');
INSERT INTO public.identities(id,type,user_id,display_name) VALUES
 ('a1000000-0000-0000-0000-000000000001','private','91000000-0000-0000-0000-000000000001','Contact seller fixture'),
 ('b2000000-0000-0000-0000-000000000002','private','92000000-0000-0000-0000-000000000002','Contact buyer fixture'),
 ('b2100000-0000-0000-0000-000000000002','private','92000000-0000-0000-0000-000000000002','Other buyer identity fixture'),
 ('c3000000-0000-0000-0000-000000000003','private','93000000-0000-0000-0000-000000000003','Unrelated contact fixture');
INSERT INTO public.profiles(id,active_identity_id) VALUES
 ('91000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001'),
 ('92000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000002'),
 ('93000000-0000-0000-0000-000000000003','c3000000-0000-0000-0000-000000000003');
INSERT INTO public.publication_policy_documents(id,policy_key,policy_version,locale,title,body_text,content_hash,status,applies_to_content_types,effective_from)
 VALUES('99000000-0000-0000-0000-000000000009','marketplace-general','new-contact-integration-v1','et-EE','Isolated contact rules',
 'Synthetic rules for the new isolated integration only.',repeat('9',64),'active',ARRAY['listing'],now()-interval '1 day');
INSERT INTO public.user_publication_policy_acceptances(user_id,policy_document_id,policy_key,policy_version,locale,content_hash)
 SELECT p.id,'99000000-0000-0000-0000-000000000009','marketplace-general','new-contact-integration-v1','et-EE',repeat('9',64)
 FROM public.profiles p WHERE p.id IN ('91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000002');
CREATE SCHEMA contact_integration_test;
CREATE TABLE contact_integration_test.ctx(k text PRIMARY KEY,v jsonb NOT NULL);
CREATE FUNCTION contact_integration_test.actor(u uuid) RETURNS void LANGUAGE plpgsql AS $f$
BEGIN PERFORM set_config('request.jwt.claim.sub',u::text,true); PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true); END $f$;
CREATE FUNCTION contact_integration_test.v(k text) RETURNS jsonb LANGUAGE sql AS $f$ SELECT v FROM contact_integration_test.ctx WHERE ctx.k=$1 $f$;
CREATE FUNCTION contact_integration_test.boot(k text,u uuid,i uuid) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE a jsonb;c jsonb;r jsonb;
BEGIN
 PERFORM contact_integration_test.actor(u);
 a:=public.prepare_my_listing_publication_v1(u,i,gen_random_uuid(),
 '{"basics":{"title":"Contact integration item","description":"Synthetic same-V2 contact fixture","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb);
 c:=public.get_my_listing_publication_confirmation_v1(u,i,(a->>'attempt_id')::uuid);
 r:=public.publish_my_listing_v1(u,i,(a->>'attempt_id')::uuid,c->'confirmation'->>'confirmation_sha256');
 INSERT INTO contact_integration_test.ctx VALUES(k,r);
 RETURN r->>'listing_id';
END $f$;
SELECT contact_integration_test.boot('seller','91000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001');
SELECT contact_integration_test.boot('buyer','92000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000002');
