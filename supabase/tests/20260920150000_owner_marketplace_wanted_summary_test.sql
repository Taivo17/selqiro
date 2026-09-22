-- Run only inside the local runner's outer transaction; it always ROLLBACKs.
-- Real local schema/roles; generated fixture users, never existing user content.
create function pg_temp.assert_wanted_summary(p_ok boolean, p_label text)
returns void language plpgsql as $f$
begin
  if p_ok is not true then raise exception 'ASSERT_FAILED: %', p_label; end if;
  raise notice 'PASS: %', p_label;
end;
$f$;

-- Pure projection: no original JSON/private keys may escape.
do $pure$
declare
  v_base jsonb := '{"schema_version":1,"branch":"wanted","wanted":{
    "budget":{"mode":"maximum","amount":5000,"currency":"EUR","secret":"NEVER_RETURN"},
    "search_area":{"country_code":"EE","city_or_municipality":"Rapla maakond","region":"Rapla maakond","exact_address":"NEVER_RETURN"},
    "health_preferences":"NEVER_RETURN"},"secret":"NEVER_RETURN"}';
  v_result jsonb;
  v_bad jsonb;
  v_amount jsonb;
begin
  v_result := public.project_horse_wanted_owner_summary_v1(v_base);
  perform pg_temp.assert_wanted_summary(v_result = '{"version":1,
    "budget":{"mode":"maximum","amount":5000,"currency":"EUR"},
    "search_area":{"country_code":"EE","city_or_municipality":"Rapla maakond","region":"Rapla maakond"}}',
    'exact minimized wanted budget and search-area output');
  perform pg_temp.assert_wanted_summary(position('NEVER_RETURN' in v_result::text)=0,
    'private address, preferences and arbitrary JSON keys are not returned');
  foreach v_amount in array array['0','1.25','9999999999.99']::jsonb[] loop
    perform pg_temp.assert_wanted_summary(
      public.project_horse_wanted_owner_summary_v1(jsonb_set(v_base,'{wanted,budget,amount}',v_amount))
        #> '{budget,amount}' = v_amount, 'supported exact numeric boundary ' || v_amount::text);
  end loop;
  foreach v_amount in array array['-1','10000000000','1.001','"5000"','true','{}','[]','null']::jsonb[] loop
    v_result := public.project_horse_wanted_owner_summary_v1(jsonb_set(v_base,'{wanted,budget,amount}',v_amount));
    perform pg_temp.assert_wanted_summary(v_result -> 'budget' = 'null'::jsonb
      and v_result #>> '{search_area,country_code}' = 'EE',
      'invalid budget is isolated, never cast or inferred: ' || v_amount::text);
  end loop;
  foreach v_bad in array array[
    '{"mode":"contact","currency":"EUR"}',
    '{"mode":"contact","currency":"EUR","amount":null}'
  ]::jsonb[] loop
    v_result := public.project_horse_wanted_owner_summary_v1(jsonb_set(v_base,'{wanted,budget}',v_bad));
    perform pg_temp.assert_wanted_summary(v_result -> 'budget' =
      '{"mode":"contact","amount":null,"currency":"EUR"}'::jsonb, 'flexible budget stays explicit');
  end loop;
  foreach v_bad in array array[
    '{"mode":"contact","currency":"EUR","amount":5000}',
    '{"mode":"maximum","currency":"USD","amount":1}',
    '{"mode":"maximum","currency":"EUR"}',
    '{"mode":"future","currency":"EUR"}', '[]','null'
  ]::jsonb[] loop
    perform pg_temp.assert_wanted_summary(
      public.project_horse_wanted_owner_summary_v1(jsonb_set(v_base,'{wanted,budget}',v_bad)) -> 'budget' = 'null',
      'unsupported budget shape/currency cannot become flexible');
  end loop;
  v_result := public.project_horse_wanted_owner_summary_v1(
    jsonb_set(v_base,'{wanted,search_area}','{"country_code":"EE"}'));
  perform pg_temp.assert_wanted_summary(v_result -> 'search_area' =
    '{"country_code":"EE","city_or_municipality":null,"region":null}', 'missing optional area stays missing');
  foreach v_bad in array array[
    '{"country_code":"FI"}', '{"country_code":"EE","region":7}',
    '{"country_code":"EE","city_or_municipality":{}}','[]','null',
    jsonb_build_object('country_code','EE','region',repeat('x',161))::text
  ]::jsonb[] loop
    v_result := public.project_horse_wanted_owner_summary_v1(jsonb_set(v_base,'{wanted,search_area}',v_bad));
    perform pg_temp.assert_wanted_summary(v_result -> 'search_area' = 'null'
      and v_result #>> '{budget,amount}' = '5000', 'invalid area isolated without losing valid budget');
  end loop;
  foreach v_bad in array array['null','[]','{}','{"schema_version":2,"branch":"wanted"}',
    '{"schema_version":1,"branch":"specific"}','{"schema_version":1,"branch":"wanted","wanted":[]}']::jsonb[] loop
    perform pg_temp.assert_wanted_summary(public.project_horse_wanted_owner_summary_v1(v_bad) =
      '{"version":1,"budget":null,"search_area":null}', 'unsupported details are explicit unknown, not fake values');
  end loop;
end;
$pure$;

-- Check catalog/ACLs separately from synthetic input behavior.
do $contract$
declare v_rpc oid := 'public.get_my_marketplace_items_v2(integer,integer,text,text,uuid)'::regprocedure;
  v_helper oid := 'public.project_horse_wanted_owner_summary_v1(jsonb)'::regprocedure;
  v_old_out text[]; v_new_out text[];
begin
  select array_agg(n||':'||format_type(t,null) order by ordinal_position) into v_old_out
  from pg_proc p cross join lateral unnest(p.proallargtypes,p.proargmodes,p.proargnames)
    with ordinality a(t,m,n,ordinal_position)
  where p.oid='public.get_my_marketplace_items_v1(integer,integer,text,text,uuid)'::regprocedure and m='t';
  select array_agg(n||':'||format_type(t,null) order by ordinal_position) into v_new_out
  from pg_proc p cross join lateral unnest(p.proallargtypes,p.proargmodes,p.proargnames)
    with ordinality a(t,m,n,ordinal_position) where p.oid=v_rpc and m='t';
  perform pg_temp.assert_wanted_summary(v_new_out = v_old_out || array['wanted_summary:jsonb'],
    'old 25 output columns unchanged; only wanted_summary appended');
  perform pg_temp.assert_wanted_summary((select prosecdef and provolatile='s'
    and proconfig=array['search_path=pg_catalog, public, auth, pg_temp'] and pronargdefaults=5
    from pg_proc where oid=v_rpc), 'stable security-definer read with fixed search path and five defaults');
  perform pg_temp.assert_wanted_summary((select not prosecdef and provolatile='i'
    from pg_proc where oid=v_helper), 'pure helper is immutable and not security definer');
  perform pg_temp.assert_wanted_summary(
    has_function_privilege('authenticated',v_rpc,'EXECUTE') and has_function_privilege('service_role',v_rpc,'EXECUTE')
    and not has_function_privilege('anon',v_rpc,'EXECUTE')
    and not has_function_privilege('authenticated',v_helper,'EXECUTE')
    and not has_function_privilege('anon',v_helper,'EXECUTE')
    and not has_function_privilege('service_role',v_helper,'EXECUTE'), 'explicit RPC and private-helper ACLs');
  perform pg_temp.assert_wanted_summary(not has_table_privilege('authenticated','public.horse_offers','SELECT')
    and not has_table_privilege('authenticated','public.marketplace_item_projection_v1','SELECT'),
    'no direct browser access added to canonical horse data or projection');
end;
$contract$;

-- All generated rows below are rolled back, including automatic auth/profile rows.
create temporary table wanted_test_context(key text primary key, value uuid) on commit drop;
grant select on wanted_test_context to authenticated, service_role;
do $users$
declare v_user uuid; v_identity uuid; v_kind text; v_email text;
begin
  foreach v_kind in array array['owner','foreign'] loop
    v_user := gen_random_uuid(); v_email := 'wanted-read-'||v_user::text||'@selqiro.local';
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
      raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
    values ('00000000-0000-0000-0000-000000000000',v_user,'authenticated','authenticated',v_email,'',now(),
      '{}'::jsonb,'{}'::jsonb,now(),now(),'','','','');
    insert into public.profiles(id,email) values(v_user,v_email) on conflict(id) do update set email=excluded.email;
    select id into v_identity from public.identities where type='private' and user_id=v_user order by created_at limit 1;
    if v_identity is null then
      insert into public.identities(id,type,user_id,display_name,status,created_by,updated_by)
      values(gen_random_uuid(),'private',v_user,'Wanted read fixture','active',v_user,v_user) returning id into v_identity;
    end if;
    update public.profiles set active_identity_id=v_identity where id=v_user;
    insert into wanted_test_context values(v_kind,v_user),(v_kind||'_identity',v_identity);
  end loop;
end;
$users$;

do $fixtures$
declare v_user uuid; v_identity uuid; v_foreign uuid; v_foreign_identity uuid; v_wanted uuid:=gen_random_uuid();
  v_category uuid:=gen_random_uuid(); v_listing bigint;
begin
  select value into v_user from wanted_test_context where key='owner';
  select value into v_identity from wanted_test_context where key='owner_identity';
  select value into v_foreign from wanted_test_context where key='foreign';
  select value into v_foreign_identity from wanted_test_context where key='foreign_identity';
  insert into public.horse_offers(id,identity_id,created_by_user_id,updated_by_user_id,offer_type,title,description,
    price_type,currency,details,city,region,location_text,horse_lat,horse_lng,created_at,updated_at)
  values(v_wanted,v_identity,v_user,v_user,'wanted','WANTED READ NEEDLE','Owner wanted read test',
    'contact','EUR','{"schema_version":1,"branch":"wanted","wanted":{
      "budget":{"mode":"maximum","amount":5000,"currency":"EUR"},
      "search_area":{"country_code":"EE","city_or_municipality":"Rapla maakond","region":"Rapla maakond","secret":"PRIVATE_MARKER"}},
      "private_extra":"PRIVATE_MARKER"}',
    null,null,'PRIVATE_MARKER',58.88,25.55,'2026-01-03T10:00:00Z','2026-01-03T10:00:00Z');
  insert into wanted_test_context values('wanted',v_wanted);
  insert into public.horse_offers(identity_id,created_by_user_id,updated_by_user_id,offer_type,title,description,price_type,price_amount,
    city,region,details,created_at,updated_at)
  values(v_identity,v_user,v_user,'sale','SALE READ NEEDLE','Sale fixture','fixed',20000,'Tartu','Tartumaa',
    '{"schema_version":1,"branch":"specific"}','2026-01-02T10:00:00Z','2026-01-02T10:00:00Z'),
    (v_foreign_identity,v_foreign,v_foreign,'wanted','FOREIGN READ NEEDLE','Foreign fixture','contact',null,null,null,
    '{"schema_version":1,"branch":"wanted","wanted":{"budget":{"mode":"maximum","amount":99,"currency":"EUR"},"search_area":{"country_code":"EE","region":"Foreign"}}}',
    '2026-01-04T10:00:00Z','2026-01-04T10:00:00Z');
  insert into public.listings(user_id,identity_id,created_by_user_id,updated_by_user_id,title,description,
    price,price_amount,image,status,category,subcategory,condition,country,city,location,search_text,active_until,created_at)
  values(v_user,v_identity,v_user,v_user,'GENERIC READ NEEDLE','Generic fixture','1200',1200,'https://example.invalid/wanted-read.jpg',
    'active','vehicles','tractors','used','Estonia','Paide','Paide','generic read needle',
    now()+interval '30 days','2026-01-01T10:00:00Z') returning id into v_listing;
  insert into public.store_categories(id,user_id,identity_id,parent_id,name,sort_order)
    values(v_category,v_user,v_identity,null,'Wanted read fixture',0);
  insert into public.listing_store_categories(listing_id,store_category_id) values(v_listing,v_category);
  insert into wanted_test_context values('category',v_category);
end;
$fixtures$;

-- Helpers in pg_temp use real caller authorization; explicitly grant temp usage.
do $grant_temp$
begin
  execute format('grant usage on schema %I to authenticated, service_role',
    (select nspname from pg_namespace where oid=pg_my_temp_schema()));
end;
$grant_temp$;
grant execute on function pg_temp.assert_wanted_summary(boolean,text) to authenticated, service_role;
select set_config('request.jwt.claim.sub',(select value::text from wanted_test_context where key='owner'),true);
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claims',jsonb_build_object('sub',
  (select value::text from wanted_test_context where key='owner'),'role','authenticated')::text,true);
set local role authenticated;

do $read_behavior$
declare v_item record; v_old jsonb; v_new jsonb; v_filter text; v_search text; v_cat uuid;
  v_limit integer; v_offset integer; v_wanted uuid;
begin
  select value into v_wanted from wanted_test_context where key='wanted';
  select * into v_item from public.get_my_marketplace_items_v2() where content_id=v_wanted::text;
  perform pg_temp.assert_wanted_summary(v_item.wanted_summary #>> '{budget,amount}'='5000'
    and v_item.wanted_summary #>> '{search_area,region}'='Rapla maakond'
    and v_item.price_amount is null and v_item.city is null and v_item.region is null,
    'real owner read: budget/search-area separate from price/actual-location');
  perform pg_temp.assert_wanted_summary(position('PRIVATE_MARKER' in to_jsonb(v_item)::text)=0,
    'real RPC does not expose full details, private location or coordinates');
  perform pg_temp.assert_wanted_summary((select count(*)=3 from public.get_my_marketplace_items_v2()),
    'owner receives two horses and one listing, never foreign identity');
  perform pg_temp.assert_wanted_summary(not exists(select 1 from public.get_my_marketplace_items_v2()
    where (content_type='listing' or content_variant='sale') and wanted_summary is not null),
    'non-wanted rows have null wanted summary');
  foreach v_limit in array array[null,0,1,2,500,999] loop
    foreach v_offset in array array[null,-1,0,1,2,1000001] loop
      select coalesce(jsonb_agg(to_jsonb(x) - 'ordinality' order by x.ordinality),'[]') into v_old
        from public.get_my_marketplace_items_v1(v_limit,v_offset) with ordinality x;
      select coalesce(jsonb_agg(to_jsonb(x) - array['ordinality','wanted_summary'] order by x.ordinality),'[]') into v_new
        from public.get_my_marketplace_items_v2(v_limit,v_offset) with ordinality x;
      perform pg_temp.assert_wanted_summary(v_old=v_new,'exact row/order parity for limit/offset');
    end loop;
  end loop;
  foreach v_filter in array array['all','draft','active','sold','closed','nonsense',' ALL '] loop
    foreach v_search in array array['','NEEDLE','GENERIC','SALE','WANTED','missing','Rapla maakond'] loop
      select coalesce(jsonb_agg(to_jsonb(x)-'ordinality' order by x.ordinality),'[]') into v_old
        from public.get_my_marketplace_items_v1(30,0,v_filter,v_search) with ordinality x;
      select coalesce(jsonb_agg(to_jsonb(x)-array['ordinality','wanted_summary'] order by x.ordinality),'[]') into v_new
        from public.get_my_marketplace_items_v2(30,0,v_filter,v_search) with ordinality x;
      perform pg_temp.assert_wanted_summary(v_old=v_new,'status/search parity; no hidden new search predicates');
    end loop;
  end loop;
  select value into v_cat from wanted_test_context where key='category';
  perform pg_temp.assert_wanted_summary((select count(*)=1 and bool_and(content_type='listing')
    from public.get_my_marketplace_items_v2(30,0,'all','',v_cat)),
    'existing category scope stays listing-only');
end;
$read_behavior$;
reset role;

-- Foreign principal gets only its own item; empty auth gets no protected content.
select set_config('request.jwt.claim.sub',(select value::text from wanted_test_context where key='foreign'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',
  (select value::text from wanted_test_context where key='foreign'),'role','authenticated')::text,true);
set local role authenticated;
select pg_temp.assert_wanted_summary((select count(*)=1 and bool_and(title='FOREIGN READ NEEDLE')
  from public.get_my_marketplace_items_v2()),'foreign principal is isolated by inherited owner authority');
reset role;
set local role service_role;
select pg_temp.assert_wanted_summary((select count(*)=1 and bool_and(title='FOREIGN READ NEEDLE')
  from public.get_my_marketplace_items_v2()),'service_role caller still uses stored active identity');
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
set local role authenticated;
do $no_actor$
declare v_old_count integer; v_new_count integer; v_old_state text; v_new_state text;
begin
  begin select count(*) into v_old_count from public.get_my_marketplace_items_v1();
  exception when others then v_old_state:=sqlstate; end;
  begin select count(*) into v_new_count from public.get_my_marketplace_items_v2();
  exception when others then v_new_state:=sqlstate; end;
  perform pg_temp.assert_wanted_summary(
    (v_old_state is null and v_new_state is null and v_old_count=0 and v_new_count=0)
    or (v_old_state is not null and v_old_state=v_new_state),
    'missing principal has the same denial as the existing owner contract');
end;
$no_actor$;
reset role;
set local role anon;
do $anonymous$
begin
  begin
    perform * from public.get_my_marketplace_items_v2();
  exception when insufficient_privilege then
    raise notice 'PASS: anonymous execute is denied';
    return;
  end;
  raise exception 'ASSERT_FAILED: anonymous execution unexpectedly succeeded';
end;
$anonymous$;
reset role;
select 'WANTED_SUMMARY_TESTS=PASS';
