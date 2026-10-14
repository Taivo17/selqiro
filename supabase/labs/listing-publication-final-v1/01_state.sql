-- DORMANT FINAL-PUBLICATION LAB. Not a migration; API roles remain closed.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'publication_disposable_helper_required'; END IF;
END $gate$;
CREATE ROLE selqiro_listing_final_writer_v1 NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
GRANT selqiro_listing_final_writer_v1 TO postgres WITH ADMIN TRUE;
GRANT selqiro_listing_final_writer_v1 TO postgres WITH INHERIT TRUE;
GRANT selqiro_listing_final_writer_v1 TO postgres WITH SET TRUE;
CREATE TABLE listing_publication_private.publications (
 attempt_id uuid PRIMARY KEY REFERENCES listing_publication_private.attempts(id) ON DELETE RESTRICT,
 listing_id bigint NOT NULL UNIQUE CHECK(listing_id>0), -- no listing FK: tombstone MUST outlive content
 confirmation_sha256 text NOT NULL CHECK(confirmation_sha256 ~ '^[0-9a-f]{64}$'),
 published_at timestamptz NOT NULL,
 state text NOT NULL CHECK(state IN('published','deleting')),
 deleted_at timestamptz,
 CHECK((state='published' AND deleted_at IS NULL) OR (state='deleting' AND deleted_at IS NOT NULL))
);
ALTER TABLE listing_publication_private.publications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.publications FROM PUBLIC,anon,authenticated,service_role;
-- Replace exactly the two old state-related CHECKs. No disable-trigger/RLS or cascade.
DO $checks$ DECLARE r record; n integer:=0; BEGIN
 FOR r IN SELECT conname FROM pg_constraint WHERE conrelid='listing_publication_private.attempts'::regclass
  AND contype='c' AND pg_get_constraintdef(oid) ~ '\mstate\M' LOOP
  n:=n+1; EXECUTE format('ALTER TABLE listing_publication_private.attempts DROP CONSTRAINT %I',r.conname);
 END LOOP;
 IF n<>2 THEN RAISE EXCEPTION 'publication_attempt_check_contract_changed'; END IF;
END $checks$;
ALTER TABLE listing_publication_private.attempts
 ADD CONSTRAINT final_attempt_state CHECK(state IN('open','cancelled','expired','published','deleted')),
 ADD CONSTRAINT final_attempt_shape CHECK(
 (state='open' AND payload IS NOT NULL AND jsonb_typeof(payload)='object' AND closed_at IS NULL)
 OR (state IN('cancelled','expired','published','deleted') AND payload IS NULL AND closed_at IS NOT NULL));
DO $checks$ DECLARE r record; n integer:=0; BEGIN
 FOR r IN SELECT conname FROM pg_constraint WHERE conrelid='listing_publication_private.cleanup'::regclass
  AND contype='c' AND (pg_get_constraintdef(oid) ~ '\mstate\M' OR pg_get_constraintdef(oid) ~ '\mreason\M') LOOP
  n:=n+1; EXECUTE format('ALTER TABLE listing_publication_private.cleanup DROP CONSTRAINT %I',r.conname);
 END LOOP;
 IF n<>2 THEN RAISE EXCEPTION 'publication_cleanup_check_contract_changed'; END IF;
END $checks$;
ALTER TABLE listing_publication_private.cleanup
 ADD COLUMN work_key uuid,
 ADD COLUMN lease_until timestamptz,
 ADD COLUMN try_count integer NOT NULL DEFAULT 0 CHECK(try_count BETWEEN 0 AND 8),
 ADD COLUMN not_before timestamptz,
 ADD COLUMN last_error text CHECK(last_error IN('network','timeout','storage','response','lease_lost')),
 ADD COLUMN deleted_at timestamptz,
 ADD CONSTRAINT final_cleanup_reason CHECK(reason IN('cancelled','expired','published_source','terminal_delete')),
 ADD CONSTRAINT final_cleanup_state CHECK(state IN('pending','blocked_write_settlement','in_flight','retry_wait','deleted','needs_attention')),
 ADD CONSTRAINT final_cleanup_shape CHECK(
 (state IN('pending','blocked_write_settlement') AND work_key IS NULL AND lease_until IS NULL AND try_count=0 AND deleted_at IS NULL)
 OR (state IN('in_flight','retry_wait','needs_attention') AND work_key IS NOT NULL AND lease_until IS NOT NULL AND try_count>0 AND deleted_at IS NULL)
 OR (state='deleted' AND work_key IS NOT NULL AND lease_until IS NOT NULL AND try_count>0 AND deleted_at IS NOT NULL));
CREATE INDEX final_cleanup_due ON listing_publication_private.cleanup(state,not_before,enqueued_at,object_id);
CREATE FUNCTION listing_publication_private.final_receipt(p_attempt uuid) RETURNS jsonb LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',1,'attempt_id',a.id,'request_key',a.request_key,
 'actor_user_id',a.actor_user_id,'identity_id',a.identity_id,'listing_id',p.listing_id::text,
 'state',CASE WHEN p.state='published' THEN 'published' WHEN EXISTS(
 SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 WHERE o.attempt_id=a.id AND (c.state IS DISTINCT FROM 'deleted')) THEN 'deleting' ELSE 'deleted' END,
 'published_at',to_char(p.published_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
 'content_deleted',p.state='deleting',
 'files_remaining',(SELECT count(*) FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 WHERE o.attempt_id=a.id AND (p.state='deleting' OR o.kind='source') AND c.state IS DISTINCT FROM 'deleted'))
 FROM listing_publication_private.publications p JOIN listing_publication_private.attempts a ON a.id=p.attempt_id WHERE a.id=p_attempt;
$f$;
-- Immutable source/WEB references are never dropped, reused, or edited by deletion.
CREATE FUNCTION listing_publication_private.protect_publication() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'UPDATE' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_outcome_immutable' USING ERRCODE='42501'; END IF;
 IF OLD.state<>'published' OR NEW.state<>'deleting' OR NEW.deleted_at IS NULL OR
 (to_jsonb(NEW)-ARRAY['state','deleted_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','deleted_at']) THEN
  RAISE EXCEPTION 'publication_outcome_immutable' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER protect_publication BEFORE UPDATE OR DELETE ON listing_publication_private.publications
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_publication();
CREATE TRIGGER protect_publication_truncate BEFORE TRUNCATE ON listing_publication_private.publications
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_publication();
