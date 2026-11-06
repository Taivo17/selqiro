-- One photo addition owns one normal private publication attempt. It never owns
-- a second public listing. A permanent binding distinguishes source ordinal 0
-- from the parent gallery's never-reused ordinal.
CREATE TABLE listing_publication_private.managed_image_additions_v1 (
 attempt_id uuid PRIMARY KEY REFERENCES listing_publication_private.attempts(id) ON DELETE RESTRICT,
 parent_attempt_id uuid NOT NULL REFERENCES listing_publication_private.publications(attempt_id) ON DELETE RESTRICT,
 attached_at timestamptz,
 ready_id uuid,
 gallery_ordinal integer CHECK(gallery_ordinal>=0),
 attached_revision bigint CHECK(attached_revision>=1),
 was_primary boolean,
 CHECK(attempt_id<>parent_attempt_id),
 CHECK((attached_at IS NULL AND ready_id IS NULL AND gallery_ordinal IS NULL AND attached_revision IS NULL AND was_primary IS NULL)
  OR (attached_at IS NOT NULL AND ready_id IS NOT NULL AND gallery_ordinal IS NOT NULL AND attached_revision IS NOT NULL AND was_primary IS NOT NULL)),
 UNIQUE(parent_attempt_id,gallery_ordinal)
);
ALTER TABLE listing_publication_private.managed_image_additions_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.managed_image_additions_v1 FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON listing_publication_private.managed_image_additions_v1 TO selqiro_listing_final_writer_v1;
CREATE POLICY managed_image_addition_writer ON listing_publication_private.managed_image_additions_v1
 FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);

CREATE FUNCTION listing_publication_private.protect_managed_image_addition_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE child listing_publication_private.attempts%ROWTYPE; parent record;
BEGIN
 IF current_user<>'selqiro_listing_final_writer_v1' OR TG_OP NOT IN('INSERT','UPDATE') THEN
  RAISE EXCEPTION 'listing_image_addition_immutable' USING ERRCODE='42501'; END IF;
 SELECT * INTO child FROM listing_publication_private.attempts WHERE id=NEW.attempt_id;
 SELECT p.listing_id,a.identity_id,a.actor_user_id INTO parent
  FROM listing_publication_private.publications p JOIN listing_publication_private.attempts a ON a.id=p.attempt_id
  WHERE p.attempt_id=NEW.parent_attempt_id AND p.state='published' AND a.state='published';
 IF NOT FOUND OR child.state IS DISTINCT FROM 'open' OR child.identity_id IS DISTINCT FROM parent.identity_id
  OR child.payload IS DISTINCT FROM jsonb_build_object('schema_version',1,'purpose','listing_image_addition',
   'parent_attempt_id',NEW.parent_attempt_id,'listing_id',parent.listing_id::text)
  OR EXISTS(SELECT 1 FROM listing_publication_private.publications WHERE attempt_id=child.id)
  OR (SELECT count(*) FROM listing_publication_private.slots WHERE attempt_id=child.id)<>1
  OR NOT EXISTS(SELECT 1 FROM listing_publication_private.slots WHERE attempt_id=child.id AND ordinal=0) THEN
  RAISE EXCEPTION 'listing_image_addition_binding' USING ERRCODE='55000'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.attached_at IS NOT NULL THEN RAISE EXCEPTION 'listing_image_addition_immutable' USING ERRCODE='55000'; END IF;
 ELSE
  IF OLD.attached_at IS NOT NULL OR NEW.attempt_id IS DISTINCT FROM OLD.attempt_id
   OR NEW.parent_attempt_id IS DISTINCT FROM OLD.parent_attempt_id OR NEW.attached_at IS NULL
   OR NEW.gallery_ordinal::bigint IS DISTINCT FROM (SELECT coalesce(max(g.ordinal)::bigint+1,0)
    FROM listing_publication_private.managed_image_origins_v1(NEW.parent_attempt_id) g)
   OR NOT EXISTS(SELECT 1 FROM listing_publication_private.slots s
    JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.attempt_id=s.attempt_id
    JOIN public.listing_images i ON i.listing_id=parent.listing_id AND i.sort_order=NEW.gallery_ordinal
    WHERE s.attempt_id=child.id AND s.ordinal=0 AND w.state='ready' AND w.ready_id=NEW.ready_id
     AND i.user_id=parent.actor_user_id AND i.is_primary=NEW.was_primary
     AND i.original_url='/api/v2/listing-media/'||child.id::text||'/0'
     AND i.medium_url=i.original_url AND i.thumb_url=i.original_url)
   OR NOT EXISTS(SELECT 1 FROM listing_publication_private.managed_image_presentations_v1
    WHERE attempt_id=NEW.parent_attempt_id AND revision=NEW.attached_revision) THEN
   RAISE EXCEPTION 'listing_image_addition_immutable' USING ERRCODE='55000'; END IF;
 END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER protect_managed_image_addition_v1 BEFORE INSERT OR UPDATE OR DELETE
 ON listing_publication_private.managed_image_additions_v1 FOR EACH ROW
 EXECUTE FUNCTION listing_publication_private.protect_managed_image_addition_v1();
CREATE TRIGGER protect_managed_image_addition_truncate_v1 BEFORE TRUNCATE
 ON listing_publication_private.managed_image_additions_v1 FOR EACH STATEMENT
 EXECUTE FUNCTION listing_publication_private.protect_managed_image_addition_v1();

-- Exact retained family, including unattached children for cancellation/deletion.
CREATE FUNCTION listing_publication_private.managed_image_family_v1(p_parent uuid)
RETURNS TABLE(attempt_id uuid) LANGUAGE sql STABLE SET search_path=pg_catalog,pg_temp AS $f$
 SELECT p_parent UNION ALL
 SELECT a.attempt_id FROM listing_publication_private.managed_image_additions_v1 a WHERE a.parent_attempt_id=p_parent;
$f$;

-- Every attached origin persists after retirement and parent deletion. No source
-- ordinal or URL is reused. Pending children are not public gallery members.
CREATE FUNCTION listing_publication_private.managed_image_origins_v1(p_parent uuid)
RETURNS TABLE(parent_attempt_id uuid,media_attempt_id uuid,slot_id uuid,media_ordinal integer,
 ordinal integer,canonical_url text,attached_ready_id uuid)
LANGUAGE sql STABLE SET search_path=pg_catalog,pg_temp AS $f$
 SELECT p_parent,s.attempt_id,s.id,s.ordinal,s.ordinal,
  '/api/v2/listing-media/'||s.attempt_id::text||'/'||s.ordinal::text,NULL::uuid
 FROM listing_publication_private.slots s WHERE s.attempt_id=p_parent
 UNION ALL
 SELECT a.parent_attempt_id,a.attempt_id,s.id,s.ordinal,a.gallery_ordinal,
  '/api/v2/listing-media/'||a.attempt_id::text||'/'||s.ordinal::text,a.ready_id
 FROM listing_publication_private.managed_image_additions_v1 a
 JOIN listing_publication_private.slots s ON s.attempt_id=a.attempt_id AND s.ordinal=0
 WHERE a.parent_attempt_id=p_parent AND a.attached_at IS NOT NULL;
$f$;

CREATE FUNCTION listing_publication_private.managed_image_root_v1(p_origin uuid)
RETURNS uuid LANGUAGE sql STABLE SET search_path=pg_catalog,pg_temp AS $f$
 SELECT p.attempt_id FROM listing_publication_private.publications p WHERE p.attempt_id=p_origin
 UNION ALL SELECT a.parent_attempt_id FROM listing_publication_private.managed_image_additions_v1 a
 WHERE a.attempt_id=p_origin AND a.attached_at IS NOT NULL;
$f$;

CREATE FUNCTION listing_publication_private.managed_image_addition_receipt_v1(p_child uuid)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',1,'listing_id',p.listing_id::text,'attempt_id',b.parent_attempt_id,
  'addition_attempt_id',a.id,'request_key',a.request_key,'actor_user_id',a.actor_user_id,'identity_id',a.identity_id,
  'slot_id',s.id,'ready_id',b.ready_id,'ordinal',b.gallery_ordinal,'media_attempt_id',a.id,'media_ordinal',s.ordinal,
  'url','/api/v2/listing-media/'||a.id::text||'/0','attached_at',
   to_char(b.attached_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'attached_revision',b.attached_revision::text,'was_primary',b.was_primary)
 FROM listing_publication_private.managed_image_additions_v1 b
 JOIN listing_publication_private.attempts a ON a.id=b.attempt_id
 JOIN listing_publication_private.publications p ON p.attempt_id=b.parent_attempt_id
 JOIN listing_publication_private.slots s ON s.attempt_id=a.id AND s.ordinal=0
 WHERE a.id=p_child AND b.attached_at IS NOT NULL;
$f$;
