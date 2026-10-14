-- DORMANT; load after fixture-gated 01_state.sql. Source derivation recorded in DERIVATION.json.
CREATE OR REPLACE FUNCTION public.guard_listing_price_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE normalized jsonb; changed boolean;
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'listing_price_direct_truncate_forbidden' USING ERRCODE='42501';
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.price_kind IS NOT NULL AND NOT (current_user='selqiro_listing_final_writer_v1' AND EXISTS(
      SELECT 1 FROM listing_publication_private.publications p
      WHERE p.listing_id=OLD.id AND p.state='deleting')) THEN
      RAISE EXCEPTION 'listing_price_direct_delete_forbidden' USING ERRCODE='42501';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.price_revision IS DISTINCT FROM 0 THEN
      RAISE EXCEPTION 'listing_price_revision_server_owned' USING ERRCODE='42501';
    END IF;
    -- Creation has not switched yet. Old raw-price creation remains possible;
    -- no structured create endpoint is exposed by this existing-listing slice.
    IF NEW.price_kind IS NULL THEN
      IF NEW.currency IS NOT NULL THEN
        RAISE EXCEPTION 'listing_price_shape_invalid' USING ERRCODE='22023';
      END IF;
      RETURN NEW;
    END IF;
    IF current_user<>'selqiro_listing_final_writer_v1' THEN
      RAISE EXCEPTION 'listing_price_structured_create_not_enabled' USING ERRCODE='42501';
    END IF;
    normalized:=public.normalize_listing_price_v1(jsonb_build_object('kind',NEW.price_kind,
      'amount',NEW.price_amount::text,'currency',NEW.currency));
    NEW.price_amount:=(normalized->>'amount')::numeric;
    NEW.currency:=normalized->>'currency'; NEW.price:=public.listing_price_legacy_label_v1(normalized);
    NEW.price_revision:=1;
    RETURN NEW;
  END IF;
  IF NEW.price_revision IS DISTINCT FROM OLD.price_revision THEN
    RAISE EXCEPTION 'listing_price_revision_server_owned' USING ERRCODE='42501';
  END IF;
  IF OLD.price_kind IS NOT NULL AND NEW.price_kind IS NULL THEN
    RAISE EXCEPTION 'listing_price_downgrade_forbidden' USING ERRCODE='42501';
  END IF;
  IF OLD.price_kind IS NOT NULL AND
     ROW(NEW.id,NEW.identity_id,NEW.user_id,NEW.created_by_user_id)
     IS DISTINCT FROM ROW(OLD.id,OLD.identity_id,OLD.user_id,OLD.created_by_user_id) THEN
    RAISE EXCEPTION 'listing_price_owner_tuple_immutable' USING ERRCODE='42501';
  END IF;
  changed := ROW(NEW.price_kind,NEW.price_amount,NEW.currency,NEW.price)
    IS DISTINCT FROM ROW(OLD.price_kind,OLD.price_amount,OLD.currency,OLD.price);
  IF NOT changed THEN RETURN NEW; END IF;
  IF (OLD.price_kind IS NOT NULL OR NEW.price_kind IS NOT NULL)
      AND current_user <> 'selqiro_listing_price_writer_v1' THEN
    RAISE EXCEPTION 'listing_price_direct_write_forbidden' USING ERRCODE='42501';
  END IF;
  IF OLD.price_revision = 9223372036854775807 THEN
    RAISE EXCEPTION 'listing_price_revision_exhausted' USING ERRCODE='54000';
  END IF;
  IF NEW.price_kind IS NULL THEN
    IF NEW.currency IS NOT NULL THEN
      RAISE EXCEPTION 'listing_price_shape_invalid' USING ERRCODE='22023';
    END IF;
    NEW.price_revision := OLD.price_revision + 1;
    RETURN NEW;
  END IF;
  normalized := public.normalize_listing_price_v1(jsonb_build_object(
    'kind',NEW.price_kind,'amount',NEW.price_amount::text,'currency',NEW.currency));
  NEW.price_amount := (normalized->>'amount')::numeric;
  NEW.currency := normalized->>'currency';
  NEW.price := public.listing_price_legacy_label_v1(normalized);
  IF ROW(NEW.price_kind,NEW.price_amount,NEW.currency,NEW.price)
     IS DISTINCT FROM ROW(OLD.price_kind,OLD.price_amount,OLD.currency,OLD.price) THEN
    NEW.price_revision := OLD.price_revision + 1;
  END IF;
  RETURN NEW;
END $fn$;

CREATE FUNCTION listing_publication_private.apply_final(p_attempt uuid,p_normalized jsonb,p_confirmation text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET timezone='UTC' AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE; r public.listings%ROWTYPE;
 n jsonb:=p_normalized; actor uuid:=auth.uid(); active_id uuid; at_time timestamptz:=clock_timestamp();
BEGIN
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_attempt FOR UPDATE;
 IF NOT FOUND OR a.actor_user_id IS DISTINCT FROM actor OR a.state<>'open' OR a.payload IS DISTINCT FROM n
  OR a.expires_at<=at_time THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 active_id:=a.identity_id;
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

 INSERT INTO listing_publication_private.publications(attempt_id,listing_id,confirmation_sha256,published_at,state)
 VALUES(a.id,r.id,p_confirmation,at_time,'published');
 INSERT INTO public.listing_images(listing_id,user_id,original_url,medium_url,thumb_url,sort_order,is_primary)
 SELECT r.id,actor,'/api/v2/listing-media/'||a.id::text||'/'||s.ordinal::text,
 '/api/v2/listing-media/'||a.id::text||'/'||s.ordinal::text,
 '/api/v2/listing-media/'||a.id::text||'/'||s.ordinal::text,s.ordinal,s.ordinal=0
 FROM listing_publication_private.slots s WHERE s.attempt_id=a.id ORDER BY s.ordinal;
 UPDATE public.listings SET image=(SELECT i.original_url FROM public.listing_images i
  WHERE i.listing_id=r.id AND i.is_primary) WHERE id=r.id;
 PERFORM listing_publication_private.assert_final_last_boundary(a.id);
 INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at)
 SELECT o.id,o.bucket_id,o.object_path,'published_source',listing_publication_private.object_cleanup_state(o.id),at_time
 FROM listing_publication_private.objects o WHERE o.attempt_id=a.id AND o.kind='source';
 UPDATE listing_publication_private.attempts SET state='published',payload=NULL,closed_at=at_time WHERE id=a.id;
 RETURN r.id;
END $f$;
REVOKE ALL ON FUNCTION listing_publication_private.apply_final(uuid,jsonb,text) FROM PUBLIC,anon,authenticated,service_role;
