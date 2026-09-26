\set ON_ERROR_STOP on
begin;
set local statement_timeout = '30s';
create function pg_temp.search_ok(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'SEARCH_ASSERT_FAILED: %', p_label; end if;
  raise notice 'SEARCH_PASS: %', p_label;
end;
$$;
create function pg_temp.search_reject(p_sql text, p_state text, p_label text) returns void language plpgsql as $$
declare failed boolean := false;
begin
  begin execute p_sql;
  exception when others then
    if sqlstate <> p_state then raise; end if;
    failed := true;
  end;
  perform pg_temp.search_ok(failed, p_label);
end;
$$;
do $$ begin
  execute format('grant usage on schema %I to anon, authenticated, service_role',
    (select nspname from pg_namespace where oid = pg_my_temp_schema()));
end; $$;
grant execute on function pg_temp.search_ok(boolean,text), pg_temp.search_reject(text,text,text)
  to anon, authenticated, service_role;

insert into public.identities(id,type,user_id,display_name,status)
select ('11111111-1111-4111-8111-' || lpad(n::text,12,'0'))::uuid, 'private',
  ('22222222-2222-4222-8222-' || lpad(n::text,12,'0'))::uuid, 'Seller ' || n,
  case when n = 4 then 'suspended' else 'active' end from generate_series(1,5) n;
insert into public.identity_profiles(identity_id,display_name,slug,avatar_url)
select id,display_name,'seller-' || right(id::text,1),'https://example.invalid/avatar.jpg'
from public.identities where right(id::text,1) <> '5';
insert into public.listings(id, identity_id,user_id,title,description,category,subcategory,condition,
  country,city,location,price,price_amount,status,active_until,created_at,details,search_text,search_vector,listing_lat,listing_lng)
select n,'11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000001',
  'Tavaline kuulutus ' || n,'Avalik kirjeldus','vehicles','cars','used','Estonia','Paide',
  'salajaneaadress','1000',1000,'active',now()+interval '1 day',now()-interval '1 day'+n*interval '1 second',
  '{"detailCategory":"passenger_cars","private_note":"siseparool","gearbox":"automatic"}'::jsonb,
  'salajaneotsing',to_tsvector('simple','salajaneotsing salajaneaadress siseparool'),58.881,25.557
from generate_series(1,90) n;
update public.listings set title='Audi eriline pakkumine',description='Mugav sõiduauto',
  price='2500 USD',price_amount=2500 where id=1;
update public.listings set subcategory='trucks_commercial',details='{"detailCategory":"trucks"}' where id=2;
update public.listings set category='home_garden',subcategory='furniture',condition='new',details='{}' where id=3;
update public.listings set condition='damaged',details='{"detailCategory":"suv_offroad"}' where id=4;
update public.listings set status='paused' where id=5;
update public.listings set status='sold' where id=6;
update public.listings set status='draft' where id=7;
update public.listings set active_until=now()-interval '1 second' where id=8;
update public.listings set active_until=null where id=9;
update public.listings set identity_id='11111111-1111-4111-8111-000000000004' where id=10;
update public.listings set identity_id='11111111-1111-4111-8111-000000000005' where id=11;
update public.listings set identity_id=null where id=12;
update public.listings set details='{"detailCategory":123}',price_amount='NaN' where id=13;
update public.listings set user_id='22222222-2222-4222-8222-000000000002',
 identity_id='11111111-1111-4111-8111-000000000002' where id=14;
update public.listings set user_id='22222222-2222-4222-8222-000000000003',
 identity_id='11111111-1111-4111-8111-000000000003' where id=15;
update public.listings set created_at=(select created_at from public.listings where id=90) where id=89;
update public.listings set image='https://example.invalid/fallback.jpg',description=repeat('x',400) where id=16;
insert into public.listing_images(id,listing_id,original_url,thumb_url,is_primary,sort_order,created_at) values
 ('33333333-3333-4333-8333-000000000001',16,'https://example.invalid/a.jpg',null,false,0,now()),
 ('33333333-3333-4333-8333-000000000002',16,'https://example.invalid/b.jpg','https://example.invalid/b-thumb.jpg',true,8,now()),
 ('33333333-3333-4333-8333-000000000003',16,'https://example.invalid/c.jpg',null,null,0,now());
insert into public.user_blocks(id,blocker_id,blocked_id) values
 (1,'44444444-4444-4444-8444-000000000001','22222222-2222-4222-8222-000000000002'),
 (2,'22222222-2222-4222-8222-000000000003','44444444-4444-4444-8444-000000000001');

create temp table search_baseline as select
 (select md5(coalesce(jsonb_agg(to_jsonb(l) order by id)::text,'')) from public.listings l) listings,
 (select md5(coalesce(jsonb_agg(to_jsonb(l) order by id)::text,'')) from public.listing_images l) images,
 (select md5(coalesce(jsonb_agg(to_jsonb(l) order by id)::text,'')) from public.identities l) identities,
 (select md5(coalesce(jsonb_agg(to_jsonb(l) order by id)::text,'')) from public.identity_profiles l) profiles,
 (select md5(coalesce(jsonb_agg(to_jsonb(l) order by id)::text,'')) from public.user_blocks l) blocks;

select pg_temp.search_ok((select prosecdef and provolatile='s' and proconfig @>
 array['search_path=pg_catalog, public, auth, pg_temp'] from pg_proc where oid=
 'public.search_public_listings_v1(text,text,text,text,text,text,integer,integer)'::regprocedure),
 'definer stable fixed search path');
select pg_temp.search_ok(not exists(select 1 from pg_proc p, lateral aclexplode(p.proacl) a where
 p.oid='public.search_public_listings_v1(text,text,text,text,text,text,integer,integer)'::regprocedure and a.grantee=0),
 'no PUBLIC execute grant');
select pg_temp.search_ok(has_function_privilege('anon',
 'public.search_public_listings_v1(text,text,text,text,text,text,integer,integer)','execute'), 'anon execute granted');
select pg_temp.search_ok(has_function_privilege('authenticated',
 'public.search_public_listings_v1(text,text,text,text,text,text,integer,integer)','execute'), 'authenticated execute granted');
select pg_temp.search_ok(has_function_privilege('service_role',
 'public.search_public_listings_v1(text,text,text,text,text,text,integer,integer)','execute'), 'service execute granted');

set local role anon;
select pg_temp.search_ok((public.search_public_listings_v1()->>'total_count')='83','public visibility before total count');
select pg_temp.search_ok(jsonb_array_length(public.search_public_listings_v1()->'items')=24,'bounded default page');
select pg_temp.search_ok(public.search_public_listings_v1()#>>'{items,0,content_id}'='90'
 and public.search_public_listings_v1()#>>'{items,1,content_id}'='89','newest tie broken by ID');
select pg_temp.search_ok(public.search_public_listings_v1()->>'next_offset'='24'
 and public.search_public_listings_v1()->>'has_more'='true','next page and has more');
select pg_temp.search_ok(public.search_public_listings_v1(p_result_offset=>83)->>'total_count'='83'
 and public.search_public_listings_v1(p_result_offset=>83)->'items'='[]'::jsonb
 and public.search_public_listings_v1(p_result_offset=>83)->>'has_more'='false','empty final page retains total');
select pg_temp.search_ok(public.search_public_listings_v1(p_result_offset=>72)->>'next_offset' is null
 and jsonb_array_length(public.search_public_listings_v1(p_result_offset=>72)->'items')=11,'short final page');
select pg_temp.search_ok(public.search_public_listings_v1(p_search_query=>'Audi')->>'total_count'='1'
 and public.search_public_listings_v1(p_search_query=>'Audi')#>>'{items,0,content_id}'='1','match beyond old first 30 page');
select pg_temp.search_ok(public.search_public_listings_v1(p_search_query=>'aUdI')->>'total_count'='1','case insensitive words');
select pg_temp.search_ok(public.search_public_listings_v1(p_search_query=>'Audi sõiduauto')->>'total_count'='1','AND across public title description');
select pg_temp.search_ok(public.search_public_listings_v1(p_search_query=>'Audi puuduv')->>'total_count'='0','all query words required');
select pg_temp.search_ok(public.search_public_listings_v1(p_search_query=>'aud')->>'total_count'='0','no unadvertised prefix matching');
select pg_temp.search_ok(public.search_public_listings_v1(p_search_query=>'')->>'total_count'='83'
 and public.search_public_listings_v1(p_search_query=>null)->>'total_count'='83','empty or null query means browse');
select pg_temp.search_ok(public.search_public_listings_v1(p_search_query=>'!!!')->>'total_count'='0','punctuation query not broadened');
select pg_temp.search_ok(public.search_public_listings_v1(p_search_query=>'salajaneaadress')->>'total_count'='0','no raw location keyword inference');
select pg_temp.search_ok(public.search_public_listings_v1(p_search_query=>'salajaneotsing')->>'total_count'='0','no old search vector inference');
select pg_temp.search_ok(public.search_public_listings_v1(p_search_query=>'siseparool')->>'total_count'='0','no arbitrary details inference');
select pg_temp.search_ok(public.search_public_listings_v1(p_search_query=>'automatic')->>'total_count'='0','no hidden unsupported gearbox filter');
select pg_temp.search_ok(public.search_public_listings_v1(p_search_query=>'DROP TABLE listings')->>'total_count'='0','SQL-looking query treated as words');
select pg_temp.search_ok(public.search_public_listings_v1(p_category=>'home_garden')->>'total_count'='1','root filter before page');
select pg_temp.search_ok(public.search_public_listings_v1(p_category=>'vehicles',p_subcategory=>'trucks_commercial')->>'total_count'='1','subcategory filter');
select pg_temp.search_ok(public.search_public_listings_v1(p_category=>'vehicles',p_subcategory=>'cars',p_detail_category=>'suv_offroad')->>'total_count'='1','detail category filter');
select pg_temp.search_ok(public.search_public_listings_v1(p_category=>'vehicles',p_subcategory=>'furniture')->>'total_count'='0','mismatched category path not broadened');
select pg_temp.search_ok(public.search_public_listings_v1(p_category=>'unknown_category')->>'total_count'='0','unknown category no results not fallback');
select pg_temp.search_ok(public.search_public_listings_v1(p_condition=>'new')->>'total_count'='1'
 and public.search_public_listings_v1(p_condition=>'damaged')->>'total_count'='1','condition filter before page');
select pg_temp.search_ok(public.search_public_listings_v1(p_search_query=>'Audi',p_condition=>'damaged')->>'total_count'='0','filters intersect');
select pg_temp.search_ok(public.search_public_listings_v1(p_location_query=>'paide')->>'total_count'='83','public city query');
select pg_temp.search_ok(public.search_public_listings_v1(p_location_query=>'Estonia')->>'total_count'='83','public country query');
select pg_temp.search_ok(public.search_public_listings_v1(p_location_query=>'salajaneaadress')->>'total_count'='0','location query excludes raw address');
select pg_temp.search_ok(public.search_public_listings_v1(p_location_query=>'%')->>'total_count'='0','location percent is literal');
select pg_temp.search_ok(public.search_public_listings_v1(p_location_query=>'_')->>'total_count'='0','location underscore is literal');
select pg_temp.search_ok(public.search_public_listings_v1(p_search_query=>'Audi')#>>'{items,0,price}'='2500 USD'
 and public.search_public_listings_v1(p_search_query=>'Audi')#>'{items,0,currency}'='null'::jsonb,'original money label no fabricated currency');
select pg_temp.search_ok(public.search_public_listings_v1(p_search_query=>'Audi')#>>'{items,0,price_amount}'='2500'
 and jsonb_typeof(public.search_public_listings_v1(p_search_query=>'Audi')#>'{items,0,price_amount}')='string','numeric money returned as text');
select pg_temp.search_ok(not exists(select 1 from jsonb_array_elements(public.search_public_listings_v1(p_result_limit=>60)->'items') x
 where x ?| array['user_id','identity_id','listing_lat','listing_lng','location','details','search_text','search_vector','is_premium','ai_raw']), 'card private fields absent');
select pg_temp.search_ok(not exists(select 1 from jsonb_array_elements(public.search_public_listings_v1()->'items') x
 where x->>'content_type'<>'listing' or jsonb_typeof(x->'content_id')<>'string'), 'content type and lossless string IDs');
select pg_temp.search_reject('select * from public.listings','42501','anon no direct table access in restrictive fixture');

-- Argument failures are errors, never a fabricated zero-match success.
do $$ declare args text; begin
  foreach args in array array[
    'p_result_limit=>0','p_result_limit=>61','p_result_limit=>null',
    'p_result_offset=>-1','p_result_offset=>100001','p_result_offset=>null',
    'p_search_query=>repeat(''x'',161)','p_location_query=>repeat(''x'',161)',
    'p_category=>''vehicles;drop''','p_category=>''Vehicles''',
    'p_subcategory=>''cars''','p_detail_category=>''passenger_cars''',
    'p_category=>''vehicles'',p_detail_category=>''passenger_cars''',
    'p_condition=>''all''','p_condition=>''unknown'''
  ] loop
    perform pg_temp.search_reject('select public.search_public_listings_v1('||args||')','22023','invalid argument '||args);
  end loop;
end; $$;
reset role;

-- Inspect an older result rather than only the default first page.
select pg_temp.search_ok((select x->>'image_url'='https://example.invalid/b-thumb.jpg'
 from jsonb_array_elements(public.search_public_listings_v1(p_result_offset=>60,p_result_limit=>30)->'items') x
 where x->>'content_id'='16'), 'primary image selection deterministic with null flags');
select pg_temp.search_ok((select char_length(x->>'description_preview')=280
 from jsonb_array_elements(public.search_public_listings_v1(p_result_offset=>60,p_result_limit=>30)->'items') x
 where x->>'content_id'='16'), 'bounded public description preview');
select pg_temp.search_ok((select x->'price_amount'='null'::jsonb and x->'detail_category'='null'::jsonb
 from jsonb_array_elements(public.search_public_listings_v1(p_result_offset=>60,p_result_limit=>30)->'items') x
 where x->>'content_id'='13'), 'malformed stored scalar values not reinterpreted');
select pg_temp.search_ok((select count(*)=1 from jsonb_array_elements(public.search_public_listings_v1(p_result_offset=>60,p_result_limit=>30)->'items') x
 where x->>'content_id'='9'),'legacy null expiry preserves established public eligibility');

select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-000000000001',true);
set local role authenticated;
select pg_temp.search_ok(public.search_public_listings_v1()->>'total_count'='81','both block directions excluded before count');
select pg_temp.search_ok(not exists(select 1 from jsonb_array_elements(public.search_public_listings_v1(p_result_offset=>60,p_result_limit=>30)->'items') x
 where x->>'content_id' in ('14','15')),'blocked offers absent from older page');
select pg_temp.search_ok(public.search_public_listings_v1(p_result_offset=>81)->'items'='[]'::jsonb,'block-aware end page');
select pg_temp.search_reject('select public.search_public_listings_v1(p_identity_id=>null)','42883','no client ownership override parameter');
reset role;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-000000000001',true);
set local role authenticated;
select pg_temp.search_ok(public.search_public_listings_v1()->>'total_count'='83','owner does not gain private listing visibility');
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role service_role;
select pg_temp.search_ok(public.search_public_listings_v1()->>'total_count'='83','service call still applies public visibility');
reset role;

select pg_temp.search_ok((select listings=(select md5(coalesce(jsonb_agg(to_jsonb(l) order by id)::text,'')) from public.listings l)
 and images=(select md5(coalesce(jsonb_agg(to_jsonb(l) order by id)::text,'')) from public.listing_images l)
 and identities=(select md5(coalesce(jsonb_agg(to_jsonb(l) order by id)::text,'')) from public.identities l)
 and profiles=(select md5(coalesce(jsonb_agg(to_jsonb(l) order by id)::text,'')) from public.identity_profiles l)
 and blocks=(select md5(coalesce(jsonb_agg(to_jsonb(l) order by id)::text,'')) from public.user_blocks l)
 from search_baseline),'every synthetic source row unchanged by search calls');
select 'PUBLIC_LISTING_SEARCH_SUITE=PASS';
rollback;
