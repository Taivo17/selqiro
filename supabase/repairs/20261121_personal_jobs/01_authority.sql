-- Extend the accepted job actor contract without changing its account lock,
-- expected identity, business membership or request reconciliation rules.
CREATE OR REPLACE FUNCTION jobs_private.require_actor(p_user uuid,p_identity uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE i public.identities%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_actor(p_user,p_identity);
 SELECT * INTO i FROM public.identities WHERE id=p_identity AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'job_identity_unavailable' USING ERRCODE='42501';END IF;
 IF i.type='private' THEN
  IF i.user_id IS DISTINCT FROM p_user OR i.business_account_id IS NOT NULL THEN
   RAISE EXCEPTION 'job_identity_forbidden' USING ERRCODE='42501';END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_user FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_identity_unavailable' USING ERRCODE='42501';END IF;
 ELSIF i.type='business' THEN
  PERFORM 1 FROM public.business_accounts WHERE id=i.business_account_id AND status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_business_unavailable' USING ERRCODE='42501';END IF;
  PERFORM 1 FROM public.business_members WHERE business_account_id=i.business_account_id
   AND user_id=p_user AND status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_business_forbidden' USING ERRCODE='42501';END IF;
 ELSE RAISE EXCEPTION 'job_identity_forbidden' USING ERRCODE='42501';
 END IF;
END $f$;

-- These are the two exact old named checks. The preflight recognizes the
-- complete job catalog before replacing them; no unknown constraints vanish.
ALTER TABLE public.jobs DROP CONSTRAINT jobs_employment_type_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_employment_type_check
 CHECK(employment_type IN('permanent','fixed_term','contract','internship','other','task'));
ALTER TABLE public.jobs DROP CONSTRAINT jobs_salary_period_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_salary_period_check
 CHECK(salary_period IN('hour','day','week','month','year','task'));
ALTER TABLE public.jobs ADD CONSTRAINT jobs_task_content_check
 CHECK((employment_type IS DISTINCT FROM 'task' OR working_time IS NULL)
 AND (salary_period IS DISTINCT FROM 'task' OR employment_type IS NOT DISTINCT FROM 'task'));
