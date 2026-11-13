CREATE FUNCTION public.set_my_provider_control_v1(p_expected_user_id uuid,p_target_type text,p_target_id text,p_action text,
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
   DELETE FROM public.user_blocks WHERE id=b.id AND blocker_id=actor AND blocked_id=account_value AND created_at=p_expected_block_created_at;
   changed:=FOUND;
  END IF;
 END IF;
 RETURN provider_controls_private.snapshot(actor,p_target_type,p_target_id,target,read_time)||jsonb_build_object('action',p_action,'changed',changed);
END $f$;
REVOKE ALL ON FUNCTION public.set_my_provider_control_v1(uuid,text,text,text,text,uuid,uuid,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.set_my_provider_control_v1(uuid,text,text,text,text,uuid,uuid,text,timestamptz) TO authenticated;
