CREATE OR REPLACE FUNCTION jobs_private.normalize_content(p_content jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE keys constant text[]:=ARRAY['title','description','category','countryCode','city','locationLabel','workplaceType',
 'employmentType','workingTime','salaryMin','salaryMax','salaryCurrency','salaryPeriod'];
 k text;n jsonb:='{}';v text;low jsonb;high jsonb;
BEGIN
 IF p_content IS NULL OR jsonb_typeof(p_content)<>'object' OR octet_length(p_content::text)>65536
 OR NOT(p_content ?& keys) OR p_content-keys<>'{}'::jsonb THEN
 RAISE EXCEPTION 'job_content_invalid' USING ERRCODE='22023';END IF;
 FOREACH k IN ARRAY keys LOOP
  IF p_content->k IS DISTINCT FROM 'null'::jsonb AND jsonb_typeof(p_content->k) IS DISTINCT FROM 'string' THEN
   RAISE EXCEPTION 'job_content_invalid' USING ERRCODE='22023';END IF;
  v:=CASE WHEN k IN('salaryMin','salaryMax','salaryCurrency') THEN p_content->>k ELSE nullif(btrim(p_content->>k),'') END;
  n:=n||jsonb_build_object(k,v);
 END LOOP;
 IF n->>'title' IS NULL OR char_length(n->>'title') NOT BETWEEN 2 AND 140 OR n->>'title' ~ '[[:cntrl:]]'
 OR n->>'description' IS NULL OR char_length(n->>'description') NOT BETWEEN 1 AND 10000
 OR NOT EXISTS(SELECT 1 FROM jobs_private.categories WHERE code=n->>'category')
 OR (n->>'countryCode' IS NOT NULL AND n->>'countryCode' !~ '^[A-Z]{2}$')
 OR char_length(n->>'city')>160 OR n->>'city' ~ '[[:cntrl:]]'
 OR char_length(n->>'locationLabel')>300 OR n->>'locationLabel' ~ '[[:cntrl:]]'
 OR n->>'workplaceType' IS NULL OR n->>'workplaceType' NOT IN('on_site','remote','hybrid')
 OR (n->>'employmentType' IS NOT NULL AND n->>'employmentType' NOT IN('permanent','fixed_term','contract','internship','other','task'))
 OR (n->>'workingTime' IS NOT NULL AND n->>'workingTime' NOT IN('full_time','part_time','flexible','other')) THEN
 RAISE EXCEPTION 'job_content_invalid' USING ERRCODE='22023';END IF;
 IF n->>'employmentType'='task' AND n->>'workingTime' IS NOT NULL THEN
  RAISE EXCEPTION 'job_content_invalid' USING ERRCODE='22023';END IF;
 IF n->>'salaryPeriod'='task' AND n->>'employmentType' IS DISTINCT FROM 'task' THEN
  RAISE EXCEPTION 'job_salary_invalid' USING ERRCODE='22023';END IF;
 IF n->>'salaryMin' IS NULL AND n->>'salaryMax' IS NULL THEN
  IF n->>'salaryCurrency' IS NOT NULL OR n->>'salaryPeriod' IS NOT NULL THEN
   RAISE EXCEPTION 'job_salary_invalid' USING ERRCODE='22023';END IF;
 ELSE
  IF n->>'salaryCurrency' IS NULL OR n->>'salaryPeriod' IS NULL OR n->>'salaryPeriod' NOT IN('hour','day','week','month','year','task') THEN
   RAISE EXCEPTION 'job_salary_invalid' USING ERRCODE='22023';END IF;
  IF n->>'salaryMin' IS NOT NULL THEN
   low:=public.normalize_listing_price_v1(jsonb_build_object('kind','fixed','amount',n->'salaryMin','currency',n->'salaryCurrency'));
   n:=jsonb_set(n,'{salaryMin}',low->'amount');
  END IF;
  IF n->>'salaryMax' IS NOT NULL THEN
   high:=public.normalize_listing_price_v1(jsonb_build_object('kind','fixed','amount',n->'salaryMax','currency',n->'salaryCurrency'));
   n:=jsonb_set(n,'{salaryMax}',high->'amount');
  END IF;
  IF (n->>'salaryMin')::numeric>(n->>'salaryMax')::numeric THEN
   RAISE EXCEPTION 'job_salary_invalid' USING ERRCODE='22023';END IF;
 END IF;
 RETURN n;
END $f$;
