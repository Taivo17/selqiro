-- ASUKOHT-1 only. Wrapped by apply.sql's pinned before/after transaction.
-- Existing profile RPCs, public readers, old coordinates and offers are unchanged.
CREATE SCHEMA profile_location_private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA profile_location_private FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION profile_location_private.valid_location(p_location jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $location_valid$
DECLARE field_name text; field_value text;
BEGIN
 IF p_location IS NULL OR jsonb_typeof(p_location) IS DISTINCT FROM 'object'
  OR (SELECT count(*) FROM jsonb_object_keys(p_location))<>10
  OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_location) k WHERE k NOT IN
   ('country_code','country_name','place_name','region_name','latitude','longitude','precision','source','source_id','source_kind')) THEN RETURN false; END IF;
 FOR field_name IN SELECT unnest(ARRAY['country_code','country_name','place_name','region_name','precision','source','source_id','source_kind']) LOOP
  IF jsonb_typeof(p_location->field_name) IS DISTINCT FROM 'string' THEN RETURN false; END IF;
  field_value := p_location->>field_name;
  IF field_value IS DISTINCT FROM btrim(field_value) OR field_value ~ '[[:cntrl:]]'
   OR field_value ~ U&'[\0080-\009F\2028\2029]' THEN RETURN false; END IF;
 END LOOP;
 IF p_location->>'country_code' <> ALL(ARRAY['AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW'])
  OR char_length(p_location->>'country_name') NOT BETWEEN 1 AND 100
  OR char_length(p_location->>'place_name') NOT BETWEEN 1 AND 120
  OR char_length(p_location->>'region_name')>160
  OR char_length(p_location->>'source_id') NOT BETWEEN 1 AND 2048
  OR p_location->>'source' IS DISTINCT FROM 'geoapify'
  OR p_location->>'source_kind' NOT IN ('city','county','state')
  OR p_location->>'precision' IS DISTINCT FROM (CASE WHEN p_location->>'source_kind'='city' THEN 'locality' ELSE 'region' END)
  OR jsonb_typeof(p_location->'latitude') IS DISTINCT FROM 'number'
  OR jsonb_typeof(p_location->'longitude') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
 RETURN (p_location->>'latitude')::numeric BETWEEN -90 AND 90
  AND (p_location->>'longitude')::numeric BETWEEN -180 AND 180;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN false;
END;
$location_valid$;
REVOKE ALL ON FUNCTION profile_location_private.valid_location(jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE profile_location_private.profile_locations (
 identity_id uuid PRIMARY KEY REFERENCES public.identities(id) ON DELETE CASCADE,
 location jsonb NOT NULL CHECK(profile_location_private.valid_location(location)),
 selected_at timestamptz NOT NULL DEFAULT clock_timestamp() CHECK(isfinite(selected_at))
);
CREATE TABLE profile_location_private.selections (
 selection_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE CASCADE,
 location jsonb NOT NULL CHECK(profile_location_private.valid_location(location)),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp() CHECK(isfinite(created_at)),
 expires_at timestamptz NOT NULL CHECK(isfinite(expires_at) AND expires_at>created_at AND expires_at<=created_at+interval '15 minutes')
);
CREATE INDEX profile_location_selections_owner_expiry ON profile_location_private.selections(user_id,expires_at);
CREATE TABLE profile_location_private.lookup_budget (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 attempts timestamptz[] NOT NULL DEFAULT ARRAY[]::timestamptz[] CHECK(cardinality(attempts)<=3000)
);
CREATE TABLE profile_location_private.actor_lookup_budget (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 attempts timestamptz[] NOT NULL DEFAULT ARRAY[]::timestamptz[] CHECK(cardinality(attempts)<=60)
);
ALTER TABLE profile_location_private.profile_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_location_private.selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_location_private.lookup_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_location_private.actor_lookup_budget ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE profile_location_private.profile_locations,profile_location_private.selections,
 profile_location_private.lookup_budget,profile_location_private.actor_lookup_budget FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO profile_location_private.lookup_budget(singleton) VALUES(true);

CREATE FUNCTION profile_location_private.require_account(p_user uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog SET lock_timeout='2s' AS $location_account$
DECLARE deleted_value timestamptz; banned_value timestamptz; created_value timestamptz; state_value text; revision_value bigint;
BEGIN
 IF p_user IS NULL THEN RAISE EXCEPTION 'PROFILE_EDITOR_AUTH_CHANGED' USING ERRCODE='42501'; END IF;
 -- Lock account availability before the profile/identity/business locks. A
 -- future closure must finish its Auth/state-only transition before content work.
 SELECT u.deleted_at,u.banned_until,u.created_at INTO deleted_value,banned_value,created_value
  FROM auth.users u WHERE u.id=p_user FOR SHARE;
 IF NOT FOUND OR deleted_value IS NOT NULL OR (banned_value IS NOT NULL AND banned_value>statement_timestamp())
  OR (created_value IS NOT NULL AND NOT isfinite(created_value)) THEN
  RAISE EXCEPTION 'PROFILE_EDITOR_FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT s.state,s.revision INTO state_value,revision_value FROM account_lifecycle_private.account_states s
  WHERE s.account_user_id=p_user FOR SHARE;
 IF NOT FOUND OR state_value IS DISTINCT FROM 'active' OR revision_value IS NULL OR revision_value<=0 THEN
  RAISE EXCEPTION 'PROFILE_EDITOR_FORBIDDEN' USING ERRCODE='42501'; END IF;
END;
$location_account$;
REVOKE ALL ON FUNCTION profile_location_private.require_account(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION profile_location_private.lock_owner(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS public.identities LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog SET lock_timeout='2s' AS $location_owner$
DECLARE v_active uuid; v_identity public.identities%ROWTYPE; v_business public.business_accounts%ROWTYPE; v_member public.business_members%ROWTYPE;
BEGIN
 -- Trusted caller only. Browser entry points first bind auth.uid(); service-only
 -- preparation is called after server Auth.getUser and still rechecks DB ownership.
 PERFORM profile_location_private.require_account(p_expected_user_id);
 SELECT p.active_identity_id INTO v_active FROM public.profiles p WHERE p.id=p_expected_user_id FOR UPDATE;
 IF NOT FOUND OR p_expected_identity_id IS NULL OR v_active IS DISTINCT FROM p_expected_identity_id THEN
  RAISE EXCEPTION 'PROFILE_EDITOR_ACTOR_CHANGED' USING ERRCODE='42501'; END IF;
 SELECT i.* INTO v_identity FROM public.identities i WHERE i.id=v_active FOR UPDATE;
 IF NOT FOUND OR v_identity.status IS DISTINCT FROM 'active' THEN
  RAISE EXCEPTION 'PROFILE_EDITOR_FORBIDDEN' USING ERRCODE='42501'; END IF;
 IF v_identity.type='private' THEN
  IF v_identity.user_id IS DISTINCT FROM p_expected_user_id OR v_identity.business_account_id IS NOT NULL THEN
   RAISE EXCEPTION 'PROFILE_EDITOR_FORBIDDEN' USING ERRCODE='42501'; END IF;
 ELSIF v_identity.type='business' THEN
  SELECT b.* INTO v_business FROM public.business_accounts b WHERE b.id=v_identity.business_account_id FOR UPDATE;
  IF NOT FOUND OR v_business.owner_user_id IS DISTINCT FROM p_expected_user_id OR v_business.status IS DISTINCT FROM 'active' THEN
   RAISE EXCEPTION 'PROFILE_EDITOR_FORBIDDEN' USING ERRCODE='42501'; END IF;
  SELECT m.* INTO v_member FROM public.business_members m
   WHERE m.business_account_id=v_business.id AND m.user_id=p_expected_user_id FOR UPDATE;
  IF NOT FOUND OR v_member.status IS DISTINCT FROM 'active' THEN
   RAISE EXCEPTION 'PROFILE_EDITOR_FORBIDDEN' USING ERRCODE='42501'; END IF;
 ELSE RAISE EXCEPTION 'PROFILE_EDITOR_FORBIDDEN' USING ERRCODE='42501'; END IF;
 RETURN v_identity;
END;
$location_owner$;
REVOKE ALL ON FUNCTION profile_location_private.lock_owner(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION profile_location_private.invalidate_profile_location()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $location_invalidate$
BEGIN
 DELETE FROM profile_location_private.profile_locations WHERE identity_id=NEW.identity_id;
 RETURN NEW;
END;
$location_invalidate$;
REVOKE ALL ON FUNCTION profile_location_private.invalidate_profile_location() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER profile_location_text_changed_v1 AFTER UPDATE OF country,city ON public.identity_profiles
 FOR EACH ROW WHEN (OLD.country IS DISTINCT FROM NEW.country OR OLD.city IS DISTINCT FROM NEW.city)
 EXECUTE FUNCTION profile_location_private.invalidate_profile_location();

CREATE FUNCTION public.prepare_profile_location_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_location jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog SET lock_timeout='2s' AS $location_prepare$
DECLARE chosen uuid; current_time_value timestamptz;
BEGIN
 PERFORM profile_location_private.lock_owner(p_expected_user_id,p_expected_identity_id);
 IF NOT profile_location_private.valid_location(p_location) THEN
  RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023'; END IF;
 current_time_value:=clock_timestamp();
 DELETE FROM profile_location_private.selections WHERE user_id=p_expected_user_id AND expires_at<=current_time_value;
 IF (SELECT count(*) FROM profile_location_private.selections WHERE user_id=p_expected_user_id)>=20 THEN
  RAISE EXCEPTION 'LOCATION_RATE_LIMITED' USING ERRCODE='54000'; END IF;
 INSERT INTO profile_location_private.selections(user_id,identity_id,location,created_at,expires_at)
  VALUES(p_expected_user_id,p_expected_identity_id,p_location,current_time_value,current_time_value+interval '15 minutes')
  RETURNING selection_id INTO chosen;
 RETURN jsonb_build_object('selection_id',chosen);
END;
$location_prepare$;
REVOKE ALL ON FUNCTION public.prepare_profile_location_v1(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_profile_location_v1(uuid,uuid,jsonb) TO service_role;

CREATE FUNCTION public.get_my_profile_editor_v2(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog SET lock_timeout='2s' AS $location_read$
DECLARE v_identity public.identities%ROWTYPE; v_profile public.identity_profiles%ROWTYPE; v_location jsonb;
BEGIN
 IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_expected_user_id THEN
  RAISE EXCEPTION 'PROFILE_EDITOR_AUTH_CHANGED' USING ERRCODE='42501'; END IF;
 v_identity:=profile_location_private.lock_owner(p_expected_user_id,p_expected_identity_id);
 SELECT p.* INTO v_profile FROM public.identity_profiles p WHERE p.identity_id=v_identity.id FOR SHARE;
 SELECT l.location INTO v_location FROM profile_location_private.profile_locations l WHERE l.identity_id=v_identity.id
  AND l.location->>'country_name'=v_profile.country AND l.location->>'place_name'=v_profile.city;
 RETURN jsonb_build_object('profile',profile_editor_private.snapshot(p_expected_user_id,v_identity,v_profile),'location',v_location);
END;
$location_read$;
REVOKE ALL ON FUNCTION public.get_my_profile_editor_v2(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_profile_editor_v2(uuid,uuid) TO authenticated;

CREATE FUNCTION public.save_my_profile_editor_v2(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_expected_revision uuid,p_patch jsonb,p_location_command jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog SET lock_timeout='2s' AS $location_save$
DECLARE v_profile public.identity_profiles%ROWTYPE; v_identity public.identities%ROWTYPE; v_exists boolean;
 v_action text; v_selection_id uuid; v_selection profile_location_private.selections%ROWTYPE; v_location jsonb; v_saved jsonb;
BEGIN
 IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_expected_user_id THEN
  RAISE EXCEPTION 'PROFILE_EDITOR_AUTH_CHANGED' USING ERRCODE='42501'; END IF;
 v_identity:=profile_location_private.lock_owner(p_expected_user_id,p_expected_identity_id);
 SELECT p.* INTO v_profile FROM public.identity_profiles p WHERE p.identity_id=v_identity.id FOR UPDATE;
 v_exists:=FOUND;
 IF (v_exists AND v_profile.profile_revision IS DISTINCT FROM p_expected_revision)
  OR (NOT v_exists AND p_expected_revision IS NOT NULL) THEN
  RAISE EXCEPTION 'PROFILE_EDITOR_CONFLICT' USING ERRCODE='40001'; END IF;
 IF p_location_command IS NULL OR jsonb_typeof(p_location_command) IS DISTINCT FROM 'object'
  OR jsonb_typeof(p_location_command->'action') IS DISTINCT FROM 'string'
  OR p_patch IS NULL OR jsonb_typeof(p_patch) IS DISTINCT FROM 'object'
  OR jsonb_typeof(p_patch->'country') IS DISTINCT FROM 'string' OR jsonb_typeof(p_patch->'city') IS DISTINCT FROM 'string' THEN
  RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023'; END IF;
 v_action:=p_location_command->>'action';
 IF v_action IN ('keep','clear') THEN
  IF (SELECT count(*) FROM jsonb_object_keys(p_location_command))<>1 THEN
   RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023'; END IF;
  IF v_action='keep' AND (btrim(p_patch->>'country') IS DISTINCT FROM coalesce(v_profile.country,'')
    OR btrim(p_patch->>'city') IS DISTINCT FROM coalesce(v_profile.city,'')) THEN
   RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023'; END IF;
  IF v_action='clear' AND (btrim(p_patch->>'country')<>'' OR btrim(p_patch->>'city')<>'') THEN
   RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023'; END IF;
 ELSIF v_action='select' THEN
  IF (SELECT count(*) FROM jsonb_object_keys(p_location_command))<>2
   OR jsonb_typeof(p_location_command->'selection_id') IS DISTINCT FROM 'string'
   OR p_location_command->>'selection_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
   RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023'; END IF;
  v_selection_id:=(p_location_command->>'selection_id')::uuid;
  SELECT * INTO v_selection FROM profile_location_private.selections WHERE selection_id=v_selection_id FOR UPDATE;
  IF NOT FOUND OR v_selection.expires_at<=clock_timestamp() THEN
   RAISE EXCEPTION 'LOCATION_SELECTION_EXPIRED' USING ERRCODE='22023'; END IF;
  IF v_selection.user_id IS DISTINCT FROM p_expected_user_id OR v_selection.identity_id IS DISTINCT FROM p_expected_identity_id THEN
   RAISE EXCEPTION 'PROFILE_EDITOR_FORBIDDEN' USING ERRCODE='42501'; END IF;
  v_location:=v_selection.location;
  IF btrim(p_patch->>'country') IS DISTINCT FROM v_location->>'country_name'
   OR btrim(p_patch->>'city') IS DISTINCT FROM v_location->>'place_name' THEN
   RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023'; END IF;
 ELSE RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023'; END IF;
 -- This unchanged v1 function remains the sole authority for the seven text
 -- fields, private/exact rules, optimistic revision, slug and name updates.
 v_saved:=public.save_my_profile_editor_v1(p_expected_user_id,p_expected_identity_id,p_expected_revision,p_patch);
 IF v_action='clear' THEN
  DELETE FROM profile_location_private.profile_locations WHERE identity_id=p_expected_identity_id;
 ELSIF v_action='select' THEN
  INSERT INTO profile_location_private.profile_locations(identity_id,location,selected_at)
   VALUES(p_expected_identity_id,v_location,clock_timestamp()) ON CONFLICT(identity_id)
   DO UPDATE SET location=EXCLUDED.location,selected_at=EXCLUDED.selected_at;
  DELETE FROM profile_location_private.selections WHERE selection_id=v_selection_id;
 END IF;
 SELECT l.location INTO v_location FROM profile_location_private.profile_locations l WHERE l.identity_id=p_expected_identity_id
  AND l.location->>'country_name'=v_saved->>'country' AND l.location->>'place_name'=v_saved->>'city';
 RETURN jsonb_build_object('profile',v_saved,'location',v_location);
END;
$location_save$;
REVOKE ALL ON FUNCTION public.save_my_profile_editor_v2(uuid,uuid,uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_my_profile_editor_v2(uuid,uuid,uuid,jsonb,jsonb) TO authenticated;

CREATE FUNCTION public.reserve_profile_location_lookup_v1(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog SET lock_timeout='2s' AS $location_budget$
DECLARE v_global timestamptz[]; v_actor timestamptz[]; v_now timestamptz; next_time_value timestamptz; wait_seconds integer;
BEGIN
 PERFORM profile_location_private.lock_owner(p_expected_user_id,p_expected_identity_id);
 SELECT attempts INTO v_global FROM profile_location_private.lookup_budget WHERE singleton FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_EDITOR_FORBIDDEN' USING ERRCODE='42501'; END IF;
 INSERT INTO profile_location_private.actor_lookup_budget(user_id) VALUES(p_expected_user_id) ON CONFLICT(user_id) DO NOTHING;
 SELECT attempts INTO v_actor FROM profile_location_private.actor_lookup_budget WHERE user_id=p_expected_user_id FOR UPDATE;
 v_now:=clock_timestamp();
 SELECT coalesce(array_agg(t ORDER BY t),ARRAY[]::timestamptz[]) INTO v_global FROM unnest(v_global) t WHERE t>v_now-interval '24 hours';
 SELECT coalesce(array_agg(t ORDER BY t),ARRAY[]::timestamptz[]) INTO v_actor FROM unnest(v_actor) t WHERE t>v_now-interval '1 hour';
 next_time_value:=v_now;
 IF cardinality(v_global)>0 THEN next_time_value:=greatest(next_time_value,v_global[cardinality(v_global)]+interval '250 milliseconds'); END IF;
 IF cardinality(v_global)>=3000 THEN next_time_value:=greatest(next_time_value,v_global[1]+interval '24 hours'); END IF;
 IF cardinality(v_actor)>=60 THEN next_time_value:=greatest(next_time_value,v_actor[1]+interval '1 hour'); END IF;
 IF next_time_value>v_now THEN
  wait_seconds:=greatest(1,ceil(extract(epoch FROM next_time_value-v_now))::integer);
  RETURN jsonb_build_object('allowed',false,'retry_after_seconds',least(wait_seconds,86400));
 END IF;
 UPDATE profile_location_private.lookup_budget SET attempts=array_append(v_global,v_now) WHERE singleton;
 UPDATE profile_location_private.actor_lookup_budget SET attempts=array_append(v_actor,v_now) WHERE user_id=p_expected_user_id;
 RETURN jsonb_build_object('allowed',true,'retry_after_seconds',0);
END;
$location_budget$;
REVOKE ALL ON FUNCTION public.reserve_profile_location_lookup_v1(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.reserve_profile_location_lookup_v1(uuid,uuid) TO service_role;

-- Notification is delivered only after the mutation transaction commits.
NOTIFY pgrst, 'reload schema';
