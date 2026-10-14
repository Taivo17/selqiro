CREATE FUNCTION public.listing_final_guard_state_v1(p_listing bigint) RETURNS text LANGUAGE sql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT state FROM listing_publication_private.publications WHERE listing_id=p_listing;
$f$;
REVOKE ALL ON FUNCTION public.listing_final_guard_state_v1(bigint) FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION listing_publication_private.protect_attempt() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'publication_receipt_retained' USING ERRCODE='55000'; END IF;
 IF current_user='selqiro_listing_final_writer_v1' AND OLD.state='open' AND NEW.state='published'
  AND NEW.payload IS NULL AND NEW.closed_at IS NOT NULL
  AND (to_jsonb(NEW)-ARRAY['state','payload','closed_at'])=(to_jsonb(OLD)-ARRAY['state','payload','closed_at'])
  AND EXISTS(SELECT 1 FROM listing_publication_private.publications p JOIN public.listings l ON l.id=p.listing_id
   WHERE p.attempt_id=OLD.id AND p.state='published' AND l.identity_id=OLD.identity_id AND l.created_by_user_id=OLD.actor_user_id)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND o.kind='source' AND (c.object_id IS NULL OR c.reason<>'published_source' OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path))
 THEN RETURN NEW; END IF;
 IF current_user='selqiro_listing_final_writer_v1' AND OLD.state='published' AND NEW.state='deleted'
  AND (to_jsonb(NEW)-'state')=(to_jsonb(OLD)-'state')
  AND EXISTS(SELECT 1 FROM listing_publication_private.publications p WHERE p.attempt_id=OLD.id AND p.state='deleting'
   AND NOT EXISTS(SELECT 1 FROM public.listings l WHERE l.id=p.listing_id))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND (c.object_id IS NULL OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path))
 THEN RETURN NEW; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','payload','closed_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','payload','closed_at'])
  OR OLD.state<>'open' OR NEW.state NOT IN('cancelled','expired') OR NEW.payload IS NOT NULL OR NEW.closed_at IS NULL THEN
  RAISE EXCEPTION 'publication_attempt_immutable' USING ERRCODE='55000'; END IF;
 IF EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
  WHERE o.attempt_id=OLD.id AND (c.object_id IS NULL OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path OR c.reason<>NEW.state
   OR c.state<>listing_publication_private.object_cleanup_state(o.id))) THEN
  RAISE EXCEPTION 'publication_cleanup_lineage_required' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END $f$;
CREATE FUNCTION listing_publication_private.guard_managed_listing() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
DECLARE managed text;
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'publication_direct_truncate_forbidden' USING ERRCODE='42501'; END IF;
 managed:=public.listing_final_guard_state_v1(CASE WHEN TG_OP='INSERT' THEN NEW.id ELSE OLD.id END);
 IF managed IS NULL THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='INSERT' THEN RAISE EXCEPTION 'publication_tombstone_retained' USING ERRCODE='42501'; END IF;
 IF TG_OP='DELETE' THEN
  IF current_user<>'selqiro_listing_final_writer_v1' OR managed<>'deleting' THEN
   RAISE EXCEPTION 'publication_terminal_delete_required' USING ERRCODE='42501'; END IF;
  RETURN OLD;
 END IF;
 IF ROW(NEW.id,NEW.identity_id,NEW.user_id,NEW.created_by_user_id) IS DISTINCT FROM ROW(OLD.id,OLD.identity_id,OLD.user_id,OLD.created_by_user_id)
  OR (NEW.image IS DISTINCT FROM OLD.image AND current_user<>'selqiro_listing_final_writer_v1') THEN
  RAISE EXCEPTION 'publication_managed_binding_immutable' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER guard_managed_listing BEFORE INSERT OR UPDATE OR DELETE ON public.listings
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.guard_managed_listing();
CREATE FUNCTION listing_publication_private.guard_managed_image() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'publication_direct_truncate_forbidden' USING ERRCODE='42501'; END IF;
 IF current_user<>'selqiro_listing_final_writer_v1' AND (
 public.listing_final_guard_state_v1(CASE WHEN TG_OP<>'INSERT' THEN OLD.listing_id END) IS NOT NULL OR
 public.listing_final_guard_state_v1(CASE WHEN TG_OP<>'DELETE' THEN NEW.listing_id END) IS NOT NULL) THEN
  RAISE EXCEPTION 'publication_managed_image_immutable' USING ERRCODE='42501'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $f$;
CREATE TRIGGER guard_managed_image BEFORE INSERT OR UPDATE OR DELETE ON public.listing_images
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.guard_managed_image();
CREATE TRIGGER guard_managed_image_truncate BEFORE TRUNCATE ON public.listing_images
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.guard_managed_image();
CREATE OR REPLACE FUNCTION listing_publication_private.protect_cleanup() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'UPDATE' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_cleanup_lineage_retained' USING ERRCODE='55000'; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','work_key','lease_until','try_count','not_before','last_error','deleted_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['state','work_key','lease_until','try_count','not_before','last_error','deleted_at'])
 OR OLD.state IN('deleted','blocked_write_settlement','needs_attention') THEN
  RAISE EXCEPTION 'publication_cleanup_transition_forbidden' USING ERRCODE='55000'; END IF;
 IF NEW.state='in_flight' AND NEW.try_count=OLD.try_count+1 AND NEW.work_key IS NOT NULL
  AND NEW.work_key IS DISTINCT FROM OLD.work_key AND NEW.lease_until>clock_timestamp()
  AND ((OLD.state IN('pending','retry_wait') AND (OLD.not_before IS NULL OR OLD.not_before<=clock_timestamp()))
   OR (OLD.state='in_flight' AND OLD.lease_until<=clock_timestamp())) THEN RETURN NEW; END IF;
 IF OLD.state='in_flight' AND NEW.state IN('deleted','retry_wait','needs_attention')
  AND NEW.work_key=OLD.work_key AND NEW.lease_until=OLD.lease_until AND NEW.try_count=OLD.try_count THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'publication_cleanup_transition_forbidden' USING ERRCODE='55000';
END $f$;
-- All lineage tables keep their original row delete protections; block mass removal too.
CREATE FUNCTION listing_publication_private.no_truncate() RETURNS trigger LANGUAGE plpgsql AS $f$
BEGIN RAISE EXCEPTION 'publication_direct_truncate_forbidden' USING ERRCODE='42501'; END $f$;
CREATE TRIGGER final_attempt_no_truncate BEFORE TRUNCATE ON listing_publication_private.attempts FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.no_truncate();
CREATE TRIGGER final_slots_no_truncate BEFORE TRUNCATE ON listing_publication_private.slots FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.no_truncate();
CREATE TRIGGER final_objects_no_truncate BEFORE TRUNCATE ON listing_publication_private.objects FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.no_truncate();
CREATE TRIGGER final_cleanup_no_truncate BEFORE TRUNCATE ON listing_publication_private.cleanup FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.no_truncate();
