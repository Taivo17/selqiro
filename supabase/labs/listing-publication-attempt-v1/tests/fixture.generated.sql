-- NEW synthetic fixture only. No historical suites or seeded user data.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'publication_disposable_helper_required';
 END IF;
END $gate$;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;


CREATE OR REPLACE FUNCTION auth.uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$
;

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "store_name" "text",
    "store_slug" "text",
    "bio" "text",
    "avatar_url" "text",
    "banner_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_premium" boolean DEFAULT false NOT NULL,
    "premium_until" timestamp with time zone,
    "home_country" "text",
    "home_city" "text",
    "home_lat" double precision,
    "home_lng" double precision,
    "banner_dominant_color" "text",
    "avatar_dominant_color" "text",
    "language" "text" DEFAULT 'en'::"text",
    "active_identity_id" "uuid"
);

ALTER TABLE public.profiles ADD PRIMARY KEY(id);

CREATE TABLE IF NOT EXISTS "public"."identities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "user_id" "uuid",
    "business_account_id" "uuid",
    "display_name" "text" NOT NULL,
    "avatar_url" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "identities_type_check" CHECK (("type" = ANY (ARRAY['private'::"text", 'business'::"text"]))),
    CONSTRAINT "identity_owner_check" CHECK (((("type" = 'private'::"text") AND ("user_id" IS NOT NULL) AND ("business_account_id" IS NULL)) OR (("type" = 'business'::"text") AND ("business_account_id" IS NOT NULL))))
);

ALTER TABLE public.identities ADD PRIMARY KEY(id);

CREATE TABLE IF NOT EXISTS "public"."business_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_account_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'owner'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "invited_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE public.business_members ADD PRIMARY KEY(id);

CREATE TABLE IF NOT EXISTS "public"."listings" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text",
    "description" "text",
    "price" "text",
    "image" "text",
    "status" "text" DEFAULT 'active'::"text",
    "category" "text" DEFAULT 'general'::"text",
    "condition" "text" DEFAULT 'used'::"text",
    "country" "text",
    "city" "text",
    "location" "text",
    "user_id" "uuid",
    "ai_title" "text",
    "ai_description" "text",
    "ai_category" "text",
    "ai_detected_brand" "text",
    "ai_detected_type" "text",
    "ai_confidence" double precision,
    "ai_raw" "jsonb",
    "manufacturer" "text",
    "part_number" "text",
    "oem_number" "text",
    "vehicle_brand" "text",
    "vehicle_model" "text",
    "vehicle_year" "text",
    "engine" "text",
    "compatibility" "jsonb",
    "is_featured" boolean DEFAULT false,
    "featured_until" timestamp with time zone,
    "ai_enriched" boolean DEFAULT false,
    "ai_level" "text" DEFAULT 'none'::"text",
    "item_type" "text",
    "subcategory" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ai_status" "text" DEFAULT 'not_started'::"text",
    "ai_review_required" boolean DEFAULT false,
    "ai_reviewed_by_user" boolean DEFAULT false,
    "search_text" "text",
    "active_until" timestamp with time zone,
    "is_boosted" boolean DEFAULT false,
    "boost_until" timestamp without time zone,
    "seo_title" "text",
    "seo_description" "text",
    "description_en" "text",
    "ai_detected_object" "text",
    "ai_suggested_category" "text",
    "ai_suggested_subcategory" "text",
    "ai_suggested_title" "text",
    "ai_suggested_brand" "text",
    "ai_suggested_model" "text",
    "ai_suggestion_json" "jsonb",
    "price_amount" numeric,
    "search_vector" "tsvector",
    "listing_lat" double precision,
    "listing_lng" double precision,
    "listing_language" "text" DEFAULT 'en'::"text",
    "identity_id" "uuid",
    "created_by_user_id" "uuid",
    "updated_by_user_id" "uuid"
);

ALTER TABLE public.listings ADD PRIMARY KEY(id);

CREATE TABLE IF NOT EXISTS "public"."listing_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" bigint,
    "user_id" "uuid",
    "original_url" "text" NOT NULL,
    "medium_url" "text",
    "thumb_url" "text",
    "sort_order" integer DEFAULT 0,
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE public.listing_images ADD PRIMARY KEY(id);

ALTER TABLE public.business_members ADD UNIQUE(business_account_id,user_id);

create table public.publication_policy_documents (
  id uuid primary key
    default gen_random_uuid(),
  policy_key text not null,
  policy_version text not null,
  country_code text,
  locale text not null
    default 'et-EE',
  title text not null,
  summary text not null
    default '',
  body_text text not null,
  content_hash text not null,
  status text not null
    default 'draft',
  applies_to_content_types text[] not null
    default '{}'::text[],
  requires_user_acceptance boolean not null
    default true,
  effective_from timestamptz not null
    default now(),
  effective_until timestamptz,
  metadata jsonb not null
    default '{}'::jsonb,
  created_at timestamptz not null
    default now(),
  updated_at timestamptz not null
    default now(),

  constraint publication_policy_documents_policy_key_check
    check (
      policy_key ~ '^[a-z0-9][a-z0-9_-]{1,79}$'
    ),

  constraint publication_policy_documents_policy_version_check
    check (
      policy_version ~ '^[a-z0-9][a-z0-9_-]{1,99}$'
    ),

  constraint publication_policy_documents_country_code_check
    check (
      country_code is null
      or country_code ~ '^[A-Z]{2}$'
    ),

  constraint publication_policy_documents_locale_check
    check (
      locale ~ '^[a-z]{2}(-[A-Z]{2})?$'
    ),

  constraint publication_policy_documents_title_check
    check (
      char_length(btrim(title))
        between 2 and 200
    ),

  constraint publication_policy_documents_summary_check
    check (
      char_length(summary) <= 1200
    ),

  constraint publication_policy_documents_body_check
    check (
      char_length(btrim(body_text))
        between 20 and 30000
    ),

  constraint publication_policy_documents_content_hash_check
    check (
      content_hash ~ '^[0-9a-f]{64}$'
    ),

  constraint publication_policy_documents_status_check
    check (
      status = any (
        array[
          'draft',
          'active',
          'retired'
        ]::text[]
      )
    ),

  constraint publication_policy_documents_content_types_check
    check (
      cardinality(applies_to_content_types) >= 1
      and applies_to_content_types <@
        array[
          'listing',
          'service',
          'product_showcase',
          'job',
          'ad',
          'horse_offer'
        ]::text[]
    ),

  constraint publication_policy_documents_effective_range_check
    check (
      effective_until is null
      or effective_until > effective_from
    ),

  constraint publication_policy_documents_metadata_check
    check (
      jsonb_typeof(metadata) = 'object'
    )
);

create table public.user_publication_policy_acceptances (
  id uuid primary key
    default gen_random_uuid(),
  user_id uuid not null
    references auth.users(id)
      on delete cascade,
  identity_id uuid
    references public.identities(id)
      on delete set null,
  policy_document_id uuid not null
    references public.publication_policy_documents(id)
      on delete restrict,
  policy_key text not null,
  policy_version text not null,
  country_code text,
  locale text not null,
  content_hash text not null,
  acceptance_source text not null
    default 'publication_gate',
  accepted_at timestamptz not null
    default now(),
  metadata jsonb not null
    default '{}'::jsonb,

  constraint user_publication_policy_acceptances_unique
    unique (
      user_id,
      policy_document_id
    ),

  constraint user_publication_policy_acceptances_policy_key_check
    check (
      policy_key ~ '^[a-z0-9][a-z0-9_-]{1,79}$'
    ),

  constraint user_publication_policy_acceptances_policy_version_check
    check (
      policy_version ~ '^[a-z0-9][a-z0-9_-]{1,99}$'
    ),

  constraint user_publication_policy_acceptances_country_code_check
    check (
      country_code is null
      or country_code ~ '^[A-Z]{2}$'
    ),

  constraint user_publication_policy_acceptances_locale_check
    check (
      locale ~ '^[a-z]{2}(-[A-Z]{2})?$'
    ),

  constraint user_publication_policy_acceptances_content_hash_check
    check (
      content_hash ~ '^[0-9a-f]{64}$'
    ),

  constraint user_publication_policy_acceptances_source_check
    check (
      acceptance_source = any (
        array[
          'publication_gate',
          'settings',
          'support',
          'migration'
        ]::text[]
      )
    ),

  constraint user_publication_policy_acceptances_metadata_check
    check (
      jsonb_typeof(metadata) = 'object'
    )
);

create unique index
  publication_policy_documents_version_unique_idx
on public.publication_policy_documents (
  policy_key,
  policy_version,
  locale,
  coalesce(country_code, '')
);

create unique index
  publication_policy_documents_one_active_idx
on public.publication_policy_documents (
  policy_key,
  locale,
  coalesce(country_code, '')
)
where status = 'active';

CREATE OR REPLACE FUNCTION public.current_user_has_identity_access(p_identity_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.identities identity
      where identity.id = p_identity_id
        and identity.status = 'active'
        and (
          (
            identity.type = 'private'
            and identity.user_id = auth.uid()
          )
          or
          (
            identity.type = 'business'
            and exists (
              select 1
              from public.business_members member
              where member.business_account_id =
                identity.business_account_id
                and member.user_id = auth.uid()
                and member.status = 'active'
            )
          )
        )
    );
$function$
;

create or replace function
  public.get_required_publication_policies_v1(
    p_content_type text,
    p_country_code text default null,
    p_locale text default 'et-EE'
  )
returns table (
  policy_document_id uuid,
  policy_key text,
  policy_version text,
  country_code text,
  locale text,
  title text,
  summary text,
  body_text text,
  content_hash text,
  requires_user_acceptance boolean,
  metadata jsonb,
  effective_from timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_content_type text :=
    lower(btrim(coalesce(p_content_type, '')));
  v_country_code text :=
    nullif(upper(btrim(coalesce(p_country_code, ''))), '');
  v_locale text :=
    coalesce(nullif(btrim(coalesce(p_locale, '')), ''), 'et-EE');
begin
  if v_content_type = '' then
    raise exception
      'publication_content_type_required'
      using errcode = '22023';
  end if;

  return query
  select
    policy.id,
    policy.policy_key,
    policy.policy_version,
    policy.country_code,
    policy.locale,
    policy.title,
    policy.summary,
    policy.body_text,
    policy.content_hash,
    policy.requires_user_acceptance,
    policy.metadata,
    policy.effective_from
  from public.publication_policy_documents policy
  where policy.status = 'active'
    and policy.locale = v_locale
    and policy.effective_from <= now()
    and (
      policy.effective_until is null
      or policy.effective_until > now()
    )
    and v_content_type = any (
      policy.applies_to_content_types
    )
    and (
      policy.country_code is null
      or (
        v_country_code is not null
        and policy.country_code = v_country_code
      )
    )
  order by
    policy.country_code nulls first,
    policy.policy_key,
    policy.policy_version;
end;
$function$;

create or replace function
  public.require_my_current_publication_policy_acceptance_v1(
    p_policy_key text,
    p_country_code text default null,
    p_locale text default 'et-EE'
  )
returns uuid
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_policy_id uuid;
begin
  if v_user_id is null then
    raise exception
      'not_authenticated'
      using errcode = '42501';
  end if;

  select policy.id
  into v_policy_id
  from public.publication_policy_documents policy
  join public.user_publication_policy_acceptances acceptance
    on acceptance.policy_document_id = policy.id
    and acceptance.user_id = v_user_id
  where policy.policy_key =
      lower(btrim(coalesce(p_policy_key, '')))
    and policy.country_code is not distinct from
      nullif(upper(btrim(coalesce(p_country_code, ''))), '')
    and policy.locale =
      coalesce(nullif(btrim(coalesce(p_locale, '')), ''), 'et-EE')
    and policy.status = 'active'
    and policy.effective_from <= now()
    and (
      policy.effective_until is null
      or policy.effective_until > now()
    )
    and acceptance.content_hash = policy.content_hash
  limit 1;

  if v_policy_id is null then
    raise exception
      'publication_policy_acceptance_required:%',
      lower(btrim(coalesce(p_policy_key, '')))
      using errcode = '42501';
  end if;

  return v_policy_id;
end;
$function$;

create or replace function
  public.prevent_publication_policy_document_version_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  if (
    new.policy_key is distinct from old.policy_key
    or new.policy_version is distinct from old.policy_version
    or new.country_code is distinct from old.country_code
    or new.locale is distinct from old.locale
    or new.title is distinct from old.title
    or new.summary is distinct from old.summary
    or new.body_text is distinct from old.body_text
    or new.content_hash is distinct from old.content_hash
    or new.applies_to_content_types is distinct from old.applies_to_content_types
    or new.requires_user_acceptance is distinct from old.requires_user_acceptance
  ) then
    raise exception
      'publication_policy_document_version_immutable'
      using errcode = '55000';
  end if;

  return new;
end;
$function$;

create or replace function
  public.prevent_publication_policy_acceptance_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  raise exception
    'publication_policy_acceptance_append_only'
    using errcode = '55000';
end;
$function$;

CREATE TRIGGER policy_immutable BEFORE UPDATE ON public.publication_policy_documents
 FOR EACH ROW EXECUTE FUNCTION public.prevent_publication_policy_document_version_mutation();
CREATE TRIGGER acceptance_immutable BEFORE UPDATE ON public.user_publication_policy_acceptances
 FOR EACH ROW EXECUTE FUNCTION public.prevent_publication_policy_acceptance_update();


CREATE FUNCTION public.listing_price_currency_scale_v1(p_currency text)
RETURNS integer LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog
AS $fn$
  SELECT CASE p_currency
    WHEN 'AED' THEN 2
    WHEN 'AFN' THEN 2
    WHEN 'ALL' THEN 2
    WHEN 'AMD' THEN 2
    WHEN 'AOA' THEN 2
    WHEN 'ARS' THEN 2
    WHEN 'AUD' THEN 2
    WHEN 'AWG' THEN 2
    WHEN 'AZN' THEN 2
    WHEN 'BAM' THEN 2
    WHEN 'BBD' THEN 2
    WHEN 'BDT' THEN 2
    WHEN 'BHD' THEN 3
    WHEN 'BIF' THEN 0
    WHEN 'BMD' THEN 2
    WHEN 'BND' THEN 2
    WHEN 'BOB' THEN 2
    WHEN 'BRL' THEN 2
    WHEN 'BSD' THEN 2
    WHEN 'BTN' THEN 2
    WHEN 'BWP' THEN 2
    WHEN 'BYN' THEN 2
    WHEN 'BZD' THEN 2
    WHEN 'CAD' THEN 2
    WHEN 'CDF' THEN 2
    WHEN 'CHF' THEN 2
    WHEN 'CLP' THEN 0
    WHEN 'CNY' THEN 2
    WHEN 'COP' THEN 2
    WHEN 'CRC' THEN 2
    WHEN 'CUP' THEN 2
    WHEN 'CVE' THEN 2
    WHEN 'CZK' THEN 2
    WHEN 'DJF' THEN 0
    WHEN 'DKK' THEN 2
    WHEN 'DOP' THEN 2
    WHEN 'DZD' THEN 2
    WHEN 'EGP' THEN 2
    WHEN 'ERN' THEN 2
    WHEN 'ETB' THEN 2
    WHEN 'EUR' THEN 2
    WHEN 'FJD' THEN 2
    WHEN 'FKP' THEN 2
    WHEN 'GBP' THEN 2
    WHEN 'GEL' THEN 2
    WHEN 'GHS' THEN 2
    WHEN 'GIP' THEN 2
    WHEN 'GMD' THEN 2
    WHEN 'GNF' THEN 0
    WHEN 'GTQ' THEN 2
    WHEN 'GYD' THEN 2
    WHEN 'HKD' THEN 2
    WHEN 'HNL' THEN 2
    WHEN 'HTG' THEN 2
    WHEN 'HUF' THEN 2
    WHEN 'IDR' THEN 2
    WHEN 'ILS' THEN 2
    WHEN 'INR' THEN 2
    WHEN 'IQD' THEN 3
    WHEN 'IRR' THEN 2
    WHEN 'ISK' THEN 0
    WHEN 'JMD' THEN 2
    WHEN 'JOD' THEN 3
    WHEN 'JPY' THEN 0
    WHEN 'KES' THEN 2
    WHEN 'KGS' THEN 2
    WHEN 'KHR' THEN 2
    WHEN 'KMF' THEN 0
    WHEN 'KPW' THEN 2
    WHEN 'KRW' THEN 0
    WHEN 'KWD' THEN 3
    WHEN 'KYD' THEN 2
    WHEN 'KZT' THEN 2
    WHEN 'LAK' THEN 2
    WHEN 'LBP' THEN 2
    WHEN 'LKR' THEN 2
    WHEN 'LRD' THEN 2
    WHEN 'LSL' THEN 2
    WHEN 'LYD' THEN 3
    WHEN 'MAD' THEN 2
    WHEN 'MDL' THEN 2
    WHEN 'MGA' THEN 2
    WHEN 'MKD' THEN 2
    WHEN 'MMK' THEN 2
    WHEN 'MNT' THEN 2
    WHEN 'MOP' THEN 2
    WHEN 'MRU' THEN 2
    WHEN 'MUR' THEN 2
    WHEN 'MVR' THEN 2
    WHEN 'MWK' THEN 2
    WHEN 'MXN' THEN 2
    WHEN 'MYR' THEN 2
    WHEN 'MZN' THEN 2
    WHEN 'NAD' THEN 2
    WHEN 'NGN' THEN 2
    WHEN 'NIO' THEN 2
    WHEN 'NOK' THEN 2
    WHEN 'NPR' THEN 2
    WHEN 'NZD' THEN 2
    WHEN 'OMR' THEN 3
    WHEN 'PAB' THEN 2
    WHEN 'PEN' THEN 2
    WHEN 'PGK' THEN 2
    WHEN 'PHP' THEN 2
    WHEN 'PKR' THEN 2
    WHEN 'PLN' THEN 2
    WHEN 'PYG' THEN 0
    WHEN 'QAR' THEN 2
    WHEN 'RON' THEN 2
    WHEN 'RSD' THEN 2
    WHEN 'RUB' THEN 2
    WHEN 'RWF' THEN 0
    WHEN 'SAR' THEN 2
    WHEN 'SBD' THEN 2
    WHEN 'SCR' THEN 2
    WHEN 'SDG' THEN 2
    WHEN 'SEK' THEN 2
    WHEN 'SGD' THEN 2
    WHEN 'SHP' THEN 2
    WHEN 'SLE' THEN 2
    WHEN 'SOS' THEN 2
    WHEN 'SRD' THEN 2
    WHEN 'SSP' THEN 2
    WHEN 'STN' THEN 2
    WHEN 'SVC' THEN 2
    WHEN 'SYP' THEN 2
    WHEN 'SZL' THEN 2
    WHEN 'THB' THEN 2
    WHEN 'TJS' THEN 2
    WHEN 'TMT' THEN 2
    WHEN 'TND' THEN 3
    WHEN 'TOP' THEN 2
    WHEN 'TRY' THEN 2
    WHEN 'TTD' THEN 2
    WHEN 'TWD' THEN 2
    WHEN 'TZS' THEN 2
    WHEN 'UAH' THEN 2
    WHEN 'UGX' THEN 0
    WHEN 'USD' THEN 2
    WHEN 'UYU' THEN 2
    WHEN 'UZS' THEN 2
    WHEN 'VES' THEN 2
    WHEN 'VND' THEN 0
    WHEN 'VUV' THEN 0
    WHEN 'WST' THEN 2
    WHEN 'XAF' THEN 0
    WHEN 'XCD' THEN 2
    WHEN 'XCG' THEN 2
    WHEN 'XOF' THEN 0
    WHEN 'XPF' THEN 0
    WHEN 'YER' THEN 2
    WHEN 'ZAR' THEN 2
    WHEN 'ZMW' THEN 2
    WHEN 'ZWG' THEN 2
    ELSE NULL END;
$fn$;

CREATE FUNCTION public.normalize_listing_price_v1(p_price jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE k text; a text; c text; digits integer;
BEGIN
  IF p_price IS NULL OR jsonb_typeof(p_price) IS DISTINCT FROM 'object'
     OR octet_length(p_price::text) > 256 THEN
    RAISE EXCEPTION 'listing_price_shape_invalid' USING ERRCODE='22023';
  END IF;
  IF (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_price) AS keys(key))
      IS DISTINCT FROM ARRAY['amount','currency','kind']::text[]
      OR jsonb_typeof(p_price->'kind') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'listing_price_shape_invalid' USING ERRCODE='22023';
  END IF;
  k := p_price->>'kind';
  IF k NOT IN ('fixed','free','negotiable','unspecified') THEN
    RAISE EXCEPTION 'listing_price_kind_invalid' USING ERRCODE='22023';
  END IF;
  IF k <> 'fixed' THEN
    IF p_price->'amount' IS DISTINCT FROM 'null'::jsonb
       OR p_price->'currency' IS DISTINCT FROM 'null'::jsonb THEN
      RAISE EXCEPTION 'listing_price_nonfixed_values_forbidden' USING ERRCODE='22023';
    END IF;
    RETURN jsonb_build_object('kind',k,'amount',NULL,'currency',NULL);
  END IF;
  IF jsonb_typeof(p_price->'amount') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_price->'currency') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'listing_price_string_values_required' USING ERRCODE='22023';
  END IF;
  a := p_price->>'amount'; c := p_price->>'currency';
  digits := public.listing_price_currency_scale_v1(c);
  IF digits IS NULL THEN
    RAISE EXCEPTION 'listing_price_currency_unsupported' USING ERRCODE='22023';
  END IF;
  -- ASCII, no exponent/grouping/sign, < 10^18 units. Reject rather than round.
  IF char_length(a) > 22 OR a !~ '^(0|[1-9][0-9]{0,17})([.][0-9]{1,3})?$'
      OR (position('.' IN a)>0 AND char_length(split_part(a,'.',2))>digits) THEN
    RAISE EXCEPTION 'listing_price_amount_invalid' USING ERRCODE='22023';
  END IF;
  RETURN jsonb_build_object('kind',k,'amount',trim_scale(a::numeric)::text,'currency',c);
END $fn$;

CREATE FUNCTION public.normalize_listing_basics_v1(p_basics jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $fn$
DECLARE t text; d text; c text;
BEGIN
  IF p_basics IS NULL OR jsonb_typeof(p_basics) IS DISTINCT FROM 'object'
      OR octet_length(p_basics::text)>24000 THEN
    RAISE EXCEPTION 'listing_basics_shape_invalid' USING ERRCODE='22023';
  END IF;
  IF (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_basics) AS keys(key))
       IS DISTINCT FROM ARRAY['condition','description','title']::text[]
      OR jsonb_typeof(p_basics->'title') IS DISTINCT FROM 'string'
      OR jsonb_typeof(p_basics->'description') IS DISTINCT FROM 'string'
      OR jsonb_typeof(p_basics->'condition') NOT IN ('null','string') THEN
    RAISE EXCEPTION 'listing_basics_shape_invalid' USING ERRCODE='22023';
  END IF;
  -- Explicit ASCII whitespace contract, independent of client locale.
  t := btrim(regexp_replace(p_basics->>'title',E'[ \\t\\n\\r\\f\\v]+',' ','g'));
  d := btrim(p_basics->>'description',E' \t\n\r\f\013');
  c := p_basics->>'condition';
  IF char_length(t)<2 OR char_length(t)>140 OR char_length(p_basics->>'title')>1024 THEN
    RAISE EXCEPTION 'listing_basics_title_invalid' USING ERRCODE='22023';
  END IF;
  IF char_length(p_basics->>'description')>5000 THEN
    RAISE EXCEPTION 'listing_basics_description_invalid' USING ERRCODE='22023';
  END IF;
  IF c IS NOT NULL AND c NOT IN ('new','used','damaged') THEN
    RAISE EXCEPTION 'listing_basics_condition_invalid' USING ERRCODE='22023';
  END IF;
  RETURN jsonb_build_object('title',t,'description',d,'condition',c);
END $fn$;

CREATE FUNCTION public.listing_create_category_path_valid_v1(p_path jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path=pg_catalog,pg_temp
AS $fn$
 SELECT p_path = ANY(ARRAY[
    '["vehicles"]'::jsonb,
    '["vehicles","cars"]'::jsonb,
    '["vehicles","cars","passenger_cars"]'::jsonb,
    '["vehicles","cars","suv_offroad"]'::jsonb,
    '["vehicles","cars","vans_minibuses"]'::jsonb,
    '["vehicles","cars","pickup_trucks"]'::jsonb,
    '["vehicles","cars","motorhomes_campers"]'::jsonb,
    '["vehicles","cars","racing_vehicles"]'::jsonb,
    '["vehicles","motorcycles"]'::jsonb,
    '["vehicles","motorcycles","sport_bikes"]'::jsonb,
    '["vehicles","motorcycles","cruisers"]'::jsonb,
    '["vehicles","motorcycles","touring"]'::jsonb,
    '["vehicles","motorcycles","enduro_mx"]'::jsonb,
    '["vehicles","motorcycles","scooters"]'::jsonb,
    '["vehicles","motorcycles","atv_utv"]'::jsonb,
    '["vehicles","motorcycles","snowmobiles"]'::jsonb,
    '["vehicles","trucks_commercial"]'::jsonb,
    '["vehicles","trucks_commercial","trucks"]'::jsonb,
    '["vehicles","trucks_commercial","semi_trucks"]'::jsonb,
    '["vehicles","trucks_commercial","buses"]'::jsonb,
    '["vehicles","trucks_commercial","commercial_trailers"]'::jsonb,
    '["vehicles","agricultural_heavy_machinery"]'::jsonb,
    '["vehicles","agricultural_heavy_machinery","tractors"]'::jsonb,
    '["vehicles","agricultural_heavy_machinery","harvesters"]'::jsonb,
    '["vehicles","agricultural_heavy_machinery","excavators"]'::jsonb,
    '["vehicles","agricultural_heavy_machinery","forestry_machinery"]'::jsonb,
    '["vehicles","agricultural_heavy_machinery","construction_machinery"]'::jsonb,
    '["vehicles","agricultural_heavy_machinery","agricultural_attachments_implements"]'::jsonb,
    '["vehicles","agricultural_heavy_machinery","agricultural_heavy_machinery_spare_parts"]'::jsonb,
    '["vehicles","marine"]'::jsonb,
    '["vehicles","marine","boats"]'::jsonb,
    '["vehicles","marine","yachts"]'::jsonb,
    '["vehicles","marine","jet_skis"]'::jsonb,
    '["vehicles","marine","boat_trailers"]'::jsonb,
    '["vehicles","marine","outboard_motors"]'::jsonb,
    '["vehicles","aviation"]'::jsonb,
    '["vehicles","aviation","airplanes"]'::jsonb,
    '["vehicles","aviation","helicopters"]'::jsonb,
    '["vehicles","aviation","ultralights"]'::jsonb,
    '["vehicles","aviation","drones"]'::jsonb,
    '["vehicles","aviation","aircraft_parts"]'::jsonb,
    '["vehicles","trailers"]'::jsonb,
    '["vehicles","trailers","light_trailers"]'::jsonb,
    '["vehicles","trailers","car_trailers"]'::jsonb,
    '["vehicles","trailers","cargo_trailers"]'::jsonb,
    '["vehicles","trailers","caravans"]'::jsonb,
    '["vehicles","trailers","horse_livestock_trailers"]'::jsonb,
    '["vehicles","vehicle_parts"]'::jsonb,
    '["vehicles","vehicle_parts","engines_engine_parts"]'::jsonb,
    '["vehicles","vehicle_parts","transmission_drivetrain"]'::jsonb,
    '["vehicles","vehicle_parts","suspension_steering"]'::jsonb,
    '["vehicles","vehicle_parts","brakes"]'::jsonb,
    '["vehicles","vehicle_parts","electrical_parts"]'::jsonb,
    '["vehicles","vehicle_parts","batteries"]'::jsonb,
    '["vehicles","vehicle_parts","starters_alternators"]'::jsonb,
    '["vehicles","vehicle_parts","body_parts"]'::jsonb,
    '["vehicles","vehicle_parts","lights_lamps"]'::jsonb,
    '["vehicles","vehicle_parts","interior_parts"]'::jsonb,
    '["vehicles","vehicle_parts","exhaust_parts"]'::jsonb,
    '["vehicles","vehicle_parts","cooling_heating"]'::jsonb,
    '["vehicles","vehicle_parts","fuel_system"]'::jsonb,
    '["vehicles","vehicle_parts","tires"]'::jsonb,
    '["vehicles","vehicle_parts","wheels_rims"]'::jsonb,
    '["vehicles","vehicle_parts","accessories"]'::jsonb,
    '["vehicles","vehicle_parts","riding_racing_gear"]'::jsonb,
    '["vehicles","vehicle_parts","spare_parts"]'::jsonb,
    '["vehicles","vehicle_parts","vehicle_for_parts"]'::jsonb,
    '["electronics"]'::jsonb,
    '["electronics","phones"]'::jsonb,
    '["electronics","computers"]'::jsonb,
    '["electronics","tv_audio"]'::jsonb,
    '["electronics","cameras"]'::jsonb,
    '["electronics","gaming"]'::jsonb,
    '["electronics","smart_home"]'::jsonb,
    '["electronics","components"]'::jsonb,
    '["electronics","electronics_accessories"]'::jsonb,
    '["electronics","other_electronics"]'::jsonb,
    '["real_estate"]'::jsonb,
    '["real_estate","apartments"]'::jsonb,
    '["real_estate","houses"]'::jsonb,
    '["real_estate","land"]'::jsonb,
    '["real_estate","commercial_property"]'::jsonb,
    '["real_estate","garages"]'::jsonb,
    '["real_estate","vacation_property"]'::jsonb,
    '["clothing_fashion"]'::jsonb,
    '["clothing_fashion","men"]'::jsonb,
    '["clothing_fashion","women"]'::jsonb,
    '["clothing_fashion","kids"]'::jsonb,
    '["clothing_fashion","workwear"]'::jsonb,
    '["clothing_fashion","shoes"]'::jsonb,
    '["clothing_fashion","watches"]'::jsonb,
    '["clothing_fashion","bags"]'::jsonb,
    '["clothing_fashion","jewelry"]'::jsonb,
    '["clothing_fashion","other_clothing_fashion"]'::jsonb,
    '["tools_industrial"]'::jsonb,
    '["tools_industrial","power_tools"]'::jsonb,
    '["tools_industrial","hand_tools"]'::jsonb,
    '["tools_industrial","workshop_equipment"]'::jsonb,
    '["tools_industrial","industrial_equipment"]'::jsonb,
    '["tools_industrial","safety_equipment"]'::jsonb,
    '["tools_industrial","other_tools_industrial"]'::jsonb,
    '["home_garden"]'::jsonb,
    '["home_garden","furniture"]'::jsonb,
    '["home_garden","appliances"]'::jsonb,
    '["home_garden","garden_tools"]'::jsonb,
    '["home_garden","plants_seedlings"]'::jsonb,
    '["home_garden","seeds"]'::jsonb,
    '["home_garden","crops_produce"]'::jsonb,
    '["home_garden","farm_supplies"]'::jsonb,
    '["home_garden","animal_feed"]'::jsonb,
    '["home_garden","greenhouses"]'::jsonb,
    '["home_garden","decor"]'::jsonb,
    '["home_garden","lighting"]'::jsonb,
    '["home_garden","kitchenware"]'::jsonb,
    '["home_garden","home_textiles"]'::jsonb,
    '["home_garden","household_supplies"]'::jsonb,
    '["home_garden","bathroom"]'::jsonb,
    '["home_garden","heating_fuels"]'::jsonb,
    '["home_garden","heating_equipment"]'::jsonb,
    '["home_garden","outdoor_furniture"]'::jsonb,
    '["home_garden","other_home_garden"]'::jsonb,
    '["sports_outdoor"]'::jsonb,
    '["sports_outdoor","gym_equipment"]'::jsonb,
    '["sports_outdoor","bicycles"]'::jsonb,
    '["sports_outdoor","winter_sports"]'::jsonb,
    '["sports_outdoor","camping"]'::jsonb,
    '["sports_outdoor","fishing"]'::jsonb,
    '["sports_outdoor","other_sports_outdoor"]'::jsonb,
    '["sports_outdoor","equestrian_horse_supplies"]'::jsonb,
    '["sports_outdoor","equestrian_horse_supplies","saddles_accessories"]'::jsonb,
    '["sports_outdoor","equestrian_horse_supplies","bridles_halters_tack"]'::jsonb,
    '["sports_outdoor","equestrian_horse_supplies","rider_clothing_safety"]'::jsonb,
    '["sports_outdoor","equestrian_horse_supplies","horse_blankets_textiles"]'::jsonb,
    '["sports_outdoor","equestrian_horse_supplies","horse_grooming_care"]'::jsonb,
    '["sports_outdoor","equestrian_horse_supplies","stable_paddock_equipment"]'::jsonb,
    '["sports_outdoor","equestrian_horse_supplies","driving_carriage_equipment"]'::jsonb,
    '["sports_outdoor","equestrian_horse_supplies","other_equestrian_supplies"]'::jsonb,
    '["antiques_collectibles"]'::jsonb,
    '["antiques_collectibles","art"]'::jsonb,
    '["antiques_collectibles","vintage"]'::jsonb,
    '["antiques_collectibles","coins"]'::jsonb,
    '["antiques_collectibles","military"]'::jsonb,
    '["antiques_collectibles","memorabilia"]'::jsonb,
    '["antiques_collectibles","other_antiques_collectibles"]'::jsonb,
    '["building_materials"]'::jsonb,
    '["building_materials","lumber"]'::jsonb,
    '["building_materials","concrete"]'::jsonb,
    '["building_materials","insulation"]'::jsonb,
    '["building_materials","roofing"]'::jsonb,
    '["building_materials","plumbing"]'::jsonb,
    '["building_materials","other_building_materials"]'::jsonb,
    '["children_baby"]'::jsonb,
    '["children_baby","strollers_prams"]'::jsonb,
    '["children_baby","child_car_seats"]'::jsonb,
    '["children_baby","nursery_furniture"]'::jsonb,
    '["children_baby","baby_feeding_care"]'::jsonb,
    '["children_baby","baby_safety_accessories"]'::jsonb,
    '["children_baby","other_children_baby"]'::jsonb,
    '["pet_supplies"]'::jsonb,
    '["pet_supplies","dog_supplies"]'::jsonb,
    '["pet_supplies","cat_supplies"]'::jsonb,
    '["pet_supplies","aquariums_terrariums"]'::jsonb,
    '["pet_supplies","cages_housing"]'::jsonb,
    '["pet_supplies","pet_transport_grooming"]'::jsonb,
    '["pet_supplies","other_pet_supplies"]'::jsonb,
    '["books_music_media"]'::jsonb,
    '["books_music_media","books"]'::jsonb,
    '["books_music_media","magazines_comics"]'::jsonb,
    '["books_music_media","music_movies"]'::jsonb,
    '["books_music_media","musical_instruments"]'::jsonb,
    '["books_music_media","instrument_accessories"]'::jsonb,
    '["books_music_media","other_books_media"]'::jsonb,
    '["hobbies_toys_crafts"]'::jsonb,
    '["hobbies_toys_crafts","toys"]'::jsonb,
    '["hobbies_toys_crafts","board_games_puzzles"]'::jsonb,
    '["hobbies_toys_crafts","arts_crafts"]'::jsonb,
    '["hobbies_toys_crafts","model_rc_hobbies"]'::jsonb,
    '["hobbies_toys_crafts","sewing_knitting"]'::jsonb,
    '["hobbies_toys_crafts","other_hobbies_toys"]'::jsonb,
    '["office_business"]'::jsonb,
    '["office_business","office_equipment"]'::jsonb,
    '["office_business","printers_scanners"]'::jsonb,
    '["office_business","office_furniture"]'::jsonb,
    '["office_business","retail_warehouse_equipment"]'::jsonb,
    '["office_business","presentation_equipment"]'::jsonb,
    '["office_business","other_office_business"]'::jsonb,
    '["general"]'::jsonb
 ]::jsonb[]);
$fn$;

CREATE FUNCTION public.require_listing_create_keys_v1(p_value jsonb,p_keys text[])
RETURNS void LANGUAGE plpgsql IMMUTABLE
SET search_path=pg_catalog,pg_temp
AS $fn$
BEGIN
 IF p_value IS NULL OR jsonb_typeof(p_value) IS DISTINCT FROM 'object' THEN
  RAISE EXCEPTION 'listing_create_shape_invalid' USING ERRCODE='22023';
 END IF;
 IF (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_value) k(key))
    IS DISTINCT FROM (SELECT array_agg(key ORDER BY key) FROM unnest(p_keys) k(key)) THEN
  RAISE EXCEPTION 'listing_create_shape_invalid' USING ERRCODE='22023';
 END IF;
END $fn$;

CREATE FUNCTION public.normalize_listing_create_location_v1(p_value jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path=pg_catalog,public,pg_temp
AS $fn$
DECLARE country_value text; city_value text; lat text; lng text;
BEGIN
 PERFORM public.require_listing_create_keys_v1(p_value,ARRAY['country','city','latitude','longitude']);
 IF jsonb_typeof(p_value->'country') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_value->'city') IS DISTINCT FROM 'string'
    OR char_length(p_value->>'country')>120 OR char_length(p_value->>'city')>160 THEN
  RAISE EXCEPTION 'listing_create_location_invalid' USING ERRCODE='22023';
 END IF;
 country_value:=btrim(p_value->>'country'); city_value:=btrim(p_value->>'city');
 lat:=p_value->>'latitude'; lng:=p_value->>'longitude';
 IF (lat IS NULL) IS DISTINCT FROM (lng IS NULL) THEN
  RAISE EXCEPTION 'listing_create_coordinates_invalid' USING ERRCODE='22023';
 END IF;
 IF lat IS NOT NULL THEN
  IF jsonb_typeof(p_value->'latitude') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_value->'longitude') IS DISTINCT FROM 'string'
     OR char_length(lat)>12 OR char_length(lng)>12
     OR lat !~ '^-?(0|[1-9][0-9]{0,2})([.][0-9]{1,7})?$'
     OR lng !~ '^-?(0|[1-9][0-9]{0,2})([.][0-9]{1,7})?$' THEN
   RAISE EXCEPTION 'listing_create_coordinates_invalid' USING ERRCODE='22023';
  END IF;
  IF abs(lat::numeric)>90 OR abs(lng::numeric)>180 THEN
   RAISE EXCEPTION 'listing_create_coordinates_invalid' USING ERRCODE='22023';
  END IF;
  lat:=trim_scale(lat::numeric)::text; lng:=trim_scale(lng::numeric)::text;
 END IF;
 RETURN jsonb_build_object('country',country_value,'city',city_value,'latitude',lat,'longitude',lng);
END $fn$;

CREATE FUNCTION public.normalize_listing_creation_v1(p_input jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path=pg_catalog,public,pg_temp
AS $fn$
DECLARE basics_value jsonb; price_value jsonb; location_value jsonb; attrs jsonb:='{}';
  e record; lang text;
BEGIN
 IF p_input IS NULL OR octet_length(p_input::text)>65536 THEN
  RAISE EXCEPTION 'listing_create_shape_invalid' USING ERRCODE='22023';
 END IF;
 PERFORM public.require_listing_create_keys_v1(p_input,
   ARRAY['basics','price','category_path','location','attributes','details','language']);
 basics_value:=public.normalize_listing_basics_v1(p_input->'basics');
 IF basics_value->>'description'='' OR basics_value->>'condition' IS NULL THEN
  RAISE EXCEPTION 'listing_create_basics_required' USING ERRCODE='22023';
 END IF;
 price_value:=public.normalize_listing_price_v1(p_input->'price');
 IF public.listing_create_category_path_valid_v1(p_input->'category_path') IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'listing_create_category_invalid' USING ERRCODE='22023';
 END IF;
 location_value:=public.normalize_listing_create_location_v1(p_input->'location');
 PERFORM public.require_listing_create_keys_v1(p_input->'attributes',
  ARRAY['manufacturer','part_number','oem_number','vehicle_brand','vehicle_model','vehicle_year','engine']);
 FOR e IN SELECT key,value FROM jsonb_each(p_input->'attributes') LOOP
  IF jsonb_typeof(e.value) IS DISTINCT FROM 'string' OR char_length(e.value #>> '{}')>
      (CASE WHEN e.key='vehicle_year' THEN 20 ELSE 160 END) THEN
   RAISE EXCEPTION 'listing_create_attributes_invalid' USING ERRCODE='22023';
  END IF;
  attrs:=attrs||jsonb_build_object(e.key,btrim(e.value #>> '{}'));
 END LOOP;
 IF jsonb_typeof(p_input->'details') IS DISTINCT FROM 'object' THEN
  RAISE EXCEPTION 'listing_create_details_invalid' USING ERRCODE='22023';
 END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_input->'details'))>64 THEN
  RAISE EXCEPTION 'listing_create_details_invalid' USING ERRCODE='22023';
 END IF;
 FOR e IN SELECT key,value FROM jsonb_each(p_input->'details') LOOP
  IF e.key !~ '^[A-Za-z][A-Za-z0-9_]{0,63}$' OR e.key IN
    ('constructor','prototype','detailCategory','manufacturer','partNumber','oemNumber',
     'vehicleBrand','vehicleModel','vehicleYear','engine')
     OR jsonb_typeof(e.value) IS DISTINCT FROM 'string' OR char_length(e.value #>> '{}')>1000 THEN
   RAISE EXCEPTION 'listing_create_details_invalid' USING ERRCODE='22023';
  END IF;
 END LOOP;
 IF jsonb_typeof(p_input->'language') IS DISTINCT FROM 'string' THEN
  RAISE EXCEPTION 'listing_create_language_invalid' USING ERRCODE='22023';
 END IF;
 lang:=lower(btrim(p_input->>'language'));
 IF char_length(p_input->>'language')>35 OR lang !~ '^[a-z]{2,3}(-[a-z0-9]{2,8}){0,3}$' THEN
  RAISE EXCEPTION 'listing_create_language_invalid' USING ERRCODE='22023';
 END IF;
 -- Versioned canonical form. Preserve detail text; no translation or unit conversion.
 RETURN jsonb_build_object('version',1,'basics',basics_value,'price',price_value,
  'category_path',p_input->'category_path','location',location_value,'attributes',attrs,
  'details',p_input->'details','language',lang);
END $fn$;

CREATE FUNCTION public.lock_listing_creation_actor_v1(p_expected_identity_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,public,auth,pg_temp
AS $fn$
DECLARE actor uuid:=auth.uid(); active_id uuid; identity_row public.identities%ROWTYPE;
BEGIN
 IF actor IS NULL OR p_expected_identity_id IS NULL THEN
  RAISE EXCEPTION 'listing_price_identity_required' USING ERRCODE='42501';
 END IF;
 SELECT p.active_identity_id INTO active_id FROM public.profiles p WHERE p.id=actor FOR UPDATE;
 IF active_id IS NULL OR active_id IS DISTINCT FROM p_expected_identity_id THEN
  RAISE EXCEPTION 'listing_price_identity_changed' USING ERRCODE='42501';
 END IF;
 SELECT i.* INTO identity_row FROM public.identities i WHERE i.id=active_id AND i.status='active' FOR SHARE;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
 END IF;
 IF identity_row.type='business' THEN
  PERFORM 1 FROM public.business_members m WHERE m.business_account_id=identity_row.business_account_id
    AND m.user_id=actor AND m.status='active' FOR SHARE;
  IF NOT FOUND THEN
   RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
  END IF;
 END IF;
 IF public.current_user_has_identity_access(active_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
 END IF;
 RETURN active_id;
END $fn$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC,anon,authenticated,service_role;
