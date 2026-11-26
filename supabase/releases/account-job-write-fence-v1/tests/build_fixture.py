"""Disposable SQL fixture: real job guards/writes; explicit external substitutes."""
from pathlib import Path
import importlib.util
import json
import re

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('release_builder',ROOT/'generator/build.py')
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
sources=[]
def actual(rel,name):
    sql,body=b.function(b.read(rel),name)
    sources.append({'function':name,'source':rel,'source_sha256':b.sha(b.read(rel)),'body_sha256':b.sha(body)})
    return sql+'\n'

sql='''-- Synthetic local fixture only. No hosted connection or real user data.
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE ROLE supabase_auth_admin; CREATE ROLE dashboard_user;
CREATE ROLE selqiro_listing_contact_writer_v1 NOINHERIT;
CREATE ROLE selqiro_listing_final_writer_v1 NOINHERIT;
CREATE ROLE selqiro_listing_price_writer_v1 NOINHERIT;
CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin;
GRANT USAGE ON SCHEMA auth TO postgres,authenticated;
CREATE TABLE auth.users(id uuid PRIMARY KEY,created_at timestamptz,deleted_at timestamptz,banned_until timestamptz);
ALTER TABLE auth.users OWNER TO supabase_auth_admin;
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $fixture_uid$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$fixture_uid$;
ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC,dashboard_user;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,active_identity_id uuid,store_slug text UNIQUE);
CREATE TABLE public.business_accounts(id uuid PRIMARY KEY,owner_user_id uuid NOT NULL,status text NOT NULL DEFAULT 'active',name text);
CREATE TABLE public.business_members(business_account_id uuid,user_id uuid,status text NOT NULL DEFAULT 'active',PRIMARY KEY(business_account_id,user_id));
CREATE TABLE public.identities(id uuid PRIMARY KEY,type text NOT NULL,user_id uuid,business_account_id uuid,status text NOT NULL DEFAULT 'active');
CREATE TABLE public.identity_profiles(identity_id uuid UNIQUE,slug text UNIQUE,display_name text,avatar_url text);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_profiles ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.publication_policy_documents(
 id uuid PRIMARY KEY,policy_key text NOT NULL,policy_version text NOT NULL,content_hash text NOT NULL,
 title text NOT NULL,body_text text NOT NULL,locale text NOT NULL,status text NOT NULL,country_code text,
 applies_to_content_types text[] NOT NULL,requires_user_acceptance boolean NOT NULL,
 effective_from timestamptz NOT NULL,effective_until timestamptz);
CREATE TABLE public.user_publication_policy_acceptances(
 user_id uuid,identity_id uuid,policy_document_id uuid,policy_key text,policy_version text,country_code text,
 locale text,content_hash text,acceptance_source text,PRIMARY KEY(user_id,policy_document_id));
CREATE SCHEMA listing_publication_private;
CREATE SCHEMA listing_contact_private;
CREATE TABLE listing_publication_private.hosted_preview_settings(singleton boolean PRIMARY KEY,project_ref text,
 release_id text,instance_id uuid,enabled boolean,release_ready boolean,storage_authority_version text);
CREATE TABLE listing_publication_private.hosted_preview_actors(actor_user_id uuid PRIMARY KEY);
-- Storage itself is outside this account-write test; the existing gate's narrow
-- dependency returns true. Actual actor gate, row locks and all job mutations run.
CREATE FUNCTION listing_publication_private.hosted_storage_contract_ready() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$;
INSERT INTO listing_publication_private.hosted_preview_settings VALUES(true,'fixture','listing-publication-hosted-preview-v1',gen_random_uuid(),true,true,'source-part-rfc3986-v1');
'''
foundation=b.read('supabase/releases/account-state-foundation-v1/foundation.sql')
foundation=foundation.replace('-- @FUNCTIONS@',b.read('supabase/releases/account-state-foundation-v1/functions.sql'))
sql+=foundation+'\n'+b.read('supabase/releases/account-public-profile-fence-v1/account-availability.sql')+'\n'
sql+=b.read('supabase/releases/account-contact-write-fence-v1/account-write-availability.sql')+'\n'
for rel,name in [
 ('supabase/labs/listing-publication-attempt-v1/tests/fixture.generated.sql','public.current_user_has_identity_access'),
 ('supabase/releases/listing-publication-hosted-preview-v1/00_preconditions.sql','public.listing_actor_uid_hosted_v1'),
 ('supabase/releases/listing-publication-hosted-preview-v1/00_preconditions.sql','listing_publication_private.assert_hosted_preview_actor'),
 ('supabase/releases/listing-publication-hosted-preview-v1/10_price_core.sql','public.lock_listing_creation_actor_v1'),
 ('supabase/releases/listing-publication-hosted-preview-v1/10_price_core.sql','public.listing_price_currency_scale_v1'),
 ('supabase/releases/listing-publication-hosted-preview-v1/10_price_core.sql','public.normalize_listing_price_v1'),
 ('supabase/releases/listing-publication-hosted-preview-v1/20_publication_core.sql','listing_publication_private.require_actor'),
]: sql+=actual(rel,name)
sql+=b.read('supabase/repairs/20261116_jobs_public/01_state.sql')+'\n'
for name in ['jobs_private.require_key','jobs_private.require_revision','jobs_private.calendar_month_after','jobs_private.current_policies','jobs_private.accept_policies','jobs_private.cursor']:
    sql+=actual('supabase/repairs/20261116_jobs_public/02_context.sql',name)
sql+=b.read('supabase/repairs/20261121_personal_jobs/01_authority.sql')+'\n'
sources.append({'function':'jobs_private.require_actor','source':'supabase/repairs/20261121_personal_jobs/01_authority.sql','body_sha256':b.sha(b.function(b.read('supabase/repairs/20261121_personal_jobs/01_authority.sql'),'jobs_private.require_actor')[1])})
sql+=actual('supabase/repairs/20261121_personal_jobs/02_content.sql','jobs_private.normalize_content')
for name in ['jobs_private.content','jobs_private.owner_fields','jobs_private.search_document']:
    sql+=actual('supabase/repairs/20261116_jobs_public/03_content.sql',name)
sql+='CREATE INDEX jobs_public_keywords_idx ON public.jobs USING gin (jobs_private.search_document(title,description,category,city,country_code)) WHERE status=\'published\';\n'
sql+=b.read('supabase/repairs/20261116_jobs_public/06_mutations.sql')+'\n'
for name in ['public.get_my_job_v1','public.get_my_job_policies_v1','public.get_my_job_request_v1']:
    sql+=actual('supabase/repairs/20261116_jobs_public/04_reads.sql',name)
sql+=actual('supabase/repairs/20261122_job_owner_read_lock/01_owner_read.sql','public.get_my_jobs_v1')
for name in ['jobs_private.mutate','public.save_my_job_v1','public.publish_my_job_v1','public.set_my_job_status_v1','public.renew_my_job_activity_v1']:
    src='supabase/repairs/20261116_jobs_public/06_mutations.sql'
    sources.append({'function':name,'source':src,'body_sha256':b.sha(b.function(b.read(src),name)[1])})

# Function ACLs are copied from the accepted metadata, not invented test grants.
for f in [*b.base['dependencies'],b.old[b.mutate_signature]]:
    if f['signature'].startswith('listing_publication_private.hosted_storage_contract_ready'):
        continue
    sql+='REVOKE ALL ON FUNCTION '+f['signature']+' FROM PUBLIC,anon,authenticated,service_role;\n'
    for a in f['acl']:
        if a['grantee']!='postgres':
            sql+='GRANT '+a['privilege']+' ON FUNCTION '+f['signature']+' TO '+a['grantee']+';\n'
sql+='REVOKE ALL ON SCHEMA jobs_private FROM PUBLIC,anon,authenticated,service_role;\nGRANT USAGE ON SCHEMA jobs_private TO selqiro_listing_contact_writer_v1;\n'

sql+='''
INSERT INTO public.publication_policy_documents VALUES(
 '50000000-0000-0000-0000-000000000001','marketplace-general','1','testhash','Fixture policy','Fixture policy body',
 'et-EE','active',NULL,ARRAY['job'],true,'2020-01-01Z',NULL);
'''
b.write(ROOT/'tests/fixture.sql',sql)
b.json_write(ROOT/'proof/fixture-provenance.json',{
 'format':'selqiro-account-job-write-fixture-v1','postgres_required':'17.6',
 'actual_sources':sources,
 'substitutions':[
  {'object':'auth.uid()','reason':'Synthetic JWT GUC reader; no hosted Auth service. Production body and definition remain independently pinned.'},
  {'object':'listing_publication_private.hosted_storage_contract_ready()','reason':'Unrelated managed storage catalog gate returns true; actual actor gate/authority/locking and all job writes are executed.'},
  {'object':'identity/auth/policy relations','reason':'Synthetic minimal rows/columns for actual job functions, not a hosted data clone; production catalog remains separately exact-pinned.'}
 ],
 'target_bodies_are_exact':True,
 'test_only_catalog_adaptation':'Transaction/control tests replace only expected BASE metadata with the observed synthetic fixture BASE. BEFORE/AFTER target bodies, ACL and checks remain exactly release constants. Unmodified production preflight must reject fixture BASE as unknown.'
})
print('fixture_bytes',len(sql.encode()))
