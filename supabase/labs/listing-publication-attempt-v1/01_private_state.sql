-- DORMANT CANDIDATE: not a migration. Load only in the NEW isolated test helper.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'publication_disposable_helper_required';
 END IF;
END $gate$;
CREATE SCHEMA listing_publication_private;
REVOKE ALL ON SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA listing_publication_private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE TABLE listing_publication_private.attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE RESTRICT,
 request_key uuid NOT NULL CHECK(request_key<>'00000000-0000-0000-0000-000000000000'::uuid),
 intent_sha256 bytea NOT NULL CHECK(octet_length(intent_sha256)=32),
 payload jsonb,
 policy_snapshot jsonb NOT NULL CHECK(jsonb_typeof(policy_snapshot)='array' AND jsonb_array_length(policy_snapshot)>0),
 state text NOT NULL DEFAULT 'open' CHECK(state IN('open','cancelled','expired')),
 created_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 closed_at timestamptz,
 UNIQUE(actor_user_id,request_key),
 CHECK(expires_at=created_at+interval '24 hours'),
 CHECK((state='open' AND payload IS NOT NULL AND jsonb_typeof(payload)='object' AND closed_at IS NULL)
    OR (state IN('cancelled','expired') AND payload IS NULL AND closed_at IS NOT NULL)),
 CHECK(closed_at IS NULL OR closed_at>=created_at)
);
CREATE INDEX attempts_actor_created ON listing_publication_private.attempts(actor_user_id,created_at);
CREATE INDEX attempts_open_expiry ON listing_publication_private.attempts(expires_at,id) WHERE state='open';
CREATE TABLE listing_publication_private.slots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 attempt_id uuid NOT NULL REFERENCES listing_publication_private.attempts(id) ON DELETE RESTRICT,
 ordinal integer NOT NULL CHECK(ordinal BETWEEN 0 AND 9),
 client_file_id uuid NOT NULL CHECK(client_file_id<>'00000000-0000-0000-0000-000000000000'::uuid),
 expected_source_bytes integer NOT NULL CHECK(expected_source_bytes BETWEEN 1 AND 26214400),
 expected_source_sha256 bytea NOT NULL CHECK(octet_length(expected_source_sha256)=32),
 UNIQUE(attempt_id,ordinal), UNIQUE(attempt_id,client_file_id), UNIQUE(id,attempt_id)
);
CREATE TABLE listing_publication_private.objects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 attempt_id uuid NOT NULL,
 slot_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN('source','web')),
 bucket_id text NOT NULL CHECK(bucket_id='listing-publication-private'),
 object_path text NOT NULL,
 reserved_bytes integer NOT NULL CHECK(reserved_bytes BETWEEN 1 AND 26214400),
 dispatch_key uuid,
 dispatch_recorded_at timestamptz,
 FOREIGN KEY(slot_id,attempt_id) REFERENCES listing_publication_private.slots(id,attempt_id) ON DELETE RESTRICT,
 UNIQUE(slot_id,kind), UNIQUE(bucket_id,object_path), UNIQUE(attempt_id,dispatch_key),
 CHECK(object_path='v1/'||attempt_id::text||'/'||slot_id::text||
       CASE kind WHEN 'source' THEN '/source.upload' ELSE '/web-v1.webp' END),
 CHECK(reserved_bytes=CASE kind WHEN 'source' THEN 26214400 ELSE 4194304 END),
 CHECK((dispatch_key IS NULL AND dispatch_recorded_at IS NULL) OR
       (kind='source' AND dispatch_key IS NOT NULL AND dispatch_recorded_at IS NOT NULL AND
        dispatch_key<>'00000000-0000-0000-0000-000000000000'::uuid))
);
CREATE INDEX objects_attempt ON listing_publication_private.objects(attempt_id);
-- Exact keys are copied here atomically BEFORE content is erased. No success/TTL guess.
CREATE TABLE listing_publication_private.cleanup (
 object_id uuid PRIMARY KEY REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 bucket_id text NOT NULL CHECK(bucket_id='listing-publication-private'),
 object_path text NOT NULL,
 reason text NOT NULL CHECK(reason IN('cancelled','expired')),
 state text NOT NULL CHECK(state IN('pending','blocked_write_settlement')),
 enqueued_at timestamptz NOT NULL,
 UNIQUE(bucket_id,object_path)
);
ALTER TABLE listing_publication_private.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.cleanup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION listing_publication_private.protect_attempt() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $fn$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'publication_receipt_retained' USING ERRCODE='55000'; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','payload','closed_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['state','payload','closed_at']) OR OLD.state<>'open'
    OR NEW.state NOT IN('cancelled','expired') OR NEW.payload IS NOT NULL OR NEW.closed_at IS NULL THEN
  RAISE EXCEPTION 'publication_attempt_immutable' USING ERRCODE='55000';
 END IF;
 IF EXISTS(SELECT 1 FROM listing_publication_private.objects o
   LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND (c.object_id IS NULL OR c.bucket_id<>o.bucket_id
    OR c.object_path<>o.object_path OR c.reason<>NEW.state
    OR c.state<>CASE WHEN o.dispatch_key IS NULL THEN 'pending' ELSE 'blocked_write_settlement' END)) THEN
  RAISE EXCEPTION 'publication_cleanup_lineage_required' USING ERRCODE='55000';
 END IF;
 RETURN NEW;
END $fn$;
CREATE TRIGGER protect_attempt BEFORE UPDATE OR DELETE ON listing_publication_private.attempts
FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_attempt();
CREATE FUNCTION listing_publication_private.protect_slot() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $fn$
BEGIN RAISE EXCEPTION 'publication_slot_immutable' USING ERRCODE='55000'; END $fn$;
CREATE TRIGGER protect_slot BEFORE UPDATE OR DELETE ON listing_publication_private.slots
FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_slot();
CREATE FUNCTION listing_publication_private.protect_object() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $fn$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'publication_object_lineage_retained' USING ERRCODE='55000'; END IF;
 IF (to_jsonb(NEW)-ARRAY['dispatch_key','dispatch_recorded_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['dispatch_key','dispatch_recorded_at']) OR OLD.dispatch_key IS NOT NULL
    OR NEW.dispatch_key IS NULL OR NEW.dispatch_recorded_at IS NULL THEN
  RAISE EXCEPTION 'publication_object_immutable' USING ERRCODE='55000';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM listing_publication_private.attempts a
   WHERE a.id=OLD.attempt_id AND a.state='open' AND a.expires_at>clock_timestamp()) THEN
  RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000';
 END IF;
 RETURN NEW;
END $fn$;
CREATE TRIGGER protect_object BEFORE UPDATE OR DELETE ON listing_publication_private.objects
FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_object();

-- This stage has no settlement worker yet. Queue lineage cannot be rewritten or discarded.
CREATE FUNCTION listing_publication_private.protect_cleanup() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $fn$
BEGIN RAISE EXCEPTION 'publication_cleanup_lineage_retained' USING ERRCODE='55000'; END $fn$;
CREATE TRIGGER protect_cleanup BEFORE UPDATE OR DELETE ON listing_publication_private.cleanup
FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_cleanup();
