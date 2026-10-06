-- CLOSED LOCAL CANDIDATE. No role grants; never put these lab files in migrations.
CREATE FUNCTION public.create_my_listing_with_price_v1(
 p_request_key uuid,p_expected_identity_id uuid,p_input jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp
SET lock_timeout='2s'
SET timezone='UTC'
AS $fn$
DECLARE actor uuid:=auth.uid(); active_id uuid; n jsonb; fingerprint bytea;
 receipt public.listing_creation_receipts_v1%ROWTYPE; r public.listings%ROWTYPE;
 replayed boolean:=false; at_time timestamptz;
BEGIN
 -- Following a waited profile lock, a new statement must see the committed receipt.
 -- A fixed old transaction snapshot is not silently accepted by this v1 contract.
 IF current_setting('transaction_isolation') <> 'read committed' THEN
  RAISE EXCEPTION 'listing_create_read_committed_required' USING ERRCODE='25001';
 END IF;
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'listing_create_request_key_invalid' USING ERRCODE='22023';
 END IF;
 -- Re-authorize EVERY attempt, including a replay after membership/identity changes.
 active_id:=public.lock_listing_creation_actor_v1(p_expected_identity_id);
 n:=public.normalize_listing_creation_v1(p_input);
 fingerprint:=public.listing_creation_fingerprint_v1(n);
 SELECT x.* INTO receipt FROM public.listing_creation_receipts_v1 x
   WHERE x.actor_user_id=actor AND x.request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  IF receipt.identity_id IS DISTINCT FROM active_id
     OR receipt.payload_sha256 IS DISTINCT FROM fingerprint THEN
   RAISE EXCEPTION 'listing_create_request_conflict' USING ERRCODE='22023';
  END IF;
  SELECT l.* INTO r FROM public.listings l
    WHERE l.id=receipt.listing_id AND l.identity_id=active_id
      AND l.created_at=receipt.created_at AND l.created_by_user_id=actor FOR SHARE;
  IF NOT FOUND THEN
   RAISE EXCEPTION 'listing_create_result_unavailable' USING ERRCODE='P0002';
  END IF;
  replayed:=true; -- current snapshot, no re-save/republication/renewal/AI/storage action
 ELSE
  at_time:=clock_timestamp();
  r.title:=n->'basics'->>'title'; r.description:=n->'basics'->>'description';
  r.condition:=n->'basics'->>'condition';
  r.category:=n->'category_path'->>0; r.subcategory:=coalesce(n->'category_path'->>1,'');
  r.country:=n->'location'->>'country'; r.city:=n->'location'->>'city';
  r.location:=concat_ws(' • ',nullif(r.country,''),nullif(r.city,''));
  r.listing_lat:=(n->'location'->>'latitude')::double precision;
  r.listing_lng:=(n->'location'->>'longitude')::double precision;
  r.manufacturer:=n->'attributes'->>'manufacturer'; r.part_number:=n->'attributes'->>'part_number';
  r.oem_number:=n->'attributes'->>'oem_number'; r.vehicle_brand:=n->'attributes'->>'vehicle_brand';
  r.vehicle_model:=n->'attributes'->>'vehicle_model'; r.vehicle_year:=n->'attributes'->>'vehicle_year';
  r.engine:=n->'attributes'->>'engine';
  -- One-way initial mirrors used by existing detail readers. Input cannot supply two values.
  r.details:=(n->'details')||jsonb_build_object('detailCategory',coalesce(n->'category_path'->>2,''),
    'manufacturer',r.manufacturer,'partNumber',r.part_number,'oemNumber',r.oem_number,
    'vehicleBrand',r.vehicle_brand,'vehicleModel',r.vehicle_model,'vehicleYear',r.vehicle_year,'engine',r.engine);
  INSERT INTO public.listings(
   user_id,identity_id,created_by_user_id,updated_by_user_id,title,description,condition,
   price_kind,price_amount,currency,category,subcategory,country,city,location,listing_lat,listing_lng,
   manufacturer,part_number,oem_number,vehicle_brand,vehicle_model,vehicle_year,engine,details,
   search_text,listing_language,status,created_at,active_until,image,
   ai_status,ai_enriched,ai_level,is_featured,is_boosted)
  VALUES(actor,active_id,actor,actor,r.title,r.description,r.condition,
   n->'price'->>'kind',(n->'price'->>'amount')::numeric,n->'price'->>'currency',
   r.category,r.subcategory,r.country,r.city,r.location,r.listing_lat,r.listing_lng,
   r.manufacturer,r.part_number,r.oem_number,r.vehicle_brand,r.vehicle_model,r.vehicle_year,r.engine,r.details,
   public.listing_basics_search_text_v1(r),n->>'language','active',at_time,at_time+interval '2160 hours',NULL,
   'not_started',false,'none',false,false)
  RETURNING * INTO r;
  -- Insertion of receipt and listing must both succeed in the same transaction.
  INSERT INTO public.listing_creation_receipts_v1(actor_user_id,request_key,identity_id,payload_sha256,listing_id,created_at)
   VALUES(actor,p_request_key,active_id,fingerprint,r.id,at_time);
 END IF;
 RETURN jsonb_build_object('schema_version',1,'request_key',p_request_key::text,
   'replayed',replayed,'snapshot',public.listing_basics_snapshot_v1(r));
END $fn$;
REVOKE ALL ON FUNCTION public.create_my_listing_with_price_v1(uuid,uuid,jsonb)
 FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION public.create_my_listing_with_price_v1(uuid,uuid,jsonb) IS
 'Closed local creation/idempotency candidate. Row+price+receipt only; no image/store-category/AI side effects. Not activated.';
