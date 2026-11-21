-- Keep the canonical identity/account conversation route. A personal job goes
-- to that identity's owner, a business job to the existing business owner.
CREATE OR REPLACE FUNCTION jobs_private.contact_snapshot(p_job_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE j public.jobs%ROWTYPE;i public.identities%ROWTYPE;owner_user uuid;
BEGIN
 SELECT * INTO j FROM public.jobs WHERE id=p_job_id FOR SHARE;
 IF NOT FOUND OR NOT jobs_private.is_public(j) THEN
  RAISE EXCEPTION 'job_contact_unavailable' USING ERRCODE='42501';END IF;
 SELECT * INTO i FROM public.identities WHERE id=j.identity_id AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'job_contact_unavailable' USING ERRCODE='42501';END IF;
 IF i.type='private' AND i.business_account_id IS NULL THEN
  owner_user:=i.user_id;
 ELSIF i.type='business' THEN
  SELECT b.owner_user_id INTO owner_user FROM public.business_accounts b
   WHERE b.id=i.business_account_id AND b.status='active' FOR SHARE;
 ELSE RAISE EXCEPTION 'job_contact_unavailable' USING ERRCODE='42501';END IF;
 IF owner_user IS NULL THEN RAISE EXCEPTION 'job_contact_unavailable' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('user_id',owner_user,'identity_id',j.identity_id,
 'card',jsonb_build_object('content_type','job','id',j.id,'title',j.title,'image',NULL,'price',NULL));
END $f$;
