-- The existing actor lock serializes commands and receipt reconciliation for
-- one real account. Receipt + job + policy acceptance commit atomically.
CREATE FUNCTION jobs_private.mutate(p_user uuid,p_identity uuid,p_key uuid,p_operation text,p_request jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE j public.jobs%ROWTYPE;r jobs_private.requests%ROWTYPE;job_id uuid;revision bigint;normalized jsonb;
 fingerprint bytea;reply jsonb;changed boolean:=false;t timestamptz;target timestamptz;expected_deadline timestamptz;
BEGIN
 PERFORM jobs_private.require_actor(p_user,p_identity);PERFORM jobs_private.require_key(p_key);
 IF p_operation IS NULL OR p_operation NOT IN('save','publish','status','renew') OR p_request IS NULL
 OR jsonb_typeof(p_request)<>'object' OR octet_length(p_request::text)>90000 THEN
 RAISE EXCEPTION 'job_command_invalid' USING ERRCODE='22023';END IF;
 fingerprint:=sha256(convert_to(jsonb_build_object('identity',p_identity,'operation',p_operation,'request',p_request)::text,'UTF8'));
 SELECT * INTO r FROM jobs_private.requests WHERE actor_user_id=p_user AND request_key=p_key;
 IF FOUND THEN
  IF r.identity_id IS DISTINCT FROM p_identity OR r.operation IS DISTINCT FROM p_operation
  OR r.request_hash IS DISTINCT FROM fingerprint OR r.request IS DISTINCT FROM p_request THEN
   RAISE EXCEPTION 'job_request_conflict' USING ERRCODE='22023';END IF;
  RETURN r.result;
 END IF;
 job_id:=(p_request->>'job_id')::uuid;
 IF job_id IS NOT NULL THEN
  revision:=jobs_private.require_revision(p_request->>'expected_revision');
  SELECT * INTO j FROM public.jobs WHERE id=job_id AND identity_id=p_identity FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_unavailable' USING ERRCODE='42501';END IF;
  IF j.edit_revision<>revision THEN RAISE EXCEPTION 'job_edit_conflict' USING ERRCODE='40001';END IF;
 ELSIF p_operation<>'save' OR p_request->>'expected_revision' IS NOT NULL THEN
  RAISE EXCEPTION 'job_command_invalid' USING ERRCODE='22023';
 END IF;
 IF p_operation='save' THEN
  normalized:=jobs_private.normalize_content(p_request->'content');
  IF job_id IS NULL OR j.status='draft' THEN
   IF p_request->'policy_snapshot' IS DISTINCT FROM '[]'::jsonb THEN
    RAISE EXCEPTION 'job_draft_policy_invalid' USING ERRCODE='22023';END IF;
  ELSE PERFORM jobs_private.accept_policies(p_user,p_identity,p_request->'policy_snapshot');END IF;
  t:=clock_timestamp();
  IF job_id IS NULL THEN
   INSERT INTO public.jobs(identity_id,created_by_user_id,title,description,category,country_code,city,location_label,
   workplace_type,employment_type,working_time,salary_min,salary_max,salary_currency,salary_period,created_at,updated_at)
   VALUES(p_identity,p_user,normalized->>'title',normalized->>'description',normalized->>'category',normalized->>'countryCode',
   normalized->>'city',normalized->>'locationLabel',normalized->>'workplaceType',normalized->>'employmentType',normalized->>'workingTime',
   (normalized->>'salaryMin')::numeric,(normalized->>'salaryMax')::numeric,normalized->>'salaryCurrency',normalized->>'salaryPeriod',t,t)
   RETURNING * INTO j;changed:=true;
  ELSIF jobs_private.content(j) IS DISTINCT FROM normalized THEN
   UPDATE public.jobs SET title=normalized->>'title',description=normalized->>'description',category=normalized->>'category',
   country_code=normalized->>'countryCode',city=normalized->>'city',location_label=normalized->>'locationLabel',
   workplace_type=normalized->>'workplaceType',employment_type=normalized->>'employmentType',working_time=normalized->>'workingTime',
   salary_min=(normalized->>'salaryMin')::numeric,salary_max=(normalized->>'salaryMax')::numeric,
   salary_currency=normalized->>'salaryCurrency',salary_period=normalized->>'salaryPeriod',edit_revision=edit_revision+1,updated_at=t
   WHERE id=j.id RETURNING * INTO j;changed:=true;
  END IF;
 ELSIF p_operation='publish' THEN
  IF j.status<>'draft' THEN RAISE EXCEPTION 'job_first_publication_required' USING ERRCODE='22023';END IF;
  PERFORM 1 FROM public.identity_profiles WHERE identity_id=p_identity AND nullif(btrim(slug),'') IS NOT NULL FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_public_profile_required' USING ERRCODE='55000';END IF;
  PERFORM jobs_private.accept_policies(p_user,p_identity,p_request->'policy_snapshot');
  t:=clock_timestamp();
  UPDATE public.jobs SET status='published',published_at=t,active_until=jobs_private.calendar_month_after(t),
  updated_at=t,edit_revision=edit_revision+1 WHERE id=j.id RETURNING * INTO j;changed:=true;
 ELSIF p_operation='status' THEN
  IF j.status='draft' OR p_request->>'expected_status' IS NULL OR p_request->>'expected_status' NOT IN('published','paused','closed')
  OR p_request->>'status' IS NULL OR p_request->>'status' NOT IN('published','paused','closed') THEN
   RAISE EXCEPTION 'job_status_invalid' USING ERRCODE='22023';END IF;
  IF j.status IS DISTINCT FROM p_request->>'expected_status' THEN RAISE EXCEPTION 'job_status_conflict' USING ERRCODE='40001';END IF;
  IF p_request->>'status'='published' AND j.active_until<=clock_timestamp() THEN
   RAISE EXCEPTION 'job_renewal_required' USING ERRCODE='22023';END IF;
  changed:=j.status IS DISTINCT FROM p_request->>'status';
  IF changed THEN UPDATE public.jobs SET status=p_request->>'status',edit_revision=edit_revision+1,
   updated_at=clock_timestamp() WHERE id=j.id RETURNING * INTO j;END IF;
 ELSE
  expected_deadline:=(p_request->>'expected_active_until')::timestamptz;
  IF j.status='draft' OR expected_deadline IS NULL OR NOT isfinite(expected_deadline) THEN
   RAISE EXCEPTION 'job_activity_invalid' USING ERRCODE='22023';END IF;
  IF j.active_until IS DISTINCT FROM expected_deadline THEN RAISE EXCEPTION 'job_activity_conflict' USING ERRCODE='40001';END IF;
  t:=clock_timestamp();target:=greatest(j.active_until,jobs_private.calendar_month_after(t));
  changed:=target>j.active_until;
  IF changed THEN UPDATE public.jobs SET active_until=target,last_confirmed_at=t,edit_revision=edit_revision+1
   WHERE id=j.id RETURNING * INTO j;END IF;
 END IF;
 reply:=jsonb_build_object('schema_version',1,'actor_user_id',p_user,'identity_id',p_identity,'request_key',p_key,
 'operation',p_operation,'job',jobs_private.owner_fields(j,p_user),'changed',changed);
 INSERT INTO jobs_private.requests(actor_user_id,request_key,identity_id,operation,request,request_hash,result)
 VALUES(p_user,p_key,p_identity,p_operation,p_request,fingerprint,reply);
 RETURN reply;
END $f$;
CREATE FUNCTION public.save_my_job_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_job_id uuid,p_expected_revision text,p_content jsonb,p_policy_snapshot jsonb)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jobs_private.mutate(p_expected_user_id,p_expected_identity_id,p_request_key,'save',
 jsonb_build_object('job_id',p_job_id,'expected_revision',p_expected_revision,'content',p_content,'policy_snapshot',p_policy_snapshot));
$f$;
CREATE FUNCTION public.publish_my_job_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_job_id uuid,p_expected_revision text,p_policy_snapshot jsonb)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jobs_private.mutate(p_expected_user_id,p_expected_identity_id,p_request_key,'publish',
 jsonb_build_object('job_id',p_job_id,'expected_revision',p_expected_revision,'policy_snapshot',p_policy_snapshot));
$f$;
CREATE FUNCTION public.set_my_job_status_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_job_id uuid,p_expected_revision text,p_expected_status text,p_status text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jobs_private.mutate(p_expected_user_id,p_expected_identity_id,p_request_key,'status',
 jsonb_build_object('job_id',p_job_id,'expected_revision',p_expected_revision,'expected_status',p_expected_status,'status',p_status));
$f$;
CREATE FUNCTION public.renew_my_job_activity_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_job_id uuid,p_expected_revision text,p_expected_active_until timestamptz)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jobs_private.mutate(p_expected_user_id,p_expected_identity_id,p_request_key,'renew',
 jsonb_build_object('job_id',p_job_id,'expected_revision',p_expected_revision,'expected_active_until',p_expected_active_until));
$f$;
