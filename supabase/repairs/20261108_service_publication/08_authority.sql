-- Old browser writers cannot bypass the service command/revision boundary.
REVOKE ALL ON FUNCTION public.save_my_service_v2(uuid,text,text,text,text,text,numeric,text,text,text,text,text,double precision,double precision),
 public.set_my_service_status_v2(uuid,text),public.add_my_service_image_v2(uuid,text,text,text,text),
 public.set_my_service_primary_image_v2(uuid,uuid),public.delete_my_service_image_v2(uuid,uuid)
 FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.can_manage_service_storage_v2(p_service_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,auth,storage,pg_temp AS $f$
 SELECT false;
$f$;
REVOKE ALL ON public.services,public.service_images FROM PUBLIC,anon,authenticated;

DO $authority$ DECLARE name text;BEGIN
 FOREACH name IN ARRAY ARRAY['events','heads','commands','closed_requests','gallery'] LOOP
  EXECUTE format('ALTER TABLE service_publication_private.%I ENABLE ROW LEVEL SECURITY',name);
  EXECUTE format('REVOKE ALL ON service_publication_private.%I FROM PUBLIC,anon,authenticated,service_role',name);
  EXECUTE format('GRANT SELECT ON service_publication_private.%I TO selqiro_listing_final_writer_v1',name);
  EXECUTE format('CREATE POLICY service_final_read ON service_publication_private.%I FOR SELECT TO selqiro_listing_final_writer_v1 USING(true)',name);
 END LOOP;
END $authority$;
GRANT USAGE ON SCHEMA service_publication_private TO selqiro_listing_final_writer_v1,selqiro_listing_contact_writer_v1;
GRANT SELECT ON public.services,public.service_images TO selqiro_listing_final_writer_v1;
CREATE POLICY service_writer_read ON public.services FOR SELECT TO selqiro_listing_final_writer_v1 USING(true);
CREATE POLICY service_writer_read ON public.service_images FOR SELECT TO selqiro_listing_final_writer_v1 USING(true);
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA service_publication_private FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA service_publication_private TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION service_publication_private.contact_snapshot(uuid),service_publication_private.capture_message_card(),
 service_publication_private.select_current_context() TO selqiro_listing_contact_writer_v1;
GRANT DELETE ON horse_publication_private.thread_context,service_publication_private.thread_context TO selqiro_listing_contact_writer_v1;

GRANT CREATE ON SCHEMA service_publication_private TO selqiro_listing_final_writer_v1;
ALTER FUNCTION service_publication_private.close_published_attempt(uuid,uuid,uuid) OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA service_publication_private FROM selqiro_listing_final_writer_v1;
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1,selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.claim_service_publication_cleanup_v1(uuid,uuid,uuid,uuid) OWNER TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.record_service_publication_cleanup_v1(uuid,uuid,uuid,uuid,uuid,uuid,text) OWNER TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.contact_my_service_provider_v1(uuid,uuid,uuid,uuid) OWNER TO selqiro_listing_contact_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1,selqiro_listing_contact_writer_v1;

REVOKE ALL ON FUNCTION public.prepare_my_service_publication_v1(uuid,uuid,uuid,uuid,text,jsonb,jsonb,jsonb),
 public.get_my_service_publication_attempt_v1(uuid,uuid,uuid,uuid),public.publish_my_service_v1(uuid,uuid,uuid,uuid),
 public.cancel_my_service_publication_v1(uuid,uuid,uuid,uuid),public.get_my_service_publication_snapshot_v1(uuid,uuid,uuid),
 public.get_my_service_publications_v1(uuid,uuid,integer,integer),public.set_my_service_activity_v1(uuid,uuid,uuid,text,text,text),
 public.get_my_service_publication_image_binding_v1(uuid,uuid,uuid,uuid,uuid),public.get_my_service_media_binding_v1(uuid,uuid,uuid,integer),
 public.get_public_service_media_binding_v1(uuid,integer),public.claim_service_publication_cleanup_v1(uuid,uuid,uuid,uuid),
 public.record_service_publication_cleanup_v1(uuid,uuid,uuid,uuid,uuid,uuid,text),public.get_public_service_v1(uuid),
 public.search_public_services_v1(text,text,text,text,text,integer,integer),public.contact_my_service_provider_v1(uuid,uuid,uuid,uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_my_service_publication_v1(uuid,uuid,uuid,uuid,text,jsonb,jsonb,jsonb),
 public.get_my_service_publication_attempt_v1(uuid,uuid,uuid,uuid),public.publish_my_service_v1(uuid,uuid,uuid,uuid),
 public.cancel_my_service_publication_v1(uuid,uuid,uuid,uuid),public.get_my_service_publication_snapshot_v1(uuid,uuid,uuid),
 public.get_my_service_publications_v1(uuid,uuid,integer,integer),public.set_my_service_activity_v1(uuid,uuid,uuid,text,text,text),
 public.get_my_service_publication_image_binding_v1(uuid,uuid,uuid,uuid,uuid),public.get_my_service_media_binding_v1(uuid,uuid,uuid,integer),
 public.contact_my_service_provider_v1(uuid,uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_service_v1(uuid),public.search_public_services_v1(text,text,text,text,text,integer,integer)
 TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_service_media_binding_v1(uuid,integer),
 public.claim_service_publication_cleanup_v1(uuid,uuid,uuid,uuid),public.record_service_publication_cleanup_v1(uuid,uuid,uuid,uuid,uuid,uuid,text)
 TO service_role;

-- Preserve a legacy/inactive category pair when the owner changes other fields.
create or replace function
  public.validate_service_category_pair_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if TG_OP='UPDATE' and NEW.category is not distinct from OLD.category and NEW.subcategory is not distinct from OLD.subcategory then return NEW; end if;
  new.category :=
    nullif(
      btrim(
        coalesce(
          new.category,
          ''
        )
      ),
      ''
    );

  new.subcategory :=
    nullif(
      btrim(
        coalesce(
          new.subcategory,
          ''
        )
      ),
      ''
    );

  if not public.is_valid_service_category_pair_v2(
    new.category,
    new.subcategory
  ) then
    raise exception
      'Service category selection is invalid.'
      using errcode = '22023';
  end if;

  return new;
end;
$function$;
