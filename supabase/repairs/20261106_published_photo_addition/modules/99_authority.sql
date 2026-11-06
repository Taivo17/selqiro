-- Exactly four browser RPCs use the existing closed final writer.
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.get_my_managed_listing_image_addition_v1(uuid,uuid,bigint,uuid,uuid) OWNER TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.prepare_my_managed_listing_image_addition_v1(uuid,uuid,bigint,uuid,uuid,text,jsonb) OWNER TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.cancel_my_managed_listing_image_addition_v1(uuid,uuid,bigint,uuid,uuid) OWNER TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.append_my_managed_listing_image_v1(uuid,uuid,bigint,uuid,uuid,uuid,uuid,text) OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
REVOKE ALL ON FUNCTION listing_publication_private.protect_managed_image_addition_v1(),
 listing_publication_private.managed_image_gallery_projection_v1(jsonb,boolean),
 listing_publication_private.managed_image_family_v1(uuid),
 listing_publication_private.managed_image_origins_v1(uuid),
 listing_publication_private.managed_image_root_v1(uuid),
 listing_publication_private.managed_image_addition_receipt_v1(uuid),
 listing_publication_private.allocate_managed_publication_attempt_v1(uuid,uuid,uuid,bytea,jsonb,jsonb),
 listing_publication_private.normalize_managed_image_addition_v1(jsonb),
 listing_publication_private.require_managed_image_policies_v1(),
 listing_publication_private.managed_image_addition_journey_v1(uuid,uuid,uuid,boolean),
 listing_publication_private.lock_managed_image_addition_parent_v1(uuid,uuid,bigint,uuid,boolean),
 listing_publication_private.managed_image_addition_status_v1(uuid,uuid,bigint,uuid,uuid),
 public.get_my_managed_listing_image_addition_v1(uuid,uuid,bigint,uuid,uuid),
 public.prepare_my_managed_listing_image_addition_v1(uuid,uuid,bigint,uuid,uuid,text,jsonb),
 public.cancel_my_managed_listing_image_addition_v1(uuid,uuid,bigint,uuid,uuid),
 public.append_my_managed_listing_image_v1(uuid,uuid,bigint,uuid,uuid,uuid,uuid,text),
 listing_publication_private.assert_ordinary_publication_v1(uuid),
 listing_publication_private.managed_image_cleanup_task_v2(uuid,uuid,uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION listing_publication_private.protect_managed_image_addition_v1(),
 listing_publication_private.managed_image_gallery_projection_v1(jsonb,boolean),
 listing_publication_private.managed_image_family_v1(uuid),
 listing_publication_private.managed_image_origins_v1(uuid),
 listing_publication_private.managed_image_root_v1(uuid),
 listing_publication_private.managed_image_addition_receipt_v1(uuid),
 listing_publication_private.allocate_managed_publication_attempt_v1(uuid,uuid,uuid,bytea,jsonb,jsonb),
 listing_publication_private.normalize_managed_image_addition_v1(jsonb),
 listing_publication_private.require_managed_image_policies_v1(),
 listing_publication_private.managed_image_addition_journey_v1(uuid,uuid,uuid,boolean),
 listing_publication_private.lock_managed_image_addition_parent_v1(uuid,uuid,bigint,uuid,boolean),
 listing_publication_private.managed_image_addition_status_v1(uuid,uuid,bigint,uuid,uuid),
 listing_publication_private.assert_ordinary_publication_v1(uuid),
 listing_publication_private.managed_image_cleanup_task_v2(uuid,uuid,uuid)
 TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION public.get_my_managed_listing_image_addition_v1(uuid,uuid,bigint,uuid,uuid),
 public.prepare_my_managed_listing_image_addition_v1(uuid,uuid,bigint,uuid,uuid,text,jsonb),
 public.cancel_my_managed_listing_image_addition_v1(uuid,uuid,bigint,uuid,uuid),
 public.append_my_managed_listing_image_v1(uuid,uuid,bigint,uuid,uuid,uuid,uuid,text)
 TO authenticated;
