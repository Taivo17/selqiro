-- The table lock in apply.sql drains writers already holding a table lock.
-- Calls which reach DELETE later, including an already-running old definer,
-- must pass this invoker trigger under the narrowly authorized writer role.
CREATE ROLE selqiro_block_removal_writer_v1 NOLOGIN NOINHERIT NOSUPERUSER
 NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT selqiro_block_removal_writer_v1 TO postgres WITH INHERIT FALSE;
GRANT selqiro_block_removal_writer_v1 TO postgres WITH SET TRUE;
GRANT USAGE ON SCHEMA public,auth,provider_controls_private TO selqiro_block_removal_writer_v1;
GRANT EXECUTE ON FUNCTION auth.uid() TO selqiro_block_removal_writer_v1;
GRANT SELECT,DELETE ON TABLE public.user_blocks TO selqiro_block_removal_writer_v1;
CREATE POLICY block_removal_own_read_v1 ON public.user_blocks FOR SELECT
 TO selqiro_block_removal_writer_v1 USING (blocker_id=auth.uid());
CREATE POLICY block_removal_own_delete_v1 ON public.user_blocks FOR DELETE
 TO selqiro_block_removal_writer_v1 USING (blocker_id=auth.uid());

CREATE FUNCTION provider_controls_private.remove_account_block_v1(p_actor uuid,p_peer uuid,
 p_id bigint,p_created_at timestamptz) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
BEGIN
 IF p_actor IS NULL OR p_peer IS NULL OR p_actor=p_peer OR p_id IS NULL OR p_id<=0
 OR p_created_at IS NULL OR NOT isfinite(p_created_at) OR auth.uid() IS DISTINCT FROM p_actor THEN
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
 IF current_user='selqiro_block_removal_writer_v1' AND auth.uid() IS NOT NULL
 AND auth.uid()=OLD.blocker_id THEN RETURN OLD; END IF;
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
