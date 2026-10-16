-- SYNTHETIC provider metadata ONLY in the new disposable helper. NOT a migration.
DO $f$ BEGIN IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres' THEN
 RAISE EXCEPTION 'publication_disposable_helper_required'; END IF; END $f$;
CREATE SCHEMA storage;
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text NOT NULL,name text NOT NULL,
 version text,UNIQUE(bucket_id,name));
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA storage FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON storage.objects FROM PUBLIC,anon,authenticated,service_role;
