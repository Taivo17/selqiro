-- Additive canonical job domain. No existing content rows or policies are rewritten.
CREATE SCHEMA jobs_private;
REVOKE ALL ON SCHEMA jobs_private FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE jobs_private.categories (
 code text PRIMARY KEY CHECK(code ~ '^[a-z_]{2,64}$'),
 label_et text NOT NULL,label_en text NOT NULL,sort_order integer NOT NULL UNIQUE
);
INSERT INTO jobs_private.categories VALUES
 ('administration','Haldus ja kontoritöö','Administration',10),
 ('agriculture','Põllumajandus','Agriculture',20),
 ('construction','Ehitus','Construction',30),
 ('customer_service','Klienditeenindus','Customer service',40),
 ('education','Haridus','Education',50),
 ('engineering','Tehnika ja inseneeria','Engineering',60),
 ('finance','Rahandus ja raamatupidamine','Finance',70),
 ('healthcare','Tervishoid ja hoolekanne','Healthcare and care',80),
 ('hospitality','Toitlustus ja majutus','Hospitality',90),
 ('information_technology','Infotehnoloogia','Information technology',100),
 ('logistics','Transport ja logistika','Transport and logistics',110),
 ('manufacturing','Tootmine','Manufacturing',120),
 ('sales_marketing','Müük ja turundus','Sales and marketing',130),
 ('other','Muu töö','Other work',140);
CREATE TABLE public.jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE RESTRICT,
 created_by_user_id uuid NOT NULL,
 title text NOT NULL CHECK(char_length(title) BETWEEN 2 AND 140),
 description text NOT NULL CHECK(char_length(description) BETWEEN 1 AND 10000),
 category text NOT NULL REFERENCES jobs_private.categories(code) ON DELETE RESTRICT,
 country_code text CHECK(country_code ~ '^[A-Z]{2}$'),
 city text CHECK(char_length(city) BETWEEN 1 AND 160),
 location_label text CHECK(char_length(location_label) BETWEEN 1 AND 300),
 workplace_type text NOT NULL CHECK(workplace_type IN('on_site','remote','hybrid')),
 employment_type text CHECK(employment_type IN('permanent','fixed_term','contract','internship','other')),
 working_time text CHECK(working_time IN('full_time','part_time','flexible','other')),
 salary_min numeric CHECK(salary_min>=0 AND salary_min<1000000000000000000),
 salary_max numeric CHECK(salary_max>=0 AND salary_max<1000000000000000000),
 salary_currency text,salary_period text CHECK(salary_period IN('hour','day','week','month','year')),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','published','paused','closed')),
 edit_revision bigint NOT NULL DEFAULT 1 CHECK(edit_revision>0),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp() CHECK(isfinite(created_at)),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp() CHECK(isfinite(updated_at)),
 published_at timestamptz CHECK(isfinite(published_at)),
 active_until timestamptz CHECK(isfinite(active_until)),
 last_confirmed_at timestamptz CHECK(isfinite(last_confirmed_at)),
 CHECK(salary_min IS NULL OR salary_max IS NULL OR salary_min<=salary_max),
 CHECK(((salary_min IS NOT NULL OR salary_max IS NOT NULL) AND salary_currency IS NOT NULL AND salary_period IS NOT NULL)
  OR (salary_min IS NULL AND salary_max IS NULL AND salary_currency IS NULL AND salary_period IS NULL)),
 CHECK((status='draft' AND published_at IS NULL AND active_until IS NULL AND last_confirmed_at IS NULL)
  OR (status<>'draft' AND published_at IS NOT NULL AND active_until>published_at
   AND (last_confirmed_at IS NULL OR last_confirmed_at>=published_at)))
);
CREATE TABLE jobs_private.requests (
 actor_user_id uuid NOT NULL,request_key uuid NOT NULL,identity_id uuid NOT NULL,
 operation text NOT NULL CHECK(operation IN('save','publish','status','renew')),
 request jsonb NOT NULL CHECK(jsonb_typeof(request)='object'),
 request_hash bytea NOT NULL CHECK(octet_length(request_hash)=32),
 result jsonb NOT NULL CHECK(jsonb_typeof(result)='object'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor_user_id,request_key)
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs_private.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs_private.requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.jobs,jobs_private.categories,jobs_private.requests FROM PUBLIC,anon,authenticated,service_role;
CREATE INDEX jobs_owner_cursor_idx ON public.jobs(identity_id,created_at DESC,id DESC);
CREATE INDEX jobs_profile_cursor_idx ON public.jobs(identity_id,published_at DESC,id DESC) WHERE status='published';
CREATE INDEX jobs_public_cursor_idx ON public.jobs(published_at DESC,id DESC) WHERE status='published';
COMMENT ON TABLE public.jobs IS 'Canonical employer job. Closed browser table; explicit RPCs enforce business identity, revision, policy, calendar-month activity and viewer eligibility.';
