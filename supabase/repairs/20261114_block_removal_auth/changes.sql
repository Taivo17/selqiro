-- COMPONENT 01_legacy_block_guard.sql
-- Keep the exact legacy create-only behavior. Removal requires the existing
-- public.set_my_provider_control_v1 blocked_account row-CAS contract.
CREATE OR REPLACE FUNCTION messaging_private_v2.set_block(p_user uuid,p_identity uuid,p_conversation bigint,p_blocked boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c public.conversations%ROWTYPE;peer_u uuid;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_user,p_identity);
 c:=messaging_private_v2.require_thread(p_conversation,p_user,p_identity);
 IF p_blocked IS NULL THEN RAISE EXCEPTION 'message_input' USING ERRCODE='22023'; END IF;
 IF NOT p_blocked THEN
  RAISE EXCEPTION 'message_block_removal_version_required' USING ERRCODE='42501';
 END IF;
 peer_u:=CASE WHEN c.buyer_id=p_user THEN c.seller_id ELSE c.buyer_id END;
 LOCK TABLE public.user_blocks IN SHARE ROW EXCLUSIVE MODE;
 INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES(p_user,peer_u) ON CONFLICT(blocker_id,blocked_id) DO NOTHING;
END $f$;

-- COMPONENT 02_browser_permissions.sql
-- A browser may create its own account pair, but cannot supply/rewrite a CAS
-- generation, reset its sequence, or remove rows outside the existing setter.
-- Explicit column revokes also cover grants that table-level REVOKE cannot undo.
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER ON TABLE public.user_blocks FROM PUBLIC,anon,authenticated;
REVOKE INSERT(id,blocker_id,blocked_id,created_at),UPDATE(id,blocker_id,blocked_id,created_at)
 ON TABLE public.user_blocks FROM PUBLIC,anon,authenticated;
GRANT INSERT(blocker_id,blocked_id) ON TABLE public.user_blocks TO authenticated;
REVOKE UPDATE ON SEQUENCE public.user_blocks_id_seq FROM PUBLIC,anon,authenticated;

-- COMPONENT 03_cas_delete_authority.sql
-- The table lock in apply.sql drains writers already holding a table lock.
-- Calls which reach DELETE later, including an already-running old definer,
-- must pass this invoker trigger under the narrowly authorized writer role.
CREATE ROLE selqiro_block_removal_writer_v1 NOLOGIN NOINHERIT NOSUPERUSER
 NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT selqiro_block_removal_writer_v1 TO postgres WITH INHERIT FALSE;
GRANT selqiro_block_removal_writer_v1 TO postgres WITH SET TRUE;
GRANT USAGE ON SCHEMA public,provider_controls_private TO selqiro_block_removal_writer_v1;
-- Hosted postgres can call auth.uid(), but cannot grant access to the managed
-- Auth schema. Keep its owner and ACL untouched. This private bridge returns
-- only the existing Auth helper's current actor; it accepts no identity input.
CREATE FUNCTION provider_controls_private.current_block_actor_v1() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT auth.uid()
$f$;
REVOKE ALL ON FUNCTION provider_controls_private.current_block_actor_v1()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION provider_controls_private.current_block_actor_v1()
 TO selqiro_block_removal_writer_v1;
GRANT SELECT,DELETE ON TABLE public.user_blocks TO selqiro_block_removal_writer_v1;
CREATE POLICY block_removal_own_read_v1 ON public.user_blocks FOR SELECT
 TO selqiro_block_removal_writer_v1 USING (blocker_id=provider_controls_private.current_block_actor_v1());
CREATE POLICY block_removal_own_delete_v1 ON public.user_blocks FOR DELETE
 TO selqiro_block_removal_writer_v1 USING (blocker_id=provider_controls_private.current_block_actor_v1());

CREATE FUNCTION provider_controls_private.remove_account_block_v1(p_actor uuid,p_peer uuid,
 p_id bigint,p_created_at timestamptz) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
BEGIN
 IF p_actor IS NULL OR p_peer IS NULL OR p_actor=p_peer OR p_id IS NULL OR p_id<=0
 OR p_created_at IS NULL OR NOT isfinite(p_created_at)
 OR provider_controls_private.current_block_actor_v1() IS DISTINCT FROM p_actor THEN
  RAISE EXCEPTION 'provider_control_unavailable' USING ERRCODE='42501';
 END IF;
 DELETE FROM public.user_blocks WHERE id=p_id AND blocker_id=p_actor
  AND blocked_id=p_peer AND created_at=p_created_at;
 IF NOT FOUND THEN RAISE EXCEPTION 'provider_control_conflict' USING ERRCODE='40001'; END IF;
 RETURN true;
END $f$;
REVOKE ALL ON FUNCTION provider_controls_private.remove_account_block_v1(uuid,uuid,bigint,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
-- These installation-only privileges are removed before the transaction commits.
GRANT CREATE ON SCHEMA provider_controls_private TO selqiro_block_removal_writer_v1;
ALTER FUNCTION provider_controls_private.remove_account_block_v1(uuid,uuid,bigint,timestamptz)
 OWNER TO selqiro_block_removal_writer_v1;
-- ALTER OWNER transfers owner ACL entries. Grant to the old owner only after
-- transfer, acting briefly as the new owner through installation-only SET.
SET LOCAL ROLE selqiro_block_removal_writer_v1;
GRANT EXECUTE ON FUNCTION provider_controls_private.remove_account_block_v1(uuid,uuid,bigint,timestamptz) TO postgres;
RESET ROLE;
REVOKE CREATE ON SCHEMA provider_controls_private FROM selqiro_block_removal_writer_v1;
REVOKE selqiro_block_removal_writer_v1 FROM postgres;

CREATE FUNCTION provider_controls_private.guard_account_block_delete_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_user='selqiro_block_removal_writer_v1' THEN
  IF provider_controls_private.current_block_actor_v1()=OLD.blocker_id THEN RETURN OLD; END IF;
 END IF;
 -- Preserve trusted maintenance only with no JWT context at all. An anonymous
 -- or malformed JWT is not a maintenance session. No caller-set bypass flag.
 IF current_user IN('postgres','service_role') AND auth.uid() IS NULL
 AND nullif(current_setting('request.jwt.claims',true),'') IS NULL
 AND nullif(current_setting('request.jwt.claim.sub',true),'') IS NULL
 AND nullif(current_setting('request.jwt.claim.role',true),'') IS NULL THEN RETURN OLD; END IF;
 RAISE EXCEPTION 'message_block_removal_version_required' USING ERRCODE='42501';
END $f$;
REVOKE ALL ON FUNCTION provider_controls_private.guard_account_block_delete_v1()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION provider_controls_private.guard_account_block_delete_v1()
 TO selqiro_block_removal_writer_v1;
CREATE TRIGGER user_blocks_cas_delete_v1 BEFORE DELETE ON public.user_blocks
 FOR EACH ROW EXECUTE FUNCTION provider_controls_private.guard_account_block_delete_v1();

-- COMPONENT 04_cas_setter.sql
-- Generated from the accepted provider-controls setter; only DELETE delegates.
CREATE OR REPLACE FUNCTION public.set_my_provider_control_v1(p_expected_user_id uuid,p_target_type text,p_target_id text,p_action text,
 p_expected_target_token text,p_expected_revision uuid DEFAULT NULL,p_next_revision uuid DEFAULT NULL,
 p_expected_block_id text DEFAULT NULL,p_expected_block_created_at timestamptz DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE actor uuid:=provider_controls_private.require_actor(p_expected_user_id);target jsonb;state jsonb;
 identity_value uuid;account_value uuid;h provider_controls_private.hidden_providers%ROWTYPE;b public.user_blocks%ROWTYPE;
 read_time timestamptz;changed boolean:=false;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'provider_control_read_committed_required' USING ERRCODE='22023';END IF;
 IF p_action IS NULL OR p_action NOT IN('hide','unhide','block','unblock') OR p_expected_target_token IS NULL
 OR p_expected_target_token!~'^[0-9a-f]{64}$' OR (p_target_type='hidden_provider' AND p_action<>'unhide')
 OR (p_target_type='blocked_account' AND p_action<>'unblock') OR p_target_type='conversation' THEN
  RAISE EXCEPTION 'provider_control_action_invalid' USING ERRCODE='22023';END IF;
 IF p_action IN('hide','unhide') THEN
  IF p_next_revision IS NULL OR p_next_revision='00000000-0000-0000-0000-000000000000'::uuid
  OR p_next_revision=p_expected_revision OR p_expected_block_id IS NOT NULL OR p_expected_block_created_at IS NOT NULL THEN
   RAISE EXCEPTION 'provider_control_revision_invalid' USING ERRCODE='22023';END IF;
 ELSE
  IF p_expected_revision IS NOT NULL OR p_next_revision IS NOT NULL
  OR ((p_expected_block_id IS NULL)<>(p_expected_block_created_at IS NULL))
  OR (p_expected_block_created_at IS NOT NULL AND NOT isfinite(p_expected_block_created_at)) THEN
   RAISE EXCEPTION 'provider_control_block_input_invalid' USING ERRCODE='22023';END IF;
  IF p_expected_block_id IS NOT NULL THEN PERFORM provider_controls_private.validate_target('blocked_account',p_expected_block_id);END IF;
  IF p_action='unblock' AND p_expected_block_id IS NULL THEN
   RAISE EXCEPTION 'provider_control_block_input_invalid' USING ERRCODE='22023';END IF;
 END IF;
 PERFORM provider_controls_private.lock_target(actor,p_target_type,p_target_id);
 -- A bounded table lock is the existing account-block serialization contract.
 IF p_action IN('block','unblock') THEN LOCK TABLE public.user_blocks IN SHARE ROW EXCLUSIVE MODE;
 ELSE LOCK TABLE public.user_blocks IN SHARE MODE;END IF;
 target:=provider_controls_private.resolve_target(actor,p_target_type,p_target_id);
 IF target IS NULL THEN RAISE EXCEPTION 'provider_control_unavailable' USING ERRCODE='42501';END IF;
 IF target->>'target_token' IS DISTINCT FROM p_expected_target_token THEN
  RAISE EXCEPTION 'provider_control_target_conflict' USING ERRCODE='40001';END IF;
 identity_value:=(target->>'identity_id')::uuid;account_value:=(target->>'account_id')::uuid;
 IF p_action IN('hide','unhide') THEN
  IF identity_value IS NULL THEN RAISE EXCEPTION 'provider_control_unavailable' USING ERRCODE='42501';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('selqiro-provider-control:'||actor::text||':'||identity_value::text,0));
  SELECT * INTO h FROM provider_controls_private.hidden_providers WHERE viewer_user_id=actor AND provider_identity_id=identity_value FOR UPDATE;
  read_time:=clock_timestamp();
  state:=provider_controls_private.snapshot(actor,p_target_type,p_target_id,target,read_time);
  IF p_action='hide' AND NOT (state->>'can_hide')::boolean THEN
   RAISE EXCEPTION 'provider_control_unavailable' USING ERRCODE='42501';END IF;
  -- Exact replay never restarts the clock. A new generation requires its own CAS.
  IF h.revision=p_next_revision AND ((p_action='hide' AND h.hidden_until IS NOT NULL) OR (p_action='unhide' AND h.hidden_until IS NULL)) THEN NULL;
  ELSE
   IF h.revision IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'provider_control_conflict' USING ERRCODE='40001';END IF;
   IF (p_action='hide' AND NOT coalesce(h.hidden_until>read_time,false)) OR (p_action='unhide' AND h.hidden_until IS NOT NULL) THEN
    INSERT INTO provider_controls_private.hidden_providers(viewer_user_id,provider_identity_id,revision,hidden_until)
    VALUES(actor,identity_value,p_next_revision,CASE WHEN p_action='hide' THEN read_time+interval '24 hours' END)
    ON CONFLICT(viewer_user_id,provider_identity_id) DO UPDATE SET revision=EXCLUDED.revision,hidden_until=EXCLUDED.hidden_until;
    changed:=true;
   END IF;
  END IF;
 ELSE
  read_time:=clock_timestamp();state:=provider_controls_private.snapshot(actor,p_target_type,p_target_id,target,read_time);
  IF NOT (state->>'can_block')::boolean THEN RAISE EXCEPTION 'provider_control_unavailable' USING ERRCODE='42501';END IF;
  SELECT * INTO b FROM public.user_blocks WHERE blocker_id=actor AND blocked_id=account_value;
  IF p_action='block' THEN
   IF b.id IS NULL AND p_expected_block_id IS NOT NULL THEN RAISE EXCEPTION 'provider_control_conflict' USING ERRCODE='40001';END IF;
   IF b.id IS NOT NULL AND p_expected_block_id IS NOT NULL
   AND (b.id::text<>p_expected_block_id OR b.created_at IS DISTINCT FROM p_expected_block_created_at) THEN
    RAISE EXCEPTION 'provider_control_conflict' USING ERRCODE='40001';END IF;
   IF b.id IS NULL THEN INSERT INTO public.user_blocks(blocker_id,blocked_id,created_at) VALUES(actor,account_value,read_time);changed:=true;END IF;
  ELSE
   IF b.id IS NULL OR b.id::text<>p_expected_block_id OR b.created_at IS DISTINCT FROM p_expected_block_created_at THEN
    RAISE EXCEPTION 'provider_control_conflict' USING ERRCODE='40001';END IF;
   changed:=provider_controls_private.remove_account_block_v1(actor,account_value,b.id,p_expected_block_created_at);
  END IF;
 END IF;
 RETURN provider_controls_private.snapshot(actor,p_target_type,p_target_id,target,read_time)||jsonb_build_object('action',p_action,'changed',changed);
END $f$;
REVOKE ALL ON FUNCTION public.set_my_provider_control_v1(uuid,text,text,text,text,uuid,uuid,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.set_my_provider_control_v1(uuid,text,text,text,text,uuid,uuid,text,timestamptz) TO authenticated;
