-- GENERATED from source-verified retained declarations. No content/preference backfill.
-- Modules SHA-256: 1c2fab3754c4b9127646ad981934f86ad0931eafdc4cfabaed165244a9fed43d
-- Report plan: materialized single-row stages and strict one-row control gates.
BEGIN;
 SET LOCAL search_path=pg_catalog,pg_temp;
 SET LOCAL lock_timeout='3s';SET LOCAL statement_timeout='45s';SET LOCAL timezone='UTC';
 DO $lock$ BEGIN PERFORM pg_advisory_xact_lock(hashtextextended('selqiro-provider-controls-v1',0));END $lock$;
 LOCK TABLE public.profiles,public.identities,public.business_accounts,public.business_members,public.identity_profiles,
 public.user_blocks,public.listings,public.horse_offers,public.services IN ACCESS SHARE MODE;
 CREATE TEMP TABLE provider_controls_before ON COMMIT DROP AS WITH retained AS MATERIALIZED (WITH retained AS MATERIALIZED (WITH function_facts AS (SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname<>ALL(ARRAY['public.get_my_service_activity_v1','public.get_my_service_publication_snapshot_v2','public.get_my_service_publications_v2','public.renew_my_service_activity_v1','service_publication_private.activity_fields','service_publication_private.is_public','service_publication_private.start_activity']::text[]) AND (n.nspname IN('listing_publication_private','listing_contact_private','messaging_private_v2','horse_publication_private','service_publication_private')
  OR n.nspname||'.'||p.proname=ANY(ARRAY['horse_publication_private.accept_shown_policies','horse_publication_private.assert_actor','horse_publication_private.attempt_publication_matches','horse_publication_private.capture_message_card','horse_publication_private.cleanup_object_eligible','horse_publication_private.close_published_attempt','horse_publication_private.confirmations','horse_publication_private.contact_snapshot','horse_publication_private.current_policies','horse_publication_private.effective_active_until','horse_publication_private.guard_image_request_key','horse_publication_private.has_current_publication','horse_publication_private.is_public','horse_publication_private.lifecycle_snapshot','horse_publication_private.lock_cleanup_context','horse_publication_private.lock_lifecycle','horse_publication_private.media_binding','horse_publication_private.normalize_content','horse_publication_private.normalize_gallery','horse_publication_private.protect_command','horse_publication_private.public_fields','horse_publication_private.public_price','horse_publication_private.require_policies','horse_publication_private.require_ready_image','horse_publication_private.retired_web_deleted','horse_publication_private.reusable_confirmation','horse_publication_private.snapshot','listing_contact_private.guard_conversation','listing_contact_private.guard_message','listing_contact_private.guard_participant','listing_contact_private.peer_name_hosted_v1','listing_contact_private.peer_ready','listing_contact_private.positive_id','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_key','listing_contact_private.require_member','listing_contact_private.require_peer','listing_contact_private.require_unblocked','listing_publication_private.account_source_cleanup_eligible_v1','listing_publication_private.allocate_managed_publication_attempt_v1','listing_publication_private.apply_delete','listing_publication_private.apply_final','listing_publication_private.assert_final_last_boundary','listing_publication_private.assert_hosted_install_context','listing_publication_private.assert_hosted_preview_actor','listing_publication_private.assert_hosted_preview_object','listing_publication_private.assert_ordinary_publication_v1','listing_publication_private.close_locked_attempt','listing_publication_private.expire_one_v1','listing_publication_private.final_material','listing_publication_private.final_receipt','listing_publication_private.guard_cleanup_web_fence','listing_publication_private.guard_closed_journey_request','listing_publication_private.guard_legacy_source_in_multipart','listing_publication_private.guard_managed_image','listing_publication_private.guard_managed_listing','listing_publication_private.guard_source_grant_after_no_release','listing_publication_private.hosted_completed_source_deleted_v1','listing_publication_private.hosted_retired_web_deleted_v1','listing_publication_private.hosted_s3_query_value_v1','listing_publication_private.hosted_storage_contract_ready','listing_publication_private.legacy_cleanup_state_before_multipart_v2','listing_publication_private.lock_account_upload_actor_v1','listing_publication_private.lock_account_upload_identity_v1','listing_publication_private.lock_managed_image_addition_parent_v1','listing_publication_private.lock_managed_listing_images_v1','listing_publication_private.lock_multipart_cleanup_context','listing_publication_private.lock_multipart_context','listing_publication_private.lock_multipart_object','listing_publication_private.lock_retired_web_cleanup_context_v1','listing_publication_private.lock_source_release_grant','listing_publication_private.lock_upload_service_actor','listing_publication_private.lock_web_context','listing_publication_private.managed_image_addition_journey_v1','listing_publication_private.managed_image_addition_receipt_v1','listing_publication_private.managed_image_addition_status_v1','listing_publication_private.managed_image_cleanup_task_v2','listing_publication_private.managed_image_family_v1','listing_publication_private.managed_image_gallery_projection_v1','listing_publication_private.managed_image_origins_v1','listing_publication_private.managed_image_root_v1','listing_publication_private.multipart_binding','listing_publication_private.no_truncate','listing_publication_private.normalize_images','listing_publication_private.normalize_managed_image_addition_v1','listing_publication_private.object_cleanup_state','listing_publication_private.pending_upload_reserved_bytes_v1','listing_publication_private.protect_cleanup','listing_publication_private.protect_managed_image_addition_v1','listing_publication_private.protect_managed_image_presentation_v1','listing_publication_private.protect_multipart_abort','listing_publication_private.protect_multipart_attempt','listing_publication_private.protect_multipart_auxiliary','listing_publication_private.protect_multipart_session','listing_publication_private.protect_object','listing_publication_private.protect_publication','listing_publication_private.protect_slot','listing_publication_private.protect_source_no_release','listing_publication_private.protect_source_recorded_no_release','listing_publication_private.protect_source_release_intent','listing_publication_private.protect_source_release_tracking','listing_publication_private.protect_upload_grant','listing_publication_private.protect_web_completion','listing_publication_private.protect_web_image','listing_publication_private.protect_write_reconcile_job','listing_publication_private.protect_write_settlement','listing_publication_private.require_actor','listing_publication_private.require_managed_image_actor_v1','listing_publication_private.require_managed_image_policies_v1','listing_publication_private.require_policies','listing_publication_private.require_upload_service','listing_publication_private.reserve_upload_dispatch_v1','listing_publication_private.snapshot','listing_publication_private.track_source_grant_birth','listing_publication_private.upload_binding','listing_publication_private.validate_managed_image_intent_v1','listing_publication_private.validate_web_intent','listing_publication_private.web_binding','listing_publication_private.web_receipt','messaging_private_v2.bucket_ready','messaging_private_v2.exact_thread','messaging_private_v2.guard_account_block','messaging_private_v2.identity_card','messaging_private_v2.photo_receipt','messaging_private_v2.protect_attached_photo','messaging_private_v2.require_thread','messaging_private_v2.safe_legacy_path','messaging_private_v2.set_block','public.advance_horse_offer_edit_revision_v1','public.append_my_managed_listing_image_v1','public.apply_horse_offer_draft_patch_v1','public.build_horse_offer_content_snapshot_v1','public.cancel_my_horse_publication_v1','public.cancel_my_listing_publication_journey_v2','public.cancel_my_listing_publication_v1','public.cancel_my_managed_listing_image_addition_v1','public.cancel_my_message_photo_v2','public.claim_horse_publication_cleanup_v1','public.claim_listing_account_source_cleanup_v1','public.claim_listing_cleanup_for_attempt_v2','public.claim_listing_cleanup_v1','public.claim_listing_multipart_complete_v2','public.claim_listing_multipart_part_v2','public.claim_listing_published_source_cleanup_v1','public.claim_listing_retired_web_cleanup_v1','public.claim_listing_web_image_v1','public.claim_message_photo_cleanup_v2','public.claim_message_photo_upload_v2','public.contact_my_horse_seller_v1','public.contact_my_listing_seller_v1','public.current_user_has_identity_access','public.delete_my_published_listing_v1','public.finish_message_photo_cleanup_v2','public.finish_message_photo_upload_v2','public.get_listing_multipart_v2','public.get_my_horse_media_binding_v1','public.get_my_horse_offer_edit_snapshot_v1','public.get_my_horse_offer_lifecycle_v1','public.get_my_horse_offer_publication_snapshot_v1','public.get_my_horse_offer_v1','public.get_my_horse_publication_attempt_v1','public.get_my_horse_publication_image_binding_v1','public.get_my_listing_cleanup_summary_v1','public.get_my_listing_conversation_v1','public.get_my_listing_conversation_v2','public.get_my_listing_media_binding_v2','public.get_my_listing_publication_confirmation_v1','public.get_my_listing_publication_journey_v2','public.get_my_listing_publication_v1','public.get_my_listing_retired_web_cleanup_v1','public.get_my_managed_listing_image_addition_v1','public.get_my_managed_listing_images_v1','public.get_my_managed_listing_v2','public.get_my_message_photo_binding_v2','public.get_my_message_thread_v2','public.get_public_horse_media_binding_v1','public.get_public_horse_offer_v1','public.get_public_listing_media_binding_v1','public.get_required_publication_policies_v1','public.get_selqiro_hosted_preview_readiness_v1','public.guard_listing_price_v2','public.hide_my_thread_v2','public.is_valid_service_category_pair_v2','public.list_my_listing_conversations_v1','public.list_my_message_threads_v2','public.listing_actor_uid_hosted_v1','public.listing_basics_search_text_v1','public.listing_contact_is_managed_v1','public.listing_contact_visible_v1','public.listing_create_category_path_valid_v1','public.listing_final_guard_state_v1','public.listing_price_currency_scale_v1','public.listing_price_legacy_label_v1','public.listing_price_read_model_v1','public.listing_price_tuple_valid_v1','public.lock_listing_creation_actor_v1','public.mark_my_thread_read_v2','public.normalize_listing_basics_v1','public.normalize_listing_create_location_v1','public.normalize_listing_creation_v1','public.normalize_listing_price_v1','public.prepare_listing_multipart_cleanup_v2','public.prepare_listing_web_write_v1','public.prepare_my_horse_publication_v1','public.prepare_my_listing_publication_v1','public.prepare_my_managed_listing_image_addition_v1','public.prevent_horse_offer_publication_event_update_v1','public.prevent_publication_policy_acceptance_update','public.prevent_publication_policy_document_version_mutation','public.public_listing_search_document_v1','public.publish_my_horse_offer_v1','public.publish_my_listing_v1','public.record_horse_publication_cleanup_v1','public.record_listing_account_source_cleanup_v1','public.record_listing_cleanup_v1','public.record_listing_multipart_abort_v2','public.record_listing_multipart_completed_v2','public.record_listing_multipart_created_v2','public.record_listing_multipart_verified_v2','public.record_listing_published_source_cleanup_v1','public.record_listing_retired_web_cleanup_v1','public.record_listing_web_ready_v1','public.remove_my_managed_listing_image_v1','public.renew_my_horse_offer_activity_v1','public.require_listing_create_keys_v1','public.require_my_active_identity_v2','public.require_my_current_publication_policy_acceptance_v1','public.reserve_listing_multipart_v2','public.reserve_my_message_photo_v2','public.search_public_marketplace_v1','public.send_my_listing_message_v1','public.send_my_message_v2','public.set_listing_primary_image_v2','public.set_my_horse_offer_status_v1','public.set_my_managed_listing_primary_image_v1','public.set_my_thread_block_v2','public.set_publication_policy_acceptance_snapshot','public.set_v2_profile_content_updated_at','public.update_horse_offer_search_vector_v1','public.update_my_horse_offer_draft_v1','public.validate_horse_offer_current_publication_event_v1','public.validate_horse_offer_image_identity_v1','public.validate_horse_offer_publication_event_v1','public.validate_service_image_identity_v2','listing_publication_private.assert_non_horse_attempt_v1','listing_publication_private.lock_account_source_cleanup_context_v1','listing_publication_private.multipart_object_fully_deleted','listing_publication_private.protect_attempt','listing_publication_private.require_attempt_policies_v1','listing_publication_private.upload_object_is_published_web_v1','public.add_my_service_image_v2','public.can_manage_service_storage_v2','public.cancel_my_service_publication_v1','public.claim_service_publication_cleanup_v1','public.contact_my_service_provider_v1','public.delete_my_service_image_v2','public.get_my_marketplace_message_thread_v1','public.get_my_service_media_binding_v1','public.get_my_service_publication_attempt_v1','public.get_my_service_publication_image_binding_v1','public.get_my_service_publication_snapshot_v1','public.get_my_service_publications_v1','public.get_public_profile_services_v1','public.get_public_service_media_binding_v1','public.get_public_service_v1','public.prepare_my_service_publication_v1','public.publish_my_service_v1','public.record_service_publication_cleanup_v1','public.save_my_service_v2','public.search_public_services_v1','public.set_my_service_activity_v1','public.set_my_service_primary_image_v2','public.set_my_service_status_v2','public.validate_service_category_pair_v2','service_publication_private.accept_shown_policies','service_publication_private.advance_revision','service_publication_private.assert_actor','service_publication_private.attempt_publication_matches','service_publication_private.capture_message_card','service_publication_private.cleanup_object_eligible','service_publication_private.close_published_attempt','service_publication_private.contact_snapshot','service_publication_private.content','service_publication_private.content_snapshot','service_publication_private.current_policies','service_publication_private.guard_gallery','service_publication_private.guard_image_request_key','service_publication_private.has_current_publication','service_publication_private.image_projection','service_publication_private.is_public','service_publication_private.lock_cleanup_context','service_publication_private.media_binding','service_publication_private.normalize_content','service_publication_private.normalize_gallery','service_publication_private.protect_receipt','service_publication_private.public_fields','service_publication_private.require_policies','service_publication_private.require_ready_image','service_publication_private.retired_web_deleted','service_publication_private.select_current_context','service_publication_private.snapshot','service_publication_private.visible_to_viewer']::text[])) AND n.nspname||'.'||p.proname<>ALL(ARRAY['public.get_marketplace_listings','public.get_marketplace_listings_nearby','public.get_store_by_slug','public.search_public_listings_v1','public.search_public_listings_v2','public.search_public_marketplace_v1','public.search_public_services_v1']::text[])
 UNION ALL SELECT x.name,x.signature,x.facts,x.acl
 FROM jsonb_to_recordset('[{"name":"public.search_public_marketplace_v1","signature":"public.search_public_marketplace_v1(text, text, text, text, text, text, integer, integer, uuid)","facts":{"kind":"f","owner":"postgres","language":"plpgsql","parallel":"u","leakproof":false,"definition":"CREATE OR REPLACE FUNCTION public.search_public_marketplace_v1(p_search_query text DEFAULT ''''::text, p_category text DEFAULT NULL::text, p_subcategory text DEFAULT NULL::text, p_detail_category text DEFAULT NULL::text, p_condition text DEFAULT NULL::text, p_location_query text DEFAULT ''''::text, p_result_limit integer DEFAULT 24, p_result_offset integer DEFAULT 0, p_identity_id uuid DEFAULT NULL::uuid)\n RETURNS jsonb\n LANGUAGE plpgsql\n STABLE SECURITY DEFINER\n SET search_path TO ''pg_catalog'', ''public'', ''auth'', ''pg_temp''\n SET plan_cache_mode TO ''force_custom_plan''\nAS $function$\nDECLARE q text:=btrim(coalesce(p_search_query,''''));loc text:=btrim(coalesce(p_location_query,''''));\n cat text:=nullif(btrim(p_category),'''');sub text:=nullif(btrim(p_subcategory),'''');\n detail text:=nullif(btrim(p_detail_category),'''');cond text:=nullif(btrim(p_condition),'''');\n actor uuid:=public.listing_actor_uid_hosted_v1();query tsquery;result jsonb;\nBEGIN\n IF char_length(q)>160 OR char_length(loc)>160 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 60\n  OR p_result_offset IS NULL OR p_result_offset NOT BETWEEN 0 AND 100000 THEN\n  RAISE EXCEPTION ''marketplace_search_input'' USING ERRCODE=''22023''; END IF;\n IF (cat IS NOT NULL AND (length(cat)>120 OR cat!~''^[a-z][a-z0-9_]*$''))\n  OR (sub IS NOT NULL AND (length(sub)>160 OR sub!~''^[a-z][a-z0-9_]*$'' OR cat IS NULL))\n  OR (detail IS NOT NULL AND (length(detail)>160 OR detail!~''^[a-z][a-z0-9_]*$'' OR sub IS NULL))\n  OR (cond IS NOT NULL AND cond NOT IN(''new'',''used'',''damaged''))\n  OR (cat=''horses'' AND (detail IS NOT NULL OR (sub IS NOT NULL AND sub NOT IN(''sale'',''free_transfer'',''lease'',''co_rider'',''wanted'')))) THEN\n  RAISE EXCEPTION ''marketplace_search_filters'' USING ERRCODE=''22023''; END IF;\n query:=plainto_tsquery(''pg_catalog.simple''::regconfig,q);\n WITH ordinary AS MATERIALIZED(\n  SELECT ''listing''::text content_type,l.id::text content_id,l.id numeric_id,NULL::uuid horse_id,l.created_at,\n   jsonb_build_object(''content_type'',''listing'',''content_id'',l.id::text,''offer_type'',NULL,\n    ''title'',l.title,''description_preview'',left(l.description,280),\n    ''price'',public.listing_price_read_model_v1(l.price_kind,l.price_amount,l.currency,l.price_revision,l.price),\n    ''category'',l.category,''subcategory'',l.subcategory,\n    ''detail_category'',CASE WHEN jsonb_typeof(l.details->''detailCategory'')=''string'' THEN l.details->>''detailCategory'' END,\n    ''condition'',l.condition,''country'',l.country,''city'',l.city,\n    ''image_url'',coalesce(img.thumb_url,img.medium_url,img.original_url,l.image),\n    ''seller_name'',ip.display_name,''seller_slug'',ip.slug,''seller_avatar_url'',ip.avatar_url,''seller_type'',i.type,''created_at'',l.created_at) card\n  FROM public.listings l JOIN public.identities i ON i.id=l.identity_id AND i.status=''active''\n  JOIN public.identity_profiles ip ON ip.identity_id=i.id\n  LEFT JOIN LATERAL(SELECT li.thumb_url,li.medium_url,li.original_url FROM public.listing_images li WHERE li.listing_id=l.id\n   ORDER BY li.is_primary DESC NULLS LAST,li.sort_order ASC NULLS LAST,li.created_at ASC NULLS LAST,li.id LIMIT 1) img ON true\n  WHERE l.status=''active'' AND (l.active_until IS NULL OR l.active_until>now())\n   AND (p_identity_id IS NULL OR l.identity_id=p_identity_id)\n   AND (q='''' OR public.public_listing_search_document_v1(l.title,l.description,l.category,l.subcategory,l.details)@@query)\n   AND (cat IS NULL OR l.category=cat) AND (sub IS NULL OR l.subcategory=sub)\n   AND (detail IS NULL OR (jsonb_typeof(l.details->''detailCategory'')=''string'' AND l.details->>''detailCategory''=detail))\n   AND (cond IS NULL OR l.condition=cond)\n   AND (loc='''' OR strpos(lower(coalesce(l.city,'''')||'' ''||coalesce(l.country,'''')),lower(loc))>0)\n   AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL AND\n    ((b.blocker_id=actor AND b.blocked_id=l.user_id) OR (b.blocked_id=actor AND b.blocker_id=l.user_id)))\n ), horses AS MATERIALIZED(\n  SELECT ''horse_offer''::text content_type,h.id::text content_id,NULL::bigint numeric_id,h.id horse_id,h.created_at,\n   jsonb_build_object(''content_type'',''horse_offer'',''content_id'',h.id,''offer_type'',h.offer_type,\n    ''title'',h.title,''description_preview'',left(h.description,280),''price'',horse_publication_private.public_price(h),\n    ''category'',''horses'',''subcategory'',h.offer_type,''detail_category'',NULL,''condition'',NULL,''country'',''EE'',\n    ''city'',CASE WHEN h.offer_type=''wanted'' THEN h.details#>>''{wanted,search_area,city_or_municipality}'' ELSE h.city END,\n    ''image_url'',img.original_url,''seller_name'',ip.display_name,''seller_slug'',ip.slug,\n    ''seller_avatar_url'',ip.avatar_url,''seller_type'',i.type,''created_at'',h.created_at) card\n  FROM public.horse_offers h JOIN public.identities i ON i.id=h.identity_id AND i.status=''active''\n  JOIN public.identity_profiles ip ON ip.identity_id=i.id\n  LEFT JOIN LATERAL(SELECT im.original_url FROM public.horse_offer_images im WHERE im.horse_offer_id=h.id\n   ORDER BY im.is_primary DESC,im.sort_order,im.created_at,im.id LIMIT 1) img ON true\n  WHERE horse_publication_private.is_public(h.id) AND (p_identity_id IS NULL OR h.identity_id=p_identity_id)\n   AND (cat IS NULL OR cat=''horses'') AND (sub IS NULL OR h.offer_type=sub) AND detail IS NULL AND cond IS NULL\n   AND (q='''' OR to_tsvector(''pg_catalog.simple''::regconfig,coalesce(h.title,'''')||'' ''||coalesce(h.description,'''')||'' ''||\n    coalesce(h.breed,'''')||'' ''||coalesce(h.discipline,'''')||'' ''||coalesce(h.details#>>''{wanted,preferred_breed}'',''''))@@query)\n   AND (loc='''' OR strpos(lower(CASE WHEN h.offer_type=''wanted'' THEN coalesce(h.details#>>''{wanted,search_area,city_or_municipality}'','''')\n     ELSE coalesce(h.city,'''') END||'' EE''),lower(loc))>0)\n   AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL AND\n    ((b.blocker_id=actor AND b.blocked_id=h.created_by_user_id) OR (b.blocked_id=actor AND b.blocker_id=h.created_by_user_id)))\n ), matched AS MATERIALIZED(SELECT * FROM ordinary UNION ALL SELECT * FROM horses),\n page AS(SELECT * FROM matched ORDER BY created_at DESC,content_type,numeric_id DESC,horse_id DESC LIMIT p_result_limit OFFSET p_result_offset),\n totals AS(SELECT count(*) n FROM matched)\n SELECT jsonb_build_object(''schema_version'',1,''content_scope'',''marketplace'',''sort'',''newest'',\n  ''items'',coalesce((SELECT jsonb_agg(card ORDER BY created_at DESC,content_type,numeric_id DESC,horse_id DESC) FROM page),''[]''::jsonb),\n  ''total_count'',n::text,''result_limit'',p_result_limit,''result_offset'',p_result_offset,\n  ''has_more'',n>p_result_offset::bigint+p_result_limit,\n  ''next_offset'',CASE WHEN n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit<=100000 THEN p_result_offset+p_result_limit END,\n  ''window_limit_reached'',n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit>100000)\n INTO result FROM totals;\n RETURN result;\nEND $function$\n"},"acl":[{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}]},{"name":"public.search_public_services_v1","signature":"public.search_public_services_v1(text, text, text, text, text, integer, integer)","facts":{"kind":"f","owner":"postgres","language":"plpgsql","parallel":"u","leakproof":false,"definition":"CREATE OR REPLACE FUNCTION public.search_public_services_v1(p_query text DEFAULT ''''::text, p_category text DEFAULT NULL::text, p_subcategory text DEFAULT NULL::text, p_country text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_result_limit integer DEFAULT 24, p_result_offset integer DEFAULT 0)\n RETURNS jsonb\n LANGUAGE plpgsql\n STABLE SECURITY DEFINER\n SET search_path TO ''pg_catalog'', ''pg_temp''\nAS $function$\nDECLARE items jsonb;total bigint;query text:=lower(btrim(coalesce(p_query,'''')));\nBEGIN\n IF length(query)>300 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 100 OR p_result_offset IS NULL\n OR p_result_offset<0 OR p_result_offset>1000000 OR length(p_category)>120 OR length(p_subcategory)>160\n OR length(p_country)>120 OR length(p_city)>160 THEN RAISE EXCEPTION ''service_search_invalid'' USING ERRCODE=''22023'';END IF;\n WITH candidates AS MATERIALIZED(SELECT s.* FROM public.services s WHERE service_publication_private.is_public(s.id) AND service_publication_private.visible_to_viewer(s.id)\n AND (nullif(btrim(p_category),'''') IS NULL OR s.category=btrim(p_category))\n AND (nullif(btrim(p_subcategory),'''') IS NULL OR s.subcategory=btrim(p_subcategory))\n AND (nullif(btrim(p_country),'''') IS NULL OR lower(s.country)=lower(btrim(p_country)))\n AND (nullif(btrim(p_city),'''') IS NULL OR lower(s.city)=lower(btrim(p_city)))\n AND (query='''' OR NOT EXISTS(SELECT 1 FROM regexp_split_to_table(query,''\\s+'') token\n WHERE token<>'''' AND position(token IN lower(concat_ws('' '',s.title,s.description,s.category,s.subcategory,s.country,s.city,s.location)))=0))),\n page AS(SELECT * FROM candidates ORDER BY published_at DESC,created_at DESC,id LIMIT p_result_limit OFFSET p_result_offset)\n SELECT (SELECT count(*) FROM candidates),coalesce((SELECT jsonb_agg(service_publication_private.public_fields(p)\n ORDER BY p.published_at DESC,p.created_at DESC,p.id) FROM page p),''[]''::jsonb) INTO total,items;\n RETURN jsonb_build_object(''schema_version'',1,''items'',items,''total_count'',total::text,''result_limit'',p_result_limit,\n ''result_offset'',p_result_offset,''has_more'',p_result_offset+jsonb_array_length(items)<total,\n ''next_offset'',CASE WHEN p_result_offset+jsonb_array_length(items)<total THEN p_result_offset+jsonb_array_length(items) ELSE NULL END);\nEND $function$\n"},"acl":[{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}]}]'::jsonb) x(name text,signature text,facts jsonb,acl jsonb)),relation_facts AS (SELECT n.nspname||'.'||c.relname name,
 jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'persistence',c.relpersistence,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
  'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(ad.adbin,ad.adrelid),
  'collation',CASE WHEN a.attcollation=0 THEN NULL ELSE a.attcollation::regcollation::text END) ORDER BY a.attnum),'[]')
  FROM pg_attribute a LEFT JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'definition',pg_get_constraintdef(q.oid),
  'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred,'local',q.conislocal,'inheritance',q.coninhcount,
  'no_inherit',q.connoinherit) ORDER BY q.conname),'[]') FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'nonstandard_not_null',(SELECT count(*) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype='n'
  AND (NOT q.convalidated OR NOT q.conislocal OR q.coninhcount<>0 OR q.connoinherit)),
 'inheritance',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY i.inhseqno),'[]') FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',ic.relname,'definition',pg_get_indexdef(i.indexrelid),
  'valid',i.indisvalid,'ready',i.indisready) ORDER BY ic.relname),'[]') FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid AND NOT (c.oid='public.user_blocks'::regclass AND i.indexrelid IS NOT DISTINCT FROM to_regclass('public.user_blocks_blocked_blocker_idx_v1'))),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid))
  ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND NOT (c.oid='public.services'::regclass AND t.tgname='service_activity_start') AND (n.nspname||'.'||c.relname=ANY(ARRAY['service_publication_private.events','service_publication_private.heads','service_publication_private.commands','service_publication_private.closed_requests','service_publication_private.gallery','service_publication_private.contact_receipts','service_publication_private.thread_context','service_publication_private.message_cards','public.services','public.service_images','horse_publication_private.thread_context']::text[]) OR NOT (t.tgrelid::regclass::text,t.tgname) IN (VALUES ('public.services','service_revision'),('public.service_images','service_gallery_authority'),('listing_publication_private.multipart_sessions','guard_service_multipart_key'),('listing_publication_private.web_images','guard_service_web_key'),('public.messages','service_message_context'),('horse_publication_private.thread_context','horse_select_context'),('service_publication_private.thread_context','service_select_context'),('service_publication_private.events','service_event_immutable'),('service_publication_private.commands','service_command_immutable'))))) structure,
 jsonb_build_object('acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'column_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('column',a.attname,'grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY a.attname,x.grantee::regrole::text,x.privilege_type),'[]') FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'permissive',q.polpermissive,'command',q.polcmd,
  'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(q.polroles) r),
  'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]')
  FROM pg_policy q WHERE q.polrelid=c.oid)) authority
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p') AND n.nspname||'.'||c.relname<>ALL(ARRAY['service_publication_private.activity','service_publication_private.activity_rollout']::text[])
 AND (n.nspname IN('listing_publication_private','listing_contact_private','messaging_private_v2','horse_publication_private','service_publication_private')
  OR n.nspname||'.'||c.relname=ANY(ARRAY['public.horse_offers','public.horse_offer_images','public.horse_offer_publication_events','horse_publication_private.commands','horse_publication_private.closed_requests','horse_publication_private.gallery','horse_publication_private.contact_receipts','horse_publication_private.message_cards','public.publication_policy_documents','public.user_publication_policy_acceptances','public.service_categories','service_publication_private.events','service_publication_private.heads','service_publication_private.commands','service_publication_private.closed_requests','service_publication_private.gallery','service_publication_private.contact_receipts','service_publication_private.thread_context','service_publication_private.message_cards','public.services','public.service_images','horse_publication_private.thread_context','public.profiles','public.identities','public.business_members','public.business_accounts','public.listings','public.listing_images','public.conversations','public.messages','public.conversation_participants','public.identity_profiles','public.user_blocks']::text[]))),
 hosted AS (SELECT jsonb_build_object('project_ref',project_ref,'release_id',release_id,'instance_id',instance_id,
 'release_ready',release_ready,'storage_authority_version',storage_authority_version,'cleanup_mode','held') context,to_jsonb(s) all_settings
 FROM listing_publication_private.hosted_preview_settings s WHERE singleton),
 measured AS MATERIALIZED (SELECT encode(sha256(convert_to((jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]')
 FROM function_facts WHERE NOT(name=ANY(ARRAY['listing_publication_private.assert_non_horse_attempt_v1','listing_publication_private.lock_account_source_cleanup_context_v1','listing_publication_private.multipart_object_fully_deleted','listing_publication_private.protect_attempt','listing_publication_private.require_attempt_policies_v1','listing_publication_private.upload_object_is_published_web_v1','public.add_my_service_image_v2','public.can_manage_service_storage_v2','public.cancel_my_service_publication_v1','public.claim_service_publication_cleanup_v1','public.contact_my_service_provider_v1','public.delete_my_service_image_v2','public.get_my_marketplace_message_thread_v1','public.get_my_service_media_binding_v1','public.get_my_service_publication_attempt_v1','public.get_my_service_publication_image_binding_v1','public.get_my_service_publication_snapshot_v1','public.get_my_service_publications_v1','public.get_public_profile_services_v1','public.get_public_service_media_binding_v1','public.get_public_service_v1','public.prepare_my_service_publication_v1','public.publish_my_service_v1','public.record_service_publication_cleanup_v1','public.save_my_service_v2','public.search_public_services_v1','public.set_my_service_activity_v1','public.set_my_service_primary_image_v2','public.set_my_service_status_v2','public.validate_service_category_pair_v2','service_publication_private.accept_shown_policies','service_publication_private.advance_revision','service_publication_private.assert_actor','service_publication_private.attempt_publication_matches','service_publication_private.capture_message_card','service_publication_private.cleanup_object_eligible','service_publication_private.close_published_attempt','service_publication_private.contact_snapshot','service_publication_private.content','service_publication_private.content_snapshot','service_publication_private.current_policies','service_publication_private.guard_gallery','service_publication_private.guard_image_request_key','service_publication_private.has_current_publication','service_publication_private.image_projection','service_publication_private.is_public','service_publication_private.lock_cleanup_context','service_publication_private.media_binding','service_publication_private.normalize_content','service_publication_private.normalize_gallery','service_publication_private.protect_receipt','service_publication_private.public_fields','service_publication_private.require_policies','service_publication_private.require_ready_image','service_publication_private.retired_web_deleted','service_publication_private.select_current_context','service_publication_private.snapshot','service_publication_private.visible_to_viewer']::text[]) OR name LIKE 'service_publication_private.%')),
 'canonical_structure',(SELECT coalesce(jsonb_agg(structure ORDER BY name),'[]') FROM relation_facts WHERE name=ANY(ARRAY['public.horse_offers','public.horse_offer_images','public.horse_offer_publication_events','horse_publication_private.commands','horse_publication_private.closed_requests','horse_publication_private.gallery','horse_publication_private.contact_receipts','horse_publication_private.message_cards','public.publication_policy_documents','public.user_publication_policy_acceptances','public.service_categories']::text[])),
 'canonical_authority',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',name,'authority',authority) ORDER BY name),'[]')
 FROM relation_facts WHERE name=ANY(ARRAY['public.horse_offers','public.horse_offer_images','public.horse_offer_publication_events','horse_publication_private.commands','horse_publication_private.closed_requests','horse_publication_private.gallery','horse_publication_private.contact_receipts','horse_publication_private.message_cards','public.publication_policy_documents','public.user_publication_policy_acceptances','public.service_categories']::text[])),
 'views',(SELECT jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'owner',pg_get_userbyid(c.relowner),
 'kind',c.relkind,'options',c.reloptions,'definition',pg_get_viewdef(c.oid,true)) ORDER BY n.nspname,c.relname)
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='v' AND n.nspname||'.'||c.relname=ANY(ARRAY['listing_publication_private.hosted_storage_objects','listing_publication_private.hosted_s3_multipart_uploads','listing_publication_private.hosted_s3_multipart_uploads_parts']::text[]))))::text,'UTF8')),'hex') dependencies,encode(sha256(convert_to((jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]')
 FROM function_facts WHERE (name=ANY(ARRAY['listing_publication_private.assert_non_horse_attempt_v1','listing_publication_private.lock_account_source_cleanup_context_v1','listing_publication_private.multipart_object_fully_deleted','listing_publication_private.protect_attempt','listing_publication_private.require_attempt_policies_v1','listing_publication_private.upload_object_is_published_web_v1','public.add_my_service_image_v2','public.can_manage_service_storage_v2','public.cancel_my_service_publication_v1','public.claim_service_publication_cleanup_v1','public.contact_my_service_provider_v1','public.delete_my_service_image_v2','public.get_my_marketplace_message_thread_v1','public.get_my_service_media_binding_v1','public.get_my_service_publication_attempt_v1','public.get_my_service_publication_image_binding_v1','public.get_my_service_publication_snapshot_v1','public.get_my_service_publications_v1','public.get_public_profile_services_v1','public.get_public_service_media_binding_v1','public.get_public_service_v1','public.prepare_my_service_publication_v1','public.publish_my_service_v1','public.record_service_publication_cleanup_v1','public.save_my_service_v2','public.search_public_services_v1','public.set_my_service_activity_v1','public.set_my_service_primary_image_v2','public.set_my_service_status_v2','public.validate_service_category_pair_v2','service_publication_private.accept_shown_policies','service_publication_private.advance_revision','service_publication_private.assert_actor','service_publication_private.attempt_publication_matches','service_publication_private.capture_message_card','service_publication_private.cleanup_object_eligible','service_publication_private.close_published_attempt','service_publication_private.contact_snapshot','service_publication_private.content','service_publication_private.content_snapshot','service_publication_private.current_policies','service_publication_private.guard_gallery','service_publication_private.guard_image_request_key','service_publication_private.has_current_publication','service_publication_private.image_projection','service_publication_private.is_public','service_publication_private.lock_cleanup_context','service_publication_private.media_binding','service_publication_private.normalize_content','service_publication_private.normalize_gallery','service_publication_private.protect_receipt','service_publication_private.public_fields','service_publication_private.require_policies','service_publication_private.require_ready_image','service_publication_private.retired_web_deleted','service_publication_private.select_current_context','service_publication_private.snapshot','service_publication_private.visible_to_viewer']::text[]) OR name LIKE 'service_publication_private.%') AND name<>ALL(ARRAY['public.get_my_service_publications_v1','public.get_public_profile_services_v1']::text[])),
 'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]')
 FROM relation_facts WHERE name=ANY(ARRAY['public.services','public.service_images','horse_publication_private.thread_context']::text[]) OR name LIKE 'service_publication_private.%'),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',n.nspname||'.'||c.relname,'name',t.tgname,
 'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY n.nspname,c.relname,t.tgname),'[]')
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE (t.tgrelid::regclass::text,t.tgname) IN (VALUES ('public.services','service_revision'),('public.service_images','service_gallery_authority'),('listing_publication_private.multipart_sessions','guard_service_multipart_key'),('listing_publication_private.web_images','guard_service_web_key'),('public.messages','service_message_context'),('horse_publication_private.thread_context','horse_select_context'),('service_publication_private.thread_context','service_select_context'),('service_publication_private.events','service_event_immutable'),('service_publication_private.commands','service_command_immutable'))),'schema',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type) FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)) ORDER BY n.nspname),'[]')
 FROM pg_namespace n WHERE n.nspname=ANY(ARRAY['service_publication_private']::text[])),
 'objects',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner)) ORDER BY c.relname),'[]')
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='service_publication_private' AND c.relname<>ALL(ARRAY['activity','activity_rollout','activity_pkey','activity_rollout_pkey','service_activity_until_idx']::text[])),
 'defaults',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(d.defaclrole),'kind',d.defaclobjtype,
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable) FROM aclexplode(d.defaclacl) x))
 ORDER BY pg_get_userbyid(d.defaclrole),d.defaclobjtype),'[]') FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname='service_publication_private')))::text,'UTF8')),'hex') capability,
 encode(sha256(convert_to(((SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]')
 FROM function_facts WHERE NOT(name=ANY(ARRAY['listing_publication_private.assert_non_horse_attempt_v1','listing_publication_private.lock_account_source_cleanup_context_v1','listing_publication_private.multipart_object_fully_deleted','listing_publication_private.protect_attempt','listing_publication_private.require_attempt_policies_v1','listing_publication_private.upload_object_is_published_web_v1','public.add_my_service_image_v2','public.can_manage_service_storage_v2','public.cancel_my_service_publication_v1','public.claim_service_publication_cleanup_v1','public.contact_my_service_provider_v1','public.delete_my_service_image_v2','public.get_my_marketplace_message_thread_v1','public.get_my_service_media_binding_v1','public.get_my_service_publication_attempt_v1','public.get_my_service_publication_image_binding_v1','public.get_my_service_publication_snapshot_v1','public.get_my_service_publications_v1','public.get_public_profile_services_v1','public.get_public_service_media_binding_v1','public.get_public_service_v1','public.prepare_my_service_publication_v1','public.publish_my_service_v1','public.record_service_publication_cleanup_v1','public.save_my_service_v2','public.search_public_services_v1','public.set_my_service_activity_v1','public.set_my_service_primary_image_v2','public.set_my_service_status_v2','public.validate_service_category_pair_v2','service_publication_private.accept_shown_policies','service_publication_private.advance_revision','service_publication_private.assert_actor','service_publication_private.attempt_publication_matches','service_publication_private.capture_message_card','service_publication_private.cleanup_object_eligible','service_publication_private.close_published_attempt','service_publication_private.contact_snapshot','service_publication_private.content','service_publication_private.content_snapshot','service_publication_private.current_policies','service_publication_private.guard_gallery','service_publication_private.guard_image_request_key','service_publication_private.has_current_publication','service_publication_private.image_projection','service_publication_private.is_public','service_publication_private.lock_cleanup_context','service_publication_private.media_binding','service_publication_private.normalize_content','service_publication_private.normalize_gallery','service_publication_private.protect_receipt','service_publication_private.public_fields','service_publication_private.require_policies','service_publication_private.require_ready_image','service_publication_private.retired_web_deleted','service_publication_private.select_current_context','service_publication_private.snapshot','service_publication_private.visible_to_viewer']::text[]) OR name LIKE 'service_publication_private.%')))::text,'UTF8')),'hex') existing_functions,
 encode(sha256(convert_to((jsonb_build_object('tables',(SELECT jsonb_agg(jsonb_build_object('name',name,'authority',authority) ORDER BY name)
 FROM relation_facts WHERE NOT(name=ANY(ARRAY['service_publication_private.events','service_publication_private.heads','service_publication_private.commands','service_publication_private.closed_requests','service_publication_private.gallery','service_publication_private.contact_receipts','service_publication_private.thread_context','service_publication_private.message_cards','public.services','public.service_images','horse_publication_private.thread_context']::text[])) AND name NOT LIKE 'service_publication_private.%'),
 'schemas',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type) FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)) ORDER BY n.nspname),'[]')
 FROM pg_namespace n WHERE n.nspname=ANY(ARRAY['public','listing_publication_private','listing_contact_private','messaging_private_v2','horse_publication_private']::text[])),
 'roles',jsonb_build_object('roles',(SELECT jsonb_agg(jsonb_build_object('name',rolname,'login',rolcanlogin,'super',rolsuper,
 'createdb',rolcreatedb,'createrole',rolcreaterole,'inherit',rolinherit,'replication',rolreplication,'bypassrls',rolbypassrls) ORDER BY rolname)
 FROM pg_roles WHERE rolname=ANY(ARRAY['selqiro_listing_final_writer_v1','selqiro_listing_contact_writer_v1']::text[])),
 'members',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(roleid),'member',pg_get_userbyid(member),'grantor',pg_get_userbyid(grantor),
 'admin',admin_option,'inherit',inherit_option,'set',set_option) ORDER BY roleid::regrole::text,member::regrole::text,grantor::regrole::text),'[]')
 FROM pg_auth_members WHERE pg_get_userbyid(roleid)=ANY(ARRAY['selqiro_listing_final_writer_v1','selqiro_listing_contact_writer_v1']::text[]) OR pg_get_userbyid(member)=ANY(ARRAY['selqiro_listing_final_writer_v1','selqiro_listing_contact_writer_v1']::text[]))),'settings',(SELECT all_settings FROM hosted),
 'actors',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.actor_user_id),'[]') FROM listing_publication_private.hosted_preview_actors a)))::text,'UTF8')),'hex') existing_authority,
 encode(sha256(convert_to(((SELECT jsonb_agg(structure ORDER BY name) FROM relation_facts WHERE NOT(name=ANY(ARRAY['service_publication_private.events','service_publication_private.heads','service_publication_private.commands','service_publication_private.closed_requests','service_publication_private.gallery','service_publication_private.contact_receipts','service_publication_private.thread_context','service_publication_private.message_cards','public.services','public.service_images','horse_publication_private.thread_context']::text[])) AND name NOT LIKE 'service_publication_private.%'))::text,'UTF8')),'hex') immutable_structure),
 checks AS MATERIALIZED (SELECT dependencies='9dd1c4ef3f97785a8f164bb5409f9e4788835fd7a280d8b5db326c36c1be2572' AS functions,
 current_user='postgres' AND session_user='postgres' AND current_setting('transaction_isolation')='read committed'
 AND current_setting('server_version_num')::integer>=170000 AS installer,
 jsonb_build_object('roles',(SELECT jsonb_agg(jsonb_build_object('name',rolname,'login',rolcanlogin,'super',rolsuper,
 'createdb',rolcreatedb,'createrole',rolcreaterole,'inherit',rolinherit,'replication',rolreplication,'bypassrls',rolbypassrls) ORDER BY rolname)
 FROM pg_roles WHERE rolname=ANY(ARRAY['selqiro_listing_final_writer_v1','selqiro_listing_contact_writer_v1']::text[])),
 'members',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(roleid),'member',pg_get_userbyid(member),'grantor',pg_get_userbyid(grantor),
 'admin',admin_option,'inherit',inherit_option,'set',set_option) ORDER BY roleid::regrole::text,member::regrole::text,grantor::regrole::text),'[]')
 FROM pg_auth_members WHERE pg_get_userbyid(roleid)=ANY(ARRAY['selqiro_listing_final_writer_v1','selqiro_listing_contact_writer_v1']::text[]) OR pg_get_userbyid(member)=ANY(ARRAY['selqiro_listing_final_writer_v1','selqiro_listing_contact_writer_v1']::text[])))='{"roles":[{"name":"selqiro_listing_contact_writer_v1","login":false,"super":false,"inherit":false,"createdb":false,"bypassrls":false,"createrole":false,"replication":false},{"name":"selqiro_listing_final_writer_v1","login":false,"super":false,"inherit":false,"createdb":false,"bypassrls":false,"createrole":false,"replication":false}],"members":[{"set":true,"role":"selqiro_listing_contact_writer_v1","admin":false,"member":"postgres","grantor":"postgres","inherit":true},{"set":false,"role":"selqiro_listing_contact_writer_v1","admin":true,"member":"postgres","grantor":"supabase_admin","inherit":false},{"set":true,"role":"selqiro_listing_final_writer_v1","admin":false,"member":"postgres","grantor":"postgres","inherit":true},{"set":false,"role":"selqiro_listing_final_writer_v1","admin":true,"member":"postgres","grantor":"supabase_admin","inherit":false}]}'::jsonb AND NOT EXISTS(SELECT 1 FROM unnest(ARRAY['selqiro_listing_final_writer_v1','selqiro_listing_contact_writer_v1']::text[]) r
 WHERE has_schema_privilege(r,'public','CREATE') OR has_schema_privilege(r,'listing_publication_private','CREATE')
 OR EXISTS(SELECT 1 FROM unnest(ARRAY['anon','authenticated','service_role']) a WHERE pg_has_role(a,r,'MEMBER'))) AS actor_roles,
 NOT EXISTS(SELECT 1 FROM pg_namespace n CROSS JOIN unnest(ARRAY['anon','authenticated','service_role']) a
 WHERE n.nspname IN('listing_publication_private','listing_contact_private','messaging_private_v2','horse_publication_private')
 AND (n.nspowner<>to_regrole('postgres') OR has_schema_privilege(a,n.oid,'USAGE') OR has_schema_privilege(a,n.oid,'CREATE'))) AS closed_private_schema,
 NOT EXISTS(SELECT 1 FROM unnest(ARRAY['public.profiles','public.identities','public.business_members','public.business_accounts','public.services','public.service_images','public.service_categories','public.horse_offers','public.horse_offer_images','public.horse_offer_publication_events','horse_publication_private.commands','horse_publication_private.closed_requests','horse_publication_private.gallery','horse_publication_private.contact_receipts','horse_publication_private.thread_context','horse_publication_private.message_cards','listing_publication_private.attempts','listing_publication_private.objects','listing_publication_private.slots','listing_publication_private.web_images','listing_publication_private.multipart_sessions','listing_publication_private.cleanup','listing_contact_private.channels','public.messages','public.conversations']::text[]) required(name) LEFT JOIN pg_class c ON c.oid=to_regclass(required.name)
 WHERE c.oid IS NULL OR c.relkind<>'r' OR NOT c.relrowsecurity OR c.relowner<>to_regrole('postgres')) AS core_relations,
 NOT EXISTS(SELECT 1 FROM (VALUES ('public.profiles','id','uuid'),('public.profiles','active_identity_id','uuid'),('public.identities','id','uuid'),('public.identities','status','text'),('public.identities','business_account_id','uuid'),('public.business_members','user_id','uuid'),('public.business_members','business_account_id','uuid'),('public.business_members','status','text'),('public.messages','id','bigint'),('public.messages','conversation_id','bigint'),('public.messages','sender_id','uuid'),('public.conversations','id','bigint'),('public.conversation_participants','conversation_id','bigint'),('public.conversation_participants','user_id','uuid'),('public.business_accounts','id','uuid'),('public.business_accounts','owner_user_id','uuid'),('public.identities','user_id','uuid'),('public.identity_profiles','identity_id','uuid'),('public.identity_profiles','display_name','text'),('public.identity_profiles','slug','text')) required(relation_name,column_name,type_name)
 WHERE NOT EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=to_regclass(required.relation_name) AND a.attname=required.column_name
 AND NOT a.attisdropped AND a.atttypid=to_regtype(required.type_name) AND a.attgenerated=''))
 AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.business_accounts'::regclass AND attname='owner_user_id' AND attnotnull AND NOT attisdropped) AS required_columns,
 (SELECT jsonb_agg(jsonb_build_object('relation',n.nspname||'.'||c.relname,'name',t.tgname,'enabled',t.tgenabled,
 'definition',pg_get_triggerdef(t.oid)) ORDER BY n.nspname,c.relname,t.tgname)
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE t.tgname=ANY(ARRAY['protect_attempt','protect_slot','protect_object','protect_web_image','protect_publication','protect_cleanup','guard_managed_listing','guard_managed_image','protect_multipart_attempt','protect_multipart_session','protect_multipart_auxiliary','guard_horse_multipart_key','guard_horse_web_key','horse_message_context']::text[]) AND n.nspname IN('public','listing_publication_private'))='[{"name":"protect_attempt","enabled":"O","relation":"listing_publication_private.attempts","definition":"CREATE TRIGGER protect_attempt BEFORE DELETE OR UPDATE ON listing_publication_private.attempts FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_attempt()"},{"name":"protect_cleanup","enabled":"O","relation":"listing_publication_private.cleanup","definition":"CREATE TRIGGER protect_cleanup BEFORE DELETE OR UPDATE ON listing_publication_private.cleanup FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_cleanup()"},{"name":"protect_multipart_attempt","enabled":"O","relation":"listing_publication_private.multipart_attempts","definition":"CREATE TRIGGER protect_multipart_attempt BEFORE INSERT OR DELETE OR UPDATE ON listing_publication_private.multipart_attempts FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_multipart_attempt()"},{"name":"protect_multipart_auxiliary","enabled":"O","relation":"listing_publication_private.multipart_auxiliary_receipts","definition":"CREATE TRIGGER protect_multipart_auxiliary BEFORE INSERT OR DELETE OR UPDATE ON listing_publication_private.multipart_auxiliary_receipts FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_multipart_auxiliary()"},{"name":"guard_horse_multipart_key","enabled":"O","relation":"listing_publication_private.multipart_sessions","definition":"CREATE TRIGGER guard_horse_multipart_key BEFORE INSERT ON listing_publication_private.multipart_sessions FOR EACH ROW EXECUTE FUNCTION horse_publication_private.guard_image_request_key()"},{"name":"protect_multipart_session","enabled":"O","relation":"listing_publication_private.multipart_sessions","definition":"CREATE TRIGGER protect_multipart_session BEFORE INSERT OR DELETE OR UPDATE ON listing_publication_private.multipart_sessions FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_multipart_session()"},{"name":"protect_object","enabled":"O","relation":"listing_publication_private.objects","definition":"CREATE TRIGGER protect_object BEFORE DELETE OR UPDATE ON listing_publication_private.objects FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_object()"},{"name":"protect_publication","enabled":"O","relation":"listing_publication_private.publications","definition":"CREATE TRIGGER protect_publication BEFORE DELETE OR UPDATE ON listing_publication_private.publications FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_publication()"},{"name":"protect_slot","enabled":"O","relation":"listing_publication_private.slots","definition":"CREATE TRIGGER protect_slot BEFORE DELETE OR UPDATE ON listing_publication_private.slots FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_slot()"},{"name":"guard_horse_web_key","enabled":"O","relation":"listing_publication_private.web_images","definition":"CREATE TRIGGER guard_horse_web_key BEFORE INSERT ON listing_publication_private.web_images FOR EACH ROW EXECUTE FUNCTION horse_publication_private.guard_image_request_key()"},{"name":"protect_web_image","enabled":"O","relation":"listing_publication_private.web_images","definition":"CREATE TRIGGER protect_web_image BEFORE DELETE OR UPDATE ON listing_publication_private.web_images FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_web_image()"},{"name":"guard_managed_image","enabled":"O","relation":"public.listing_images","definition":"CREATE TRIGGER guard_managed_image BEFORE INSERT OR DELETE OR UPDATE ON public.listing_images FOR EACH ROW EXECUTE FUNCTION listing_publication_private.guard_managed_image()"},{"name":"guard_managed_listing","enabled":"O","relation":"public.listings","definition":"CREATE TRIGGER guard_managed_listing BEFORE INSERT OR DELETE OR UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION listing_publication_private.guard_managed_listing()"},{"name":"horse_message_context","enabled":"O","relation":"public.messages","definition":"CREATE TRIGGER horse_message_context AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION horse_publication_private.capture_message_card()"}]'::jsonb AS managed_triggers,
 (SELECT jsonb_agg(jsonb_build_object('relation',n.nspname||'.'||c.relname,'name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
 'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(p.polroles) r),
 'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY n.nspname,c.relname,p.polname)
 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE (n.nspname||'.'||c.relname,p.polname) IN (VALUES ('horse_publication_private.closed_requests','horse_closed_writer_read'),('horse_publication_private.commands','horse_command_writer_read'),('horse_publication_private.contact_receipts','contact_writer'),('horse_publication_private.gallery','horse_gallery_writer_read'),('horse_publication_private.message_cards','contact_writer'),('horse_publication_private.thread_context','contact_writer'),('listing_contact_private.channels','contact_writer'),('listing_contact_private.contact_receipts','contact_writer'),('listing_contact_private.message_receipts','contact_writer'),('listing_publication_private.attempts','final_internal_writer'),('listing_publication_private.cleanup','final_internal_writer'),('listing_publication_private.managed_image_additions_v1','managed_image_addition_writer'),('listing_publication_private.managed_image_presentations_v1','managed_image_presentation_writer'),('listing_publication_private.multipart_abort_observations','multipart_abort_internal'),('listing_publication_private.multipart_attempts','multipart_attempt_internal'),('listing_publication_private.multipart_auxiliary_receipts','multipart_auxiliary_internal'),('listing_publication_private.multipart_sessions','multipart_session_internal'),('listing_publication_private.objects','final_internal_writer'),('listing_publication_private.publications','contact_writer_read'),('listing_publication_private.publications','final_internal_writer'),('listing_publication_private.slots','final_internal_writer'),('listing_publication_private.source_no_release','source_no_release_internal'),('listing_publication_private.source_recorded_no_release','recorded_no_release_insert_internal'),('listing_publication_private.source_recorded_no_release','release_read_internal'),('listing_publication_private.source_release_tracking','release_read_internal'),('listing_publication_private.source_release_tracking','tracking_insert_internal'),('listing_publication_private.upload_grants','final_internal_writer'),('listing_publication_private.web_images','final_internal_writer'),('listing_publication_private.web_write_completions','completion_internal_writer'),('listing_publication_private.write_settlements','settlement_internal'),('messaging_private_v2.photos','controlled_writer'),('messaging_private_v2.read_watermarks','controlled_writer'),('messaging_private_v2.send_receipts','controlled_writer'),('public.business_members','contact_writer_lock'),('public.business_members','contact_writer_read'),('public.conversation_participants','contact_identity_visibility'),('public.conversation_participants','contact_writer'),('public.conversations','contact_identity_visibility'),('public.conversations','contact_writer'),('public.horse_offer_images','horse_writer_read_images'),('public.horse_offer_publication_events','horse_writer_read_events'),('public.horse_offers','horse_writer_read_offers'),('public.identities','contact_writer_lock'),('public.identities','contact_writer_read'),('public.listing_images','final_writer_images'),('public.listings','contact_writer_lock'),('public.listings','contact_writer_read'),('public.listings','final_writer_listings'),('public.messages','contact_identity_visibility'),('public.messages','contact_writer'),('public.profiles','contact_writer_lock'),('public.profiles','contact_writer_read'),('public.user_blocks','contact_writer_lock'),('public.user_blocks','contact_writer_read')))='[{"name":"horse_closed_writer_read","check":null,"roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"r","relation":"horse_publication_private.closed_requests","permissive":true},{"name":"horse_command_writer_read","check":null,"roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"r","relation":"horse_publication_private.commands","permissive":true},{"name":"contact_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"horse_publication_private.contact_receipts","permissive":true},{"name":"horse_gallery_writer_read","check":null,"roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"r","relation":"horse_publication_private.gallery","permissive":true},{"name":"contact_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"horse_publication_private.message_cards","permissive":true},{"name":"contact_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"horse_publication_private.thread_context","permissive":true},{"name":"contact_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"listing_contact_private.channels","permissive":true},{"name":"contact_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"listing_contact_private.contact_receipts","permissive":true},{"name":"contact_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"listing_contact_private.message_receipts","permissive":true},{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.attempts","permissive":true},{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.cleanup","permissive":true},{"name":"managed_image_addition_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.managed_image_additions_v1","permissive":true},{"name":"managed_image_presentation_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.managed_image_presentations_v1","permissive":true},{"name":"multipart_abort_internal","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.multipart_abort_observations","permissive":true},{"name":"multipart_attempt_internal","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.multipart_attempts","permissive":true},{"name":"multipart_auxiliary_internal","check":null,"roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"r","relation":"listing_publication_private.multipart_auxiliary_receipts","permissive":true},{"name":"multipart_session_internal","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.multipart_sessions","permissive":true},{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.objects","permissive":true},{"name":"contact_writer_read","check":null,"roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"r","relation":"listing_publication_private.publications","permissive":true},{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.publications","permissive":true},{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.slots","permissive":true},{"name":"source_no_release_internal","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.source_no_release","permissive":true},{"name":"recorded_no_release_insert_internal","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":null,"command":"a","relation":"listing_publication_private.source_recorded_no_release","permissive":true},{"name":"release_read_internal","check":null,"roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"r","relation":"listing_publication_private.source_recorded_no_release","permissive":true},{"name":"release_read_internal","check":null,"roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"r","relation":"listing_publication_private.source_release_tracking","permissive":true},{"name":"tracking_insert_internal","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":null,"command":"a","relation":"listing_publication_private.source_release_tracking","permissive":true},{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.upload_grants","permissive":true},{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.web_images","permissive":true},{"name":"completion_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.web_write_completions","permissive":true},{"name":"settlement_internal","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.write_settlements","permissive":true},{"name":"controlled_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"messaging_private_v2.photos","permissive":true},{"name":"controlled_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"messaging_private_v2.read_watermarks","permissive":true},{"name":"controlled_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"messaging_private_v2.send_receipts","permissive":true},{"name":"contact_writer_lock","check":"false","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"w","relation":"public.business_members","permissive":true},{"name":"contact_writer_read","check":null,"roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"r","relation":"public.business_members","permissive":true},{"name":"contact_identity_visibility","check":"public.listing_contact_visible_v1(conversation_id)","roles":["authenticated"],"using":"public.listing_contact_visible_v1(conversation_id)","command":"*","relation":"public.conversation_participants","permissive":false},{"name":"contact_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"public.conversation_participants","permissive":true},{"name":"contact_identity_visibility","check":"public.listing_contact_visible_v1(id)","roles":["authenticated"],"using":"public.listing_contact_visible_v1(id)","command":"*","relation":"public.conversations","permissive":false},{"name":"contact_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"public.conversations","permissive":true},{"name":"horse_writer_read_images","check":null,"roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"r","relation":"public.horse_offer_images","permissive":true},{"name":"horse_writer_read_events","check":null,"roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"r","relation":"public.horse_offer_publication_events","permissive":true},{"name":"horse_writer_read_offers","check":null,"roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"r","relation":"public.horse_offers","permissive":true},{"name":"contact_writer_lock","check":"false","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"w","relation":"public.identities","permissive":true},{"name":"contact_writer_read","check":null,"roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"r","relation":"public.identities","permissive":true},{"name":"final_writer_images","check":"(EXISTS ( SELECT 1\n   FROM public.listings l\n  WHERE ((l.id = listing_images.listing_id) AND public.current_user_has_identity_access(l.identity_id))))","roles":["selqiro_listing_final_writer_v1"],"using":"(EXISTS ( SELECT 1\n   FROM public.listings l\n  WHERE ((l.id = listing_images.listing_id) AND public.current_user_has_identity_access(l.identity_id))))","command":"*","relation":"public.listing_images","permissive":true},{"name":"contact_writer_lock","check":"false","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"w","relation":"public.listings","permissive":true},{"name":"contact_writer_read","check":null,"roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"r","relation":"public.listings","permissive":true},{"name":"final_writer_listings","check":"public.current_user_has_identity_access(identity_id)","roles":["selqiro_listing_final_writer_v1"],"using":"public.current_user_has_identity_access(identity_id)","command":"*","relation":"public.listings","permissive":true},{"name":"contact_identity_visibility","check":"public.listing_contact_visible_v1(conversation_id)","roles":["authenticated"],"using":"public.listing_contact_visible_v1(conversation_id)","command":"*","relation":"public.messages","permissive":false},{"name":"contact_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"public.messages","permissive":true},{"name":"contact_writer_lock","check":"false","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"w","relation":"public.profiles","permissive":true},{"name":"contact_writer_read","check":null,"roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"r","relation":"public.profiles","permissive":true},{"name":"contact_writer_lock","check":"false","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"w","relation":"public.user_blocks","permissive":true},{"name":"contact_writer_read","check":null,"roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"r","relation":"public.user_blocks","permissive":true}]'::jsonb AND NOT EXISTS(SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname||'.'||c.relname=ANY(ARRAY['horse_publication_private.closed_requests','horse_publication_private.commands','horse_publication_private.contact_receipts','horse_publication_private.gallery','horse_publication_private.message_cards','horse_publication_private.thread_context','listing_contact_private.channels','listing_contact_private.contact_receipts','listing_contact_private.message_receipts','listing_publication_private.attempts','listing_publication_private.cleanup','listing_publication_private.managed_image_additions_v1','listing_publication_private.managed_image_presentations_v1','listing_publication_private.multipart_abort_observations','listing_publication_private.multipart_attempts','listing_publication_private.multipart_auxiliary_receipts','listing_publication_private.multipart_sessions','listing_publication_private.objects','listing_publication_private.publications','listing_publication_private.slots','listing_publication_private.source_no_release','listing_publication_private.source_recorded_no_release','listing_publication_private.source_release_tracking','listing_publication_private.upload_grants','listing_publication_private.web_images','listing_publication_private.web_write_completions','listing_publication_private.write_settlements','messaging_private_v2.photos','messaging_private_v2.read_watermarks','messaging_private_v2.send_receipts']::text[])
 AND (n.nspname||'.'||c.relname,p.polname) NOT IN (VALUES ('horse_publication_private.closed_requests','horse_closed_writer_read'),('horse_publication_private.commands','horse_command_writer_read'),('horse_publication_private.contact_receipts','contact_writer'),('horse_publication_private.gallery','horse_gallery_writer_read'),('horse_publication_private.message_cards','contact_writer'),('horse_publication_private.thread_context','contact_writer'),('listing_contact_private.channels','contact_writer'),('listing_contact_private.contact_receipts','contact_writer'),('listing_contact_private.message_receipts','contact_writer'),('listing_publication_private.attempts','final_internal_writer'),('listing_publication_private.cleanup','final_internal_writer'),('listing_publication_private.managed_image_additions_v1','managed_image_addition_writer'),('listing_publication_private.managed_image_presentations_v1','managed_image_presentation_writer'),('listing_publication_private.multipart_abort_observations','multipart_abort_internal'),('listing_publication_private.multipart_attempts','multipart_attempt_internal'),('listing_publication_private.multipart_auxiliary_receipts','multipart_auxiliary_internal'),('listing_publication_private.multipart_sessions','multipart_session_internal'),('listing_publication_private.objects','final_internal_writer'),('listing_publication_private.publications','contact_writer_read'),('listing_publication_private.publications','final_internal_writer'),('listing_publication_private.slots','final_internal_writer'),('listing_publication_private.source_no_release','source_no_release_internal'),('listing_publication_private.source_recorded_no_release','recorded_no_release_insert_internal'),('listing_publication_private.source_recorded_no_release','release_read_internal'),('listing_publication_private.source_release_tracking','release_read_internal'),('listing_publication_private.source_release_tracking','tracking_insert_internal'),('listing_publication_private.upload_grants','final_internal_writer'),('listing_publication_private.web_images','final_internal_writer'),('listing_publication_private.web_write_completions','completion_internal_writer'),('listing_publication_private.write_settlements','settlement_internal'),('messaging_private_v2.photos','controlled_writer'),('messaging_private_v2.read_watermarks','controlled_writer'),('messaging_private_v2.send_receipts','controlled_writer'),('public.business_members','contact_writer_lock'),('public.business_members','contact_writer_read'),('public.conversation_participants','contact_identity_visibility'),('public.conversation_participants','contact_writer'),('public.conversations','contact_identity_visibility'),('public.conversations','contact_writer'),('public.horse_offer_images','horse_writer_read_images'),('public.horse_offer_publication_events','horse_writer_read_events'),('public.horse_offers','horse_writer_read_offers'),('public.identities','contact_writer_lock'),('public.identities','contact_writer_read'),('public.listing_images','final_writer_images'),('public.listings','contact_writer_lock'),('public.listings','contact_writer_read'),('public.listings','final_writer_listings'),('public.messages','contact_identity_visibility'),('public.messages','contact_writer'),('public.profiles','contact_writer_lock'),('public.profiles','contact_writer_read'),('public.user_blocks','contact_writer_lock'),('public.user_blocks','contact_writer_read'))) AS final_writer_policies,
 EXISTS(SELECT 1 FROM hosted WHERE context->>'project_ref'='vyjletlmwoiwxsnsunlm' AND context->>'release_id'='listing-publication-hosted-preview-v1'
 AND (context->>'release_ready')::boolean AND context->>'storage_authority_version'='source-part-rfc3986-v1'
 AND context->>'instance_id'='2d088814-0900-448a-a9d1-7b05470cb1d2') AND listing_publication_private.hosted_storage_contract_ready() AS hosted_context_ready,
 capability='c33641ef8c175d9b6cb4b80dba1503b95685fd371f68e92d62607101a40c5b26' AND to_regnamespace('service_publication_private') IS NULL
 AND (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['listing_publication_private.assert_non_horse_attempt_v1','listing_publication_private.lock_account_source_cleanup_context_v1','listing_publication_private.multipart_object_fully_deleted','listing_publication_private.protect_attempt','listing_publication_private.require_attempt_policies_v1','listing_publication_private.upload_object_is_published_web_v1','public.add_my_service_image_v2','public.can_manage_service_storage_v2','public.cancel_my_service_publication_v1','public.claim_service_publication_cleanup_v1','public.contact_my_service_provider_v1','public.delete_my_service_image_v2','public.get_my_marketplace_message_thread_v1','public.get_my_service_media_binding_v1','public.get_my_service_publication_attempt_v1','public.get_my_service_publication_image_binding_v1','public.get_my_service_publication_snapshot_v1','public.get_my_service_publications_v1','public.get_public_profile_services_v1','public.get_public_service_media_binding_v1','public.get_public_service_v1','public.prepare_my_service_publication_v1','public.publish_my_service_v1','public.record_service_publication_cleanup_v1','public.save_my_service_v2','public.search_public_services_v1','public.set_my_service_activity_v1','public.set_my_service_primary_image_v2','public.set_my_service_status_v2','public.validate_service_category_pair_v2','service_publication_private.accept_shown_policies','service_publication_private.advance_revision','service_publication_private.assert_actor','service_publication_private.attempt_publication_matches','service_publication_private.capture_message_card','service_publication_private.cleanup_object_eligible','service_publication_private.close_published_attempt','service_publication_private.contact_snapshot','service_publication_private.content','service_publication_private.content_snapshot','service_publication_private.current_policies','service_publication_private.guard_gallery','service_publication_private.guard_image_request_key','service_publication_private.has_current_publication','service_publication_private.image_projection','service_publication_private.is_public','service_publication_private.lock_cleanup_context','service_publication_private.media_binding','service_publication_private.normalize_content','service_publication_private.normalize_gallery','service_publication_private.protect_receipt','service_publication_private.public_fields','service_publication_private.require_policies','service_publication_private.require_ready_image','service_publication_private.retired_web_deleted','service_publication_private.select_current_context','service_publication_private.snapshot','service_publication_private.visible_to_viewer']::text[]))=15 AS capability_absent,
 capability='7ac89799f70adb757c5f4eb2edb072e774141f315e6be8a3fb117b30c184ad9b' AND to_regnamespace('service_publication_private') IS NOT NULL
 AND (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['listing_publication_private.assert_non_horse_attempt_v1','listing_publication_private.lock_account_source_cleanup_context_v1','listing_publication_private.multipart_object_fully_deleted','listing_publication_private.protect_attempt','listing_publication_private.require_attempt_policies_v1','listing_publication_private.upload_object_is_published_web_v1','public.add_my_service_image_v2','public.can_manage_service_storage_v2','public.cancel_my_service_publication_v1','public.claim_service_publication_cleanup_v1','public.contact_my_service_provider_v1','public.delete_my_service_image_v2','public.get_my_marketplace_message_thread_v1','public.get_my_service_media_binding_v1','public.get_my_service_publication_attempt_v1','public.get_my_service_publication_image_binding_v1','public.get_my_service_publication_snapshot_v1','public.get_my_service_publications_v1','public.get_public_profile_services_v1','public.get_public_service_media_binding_v1','public.get_public_service_v1','public.prepare_my_service_publication_v1','public.publish_my_service_v1','public.record_service_publication_cleanup_v1','public.save_my_service_v2','public.search_public_services_v1','public.set_my_service_activity_v1','public.set_my_service_primary_image_v2','public.set_my_service_status_v2','public.validate_service_category_pair_v2','service_publication_private.accept_shown_policies','service_publication_private.advance_revision','service_publication_private.assert_actor','service_publication_private.attempt_publication_matches','service_publication_private.capture_message_card','service_publication_private.cleanup_object_eligible','service_publication_private.close_published_attempt','service_publication_private.contact_snapshot','service_publication_private.content','service_publication_private.content_snapshot','service_publication_private.current_policies','service_publication_private.guard_gallery','service_publication_private.guard_image_request_key','service_publication_private.has_current_publication','service_publication_private.image_projection','service_publication_private.is_public','service_publication_private.lock_cleanup_context','service_publication_private.media_binding','service_publication_private.normalize_content','service_publication_private.normalize_gallery','service_publication_private.protect_receipt','service_publication_private.public_fields','service_publication_private.require_policies','service_publication_private.require_ready_image','service_publication_private.retired_web_deleted','service_publication_private.select_current_context','service_publication_private.snapshot','service_publication_private.visible_to_viewer']::text[]))=58 AS capability_present FROM measured),
 assessed AS MATERIALIZED (SELECT *,coalesce(functions AND installer AND actor_roles AND closed_private_schema AND core_relations
 AND required_columns AND managed_triggers AND final_writer_policies AND hosted_context_ready,false) dependencies_ok FROM checks),
 result_row AS (SELECT jsonb_build_object('schema_version',1,'kind','service-publication-v1',
 'state',CASE WHEN dependencies_ok AND capability_absent AND NOT capability_present THEN 'absent'
 WHEN dependencies_ok AND capability_present AND NOT capability_absent THEN 'applied' ELSE 'unknown' END,
 'recognized',dependencies_ok AND (capability_absent<>capability_present),'ready_to_apply',dependencies_ok AND capability_absent AND NOT capability_present,
 'dependencies_ok',dependencies_ok,'capability_absent',capability_absent,'capability_present',capability_present,
 'guards',to_jsonb(assessed)-ARRAY['dependencies_ok','capability_absent','capability_present'],'hosted_context',(SELECT context FROM hosted),
 'fingerprints',jsonb_build_object('dependencies',dependencies,'capability',capability),
 'invariants',jsonb_build_object('existing_functions',existing_functions,'existing_authority',existing_authority,'immutable_structure',immutable_structure)) result
 FROM assessed CROSS JOIN measured) SELECT result FROM result_row),
 reader_facts AS (SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_service_publications_v1','public.get_public_profile_marketplace_v1','public.get_public_profile_services_v1']::text[])),
 profile_functions AS (SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname=ANY(ARRAY['public.get_public_profile_listings_v1','public.prepare_store_category_name','public.validate_store_category_parent']::text[])),
 store_relations AS (SELECT n.nspname||'.'||c.relname name,
 jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'persistence',c.relpersistence,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
  'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(ad.adbin,ad.adrelid),
  'collation',CASE WHEN a.attcollation=0 THEN NULL ELSE a.attcollation::regcollation::text END) ORDER BY a.attnum),'[]')
  FROM pg_attribute a LEFT JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'definition',pg_get_constraintdef(q.oid),
  'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred,'local',q.conislocal,'inheritance',q.coninhcount,
  'no_inherit',q.connoinherit) ORDER BY q.conname),'[]') FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'nonstandard_not_null',(SELECT count(*) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype='n'
  AND (NOT q.convalidated OR NOT q.conislocal OR q.coninhcount<>0 OR q.connoinherit)),
 'inheritance',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY i.inhseqno),'[]') FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',ic.relname,'definition',pg_get_indexdef(i.indexrelid),
  'valid',i.indisvalid,'ready',i.indisready) ORDER BY ic.relname),'[]') FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid AND NOT (c.oid='public.user_blocks'::regclass AND i.indexrelid IS NOT DISTINCT FROM to_regclass('public.user_blocks_blocked_blocker_idx_v1'))),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid))
  ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND (n.nspname||'.'||c.relname=ANY(ARRAY['service_publication_private.events','service_publication_private.heads','service_publication_private.commands','service_publication_private.closed_requests','service_publication_private.gallery','service_publication_private.contact_receipts','service_publication_private.thread_context','service_publication_private.message_cards','public.services','public.service_images','horse_publication_private.thread_context']::text[]) OR NOT (t.tgrelid::regclass::text,t.tgname) IN (VALUES ('public.services','service_revision'),('public.service_images','service_gallery_authority'),('listing_publication_private.multipart_sessions','guard_service_multipart_key'),('listing_publication_private.web_images','guard_service_web_key'),('public.messages','service_message_context'),('horse_publication_private.thread_context','horse_select_context'),('service_publication_private.thread_context','service_select_context'),('service_publication_private.events','service_event_immutable'),('service_publication_private.commands','service_command_immutable'))))) structure,
 jsonb_build_object('acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'column_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('column',a.attname,'grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY a.attname,x.grantee::regrole::text,x.privilege_type),'[]') FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'permissive',q.polpermissive,'command',q.polcmd,
  'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(q.polroles) r),
  'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]')
  FROM pg_policy q WHERE q.polrelid=c.oid)) authority
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p')
 AND n.nspname||'.'||c.relname=ANY(ARRAY['public.store_categories','public.listing_store_categories']::text[])),
 category_functions AS (SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname=ANY(ARRAY['public.create_my_store_child_category_v2','public.create_my_store_root_category_v2','public.current_user_has_identity_access','public.delete_my_store_category_v2','public.prepare_store_category_name','public.rename_my_store_category_v2','public.require_my_active_identity_v2','public.set_my_listing_store_categories_v2','public.validate_store_category_parent']::text[])),
 capability_functions AS (SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname=ANY(ARRAY['public.manage_my_store_category_v1']::text[])),
 horse_category_functions AS (SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_horse_offer_store_categories_v1','public.get_public_profile_marketplace_v2','public.set_my_horse_offer_store_categories_v1']::text[])),
 horse_category_relations AS (SELECT n.nspname||'.'||c.relname name,
 jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'persistence',c.relpersistence,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
  'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(ad.adbin,ad.adrelid),
  'collation',CASE WHEN a.attcollation=0 THEN NULL ELSE a.attcollation::regcollation::text END) ORDER BY a.attnum),'[]')
  FROM pg_attribute a LEFT JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'definition',pg_get_constraintdef(q.oid),
  'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred,'local',q.conislocal,'inheritance',q.coninhcount,
  'no_inherit',q.connoinherit) ORDER BY q.conname),'[]') FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'nonstandard_not_null',(SELECT count(*) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype='n'
  AND (NOT q.convalidated OR NOT q.conislocal OR q.coninhcount<>0 OR q.connoinherit)),
 'inheritance',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY i.inhseqno),'[]') FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',ic.relname,'definition',pg_get_indexdef(i.indexrelid),
  'valid',i.indisvalid,'ready',i.indisready) ORDER BY ic.relname),'[]') FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid AND NOT (c.oid='public.user_blocks'::regclass AND i.indexrelid IS NOT DISTINCT FROM to_regclass('public.user_blocks_blocked_blocker_idx_v1'))),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid))
  ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND (n.nspname||'.'||c.relname=ANY(ARRAY['service_publication_private.events','service_publication_private.heads','service_publication_private.commands','service_publication_private.closed_requests','service_publication_private.gallery','service_publication_private.contact_receipts','service_publication_private.thread_context','service_publication_private.message_cards','public.services','public.service_images','horse_publication_private.thread_context']::text[]) OR NOT (t.tgrelid::regclass::text,t.tgname) IN (VALUES ('public.services','service_revision'),('public.service_images','service_gallery_authority'),('listing_publication_private.multipart_sessions','guard_service_multipart_key'),('listing_publication_private.web_images','guard_service_web_key'),('public.messages','service_message_context'),('horse_publication_private.thread_context','horse_select_context'),('service_publication_private.thread_context','service_select_context'),('service_publication_private.events','service_event_immutable'),('service_publication_private.commands','service_command_immutable'))))) structure,
 jsonb_build_object('acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'column_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('column',a.attname,'grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY a.attname,x.grantee::regrole::text,x.privilege_type),'[]') FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'permissive',q.polpermissive,'command',q.polcmd,
  'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(q.polroles) r),
  'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]')
  FROM pg_policy q WHERE q.polrelid=c.oid)) authority
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p') AND n.nspname||'.'||c.relname='public.horse_offer_store_categories'),
 service_category_functions AS (SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_service_store_categories_v1','public.get_public_profile_services_v2','public.get_public_profile_store_categories_v2','public.set_my_service_store_categories_v1']::text[])),
 service_category_relations AS (SELECT n.nspname||'.'||c.relname name,
 jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'persistence',c.relpersistence,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
  'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(ad.adbin,ad.adrelid),
  'collation',CASE WHEN a.attcollation=0 THEN NULL ELSE a.attcollation::regcollation::text END) ORDER BY a.attnum),'[]')
  FROM pg_attribute a LEFT JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'definition',pg_get_constraintdef(q.oid),
  'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred,'local',q.conislocal,'inheritance',q.coninhcount,
  'no_inherit',q.connoinherit) ORDER BY q.conname),'[]') FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'nonstandard_not_null',(SELECT count(*) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype='n'
  AND (NOT q.convalidated OR NOT q.conislocal OR q.coninhcount<>0 OR q.connoinherit)),
 'inheritance',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY i.inhseqno),'[]') FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',ic.relname,'definition',pg_get_indexdef(i.indexrelid),
  'valid',i.indisvalid,'ready',i.indisready) ORDER BY ic.relname),'[]') FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid AND NOT (c.oid='public.user_blocks'::regclass AND i.indexrelid IS NOT DISTINCT FROM to_regclass('public.user_blocks_blocked_blocker_idx_v1'))),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid))
  ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND (n.nspname||'.'||c.relname=ANY(ARRAY['service_publication_private.events','service_publication_private.heads','service_publication_private.commands','service_publication_private.closed_requests','service_publication_private.gallery','service_publication_private.contact_receipts','service_publication_private.thread_context','service_publication_private.message_cards','public.services','public.service_images','horse_publication_private.thread_context']::text[]) OR NOT (t.tgrelid::regclass::text,t.tgname) IN (VALUES ('public.services','service_revision'),('public.service_images','service_gallery_authority'),('listing_publication_private.multipart_sessions','guard_service_multipart_key'),('listing_publication_private.web_images','guard_service_web_key'),('public.messages','service_message_context'),('horse_publication_private.thread_context','horse_select_context'),('service_publication_private.thread_context','service_select_context'),('service_publication_private.events','service_event_immutable'),('service_publication_private.commands','service_command_immutable'))))) structure,
 jsonb_build_object('acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'column_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('column',a.attname,'grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY a.attname,x.grantee::regrole::text,x.privilege_type),'[]') FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'permissive',q.polpermissive,'command',q.polcmd,
  'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(q.polroles) r),
  'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]')
  FROM pg_policy q WHERE q.polrelid=c.oid)) authority
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p') AND n.nspname||'.'||c.relname='public.service_store_categories'),
 activity_functions AS (SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_service_activity_v1','public.get_my_service_publication_snapshot_v2','public.get_my_service_publications_v2','public.renew_my_service_activity_v1','service_publication_private.activity_fields','service_publication_private.is_public','service_publication_private.start_activity']::text[])),
 activity_relations AS (SELECT n.nspname||'.'||c.relname name,
 jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'persistence',c.relpersistence,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
  'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(ad.adbin,ad.adrelid),
  'collation',CASE WHEN a.attcollation=0 THEN NULL ELSE a.attcollation::regcollation::text END) ORDER BY a.attnum),'[]')
  FROM pg_attribute a LEFT JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'definition',pg_get_constraintdef(q.oid),
  'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred,'local',q.conislocal,'inheritance',q.coninhcount,
  'no_inherit',q.connoinherit) ORDER BY q.conname),'[]') FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'nonstandard_not_null',(SELECT count(*) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype='n'
  AND (NOT q.convalidated OR NOT q.conislocal OR q.coninhcount<>0 OR q.connoinherit)),
 'inheritance',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY i.inhseqno),'[]') FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',ic.relname,'definition',pg_get_indexdef(i.indexrelid),
  'valid',i.indisvalid,'ready',i.indisready) ORDER BY ic.relname),'[]') FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid AND NOT (c.oid='public.user_blocks'::regclass AND i.indexrelid IS NOT DISTINCT FROM to_regclass('public.user_blocks_blocked_blocker_idx_v1'))),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid))
  ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND (n.nspname||'.'||c.relname=ANY(ARRAY['service_publication_private.events','service_publication_private.heads','service_publication_private.commands','service_publication_private.closed_requests','service_publication_private.gallery','service_publication_private.contact_receipts','service_publication_private.thread_context','service_publication_private.message_cards','public.services','public.service_images','horse_publication_private.thread_context']::text[]) OR NOT (t.tgrelid::regclass::text,t.tgname) IN (VALUES ('public.services','service_revision'),('public.service_images','service_gallery_authority'),('listing_publication_private.multipart_sessions','guard_service_multipart_key'),('listing_publication_private.web_images','guard_service_web_key'),('public.messages','service_message_context'),('horse_publication_private.thread_context','horse_select_context'),('service_publication_private.thread_context','service_select_context'),('service_publication_private.events','service_event_immutable'),('service_publication_private.commands','service_command_immutable'))))) structure,
 jsonb_build_object('acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'column_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('column',a.attname,'grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY a.attname,x.grantee::regrole::text,x.privilege_type),'[]') FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'permissive',q.polpermissive,'command',q.polcmd,
  'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(q.polroles) r),
  'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]')
  FROM pg_policy q WHERE q.polrelid=c.oid)) authority
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p') AND n.nspname||'.'||c.relname=ANY(ARRAY['service_publication_private.activity','service_publication_private.activity_rollout']::text[])), measured AS MATERIALIZED (
 SELECT r.result retained,encode(sha256(convert_to((jsonb_build_object('readers',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM reader_facts),'profile',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM profile_functions),
  'category',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM category_functions),'management',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM capability_functions)))::text,'UTF8')),'hex') functions,encode(sha256(convert_to(((SELECT coalesce(jsonb_agg(structure ORDER BY name),'[]') FROM store_relations))::text,'UTF8')),'hex') structure,
 encode(sha256(convert_to((jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.conrelid IS DISTINCT FROM to_regclass('public.service_store_categories') AND q.conrelid IS DISTINCT FROM to_regclass('public.horse_offer_store_categories') AND q.confrelid IN('public.store_categories'::regclass,'public.listing_store_categories'::regclass)),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN('public.store_categories'::regclass,'public.listing_store_categories'::regclass)),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN('public.store_categories'::regclass,'public.listing_store_categories'::regclass))))::text,'UTF8')),'hex') effects,encode(sha256(convert_to((jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.conrelid IS DISTINCT FROM to_regclass('service_publication_private.activity') AND q.conrelid IS DISTINCT FROM to_regclass('public.service_store_categories') AND q.conrelid IS DISTINCT FROM to_regclass('public.horse_offer_store_categories') AND q.confrelid IN('public.services'::regclass,'public.service_images'::regclass)),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN('public.services'::regclass,'public.service_images'::regclass)),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND NOT (t.tgrelid='public.services'::regclass AND t.tgname='service_activity_start') AND t.tgrelid IN('public.services'::regclass,'public.service_images'::regclass))))::text,'UTF8')),'hex') service_effects,encode(sha256(convert_to(((SELECT authority FROM store_relations WHERE name='public.store_categories'))::text,'UTF8')),'hex') category_authority,
 encode(sha256(convert_to((jsonb_build_object('roles',(SELECT jsonb_agg(jsonb_build_object('name',rolname,'super',rolsuper,
  'createrole',rolcreaterole,'createdb',rolcreatedb,'replication',rolreplication,'bypassrls',rolbypassrls) ORDER BY rolname)
  FROM pg_roles WHERE rolname IN('anon','authenticated')),
  'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(roleid),
   'member',pg_get_userbyid(member),'grantor',pg_get_userbyid(grantor),'admin',admin_option,
   'inherit',inherit_option,'set',set_option) ORDER BY roleid::regrole::text,member::regrole::text,grantor::regrole::text),'[]')
   FROM pg_auth_members WHERE member IN(to_regrole('anon'),to_regrole('authenticated')))))::text,'UTF8')),'hex') api_roles,encode(sha256(convert_to((jsonb_build_object('authority',(SELECT authority FROM store_relations WHERE name='public.listing_store_categories'),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',has_table_privilege(a.role,'public.listing_store_categories',p.privilege),
  'grantable',has_table_privilege(a.role,'public.listing_store_categories',p.privilege||' WITH GRANT OPTION'))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege)),
  'columns',(SELECT jsonb_agg(jsonb_build_object('role',r.role,'column',a.attname,'privilege',p.privilege,
  'allowed',has_column_privilege(r.role,a.attrelid,a.attname,p.privilege)) ORDER BY r.role,a.attname,p.privilege)
  FROM pg_attribute a CROSS JOIN unnest(ARRAY['anon','authenticated']) r(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','REFERENCES']) p(privilege)
  WHERE a.attrelid='public.listing_store_categories'::regclass AND a.attnum>0 AND NOT a.attisdropped))))::text,'UTF8')),'hex') legacy_authority,encode(sha256(convert_to((jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM horse_category_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM horse_category_relations),
  'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.confrelid IN(to_regclass('public.horse_offer_store_categories'))),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN(to_regclass('public.horse_offer_store_categories'))),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN(to_regclass('public.horse_offer_store_categories')))),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('public.horse_offer_store_categories'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('public.horse_offer_store_categories'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege))),
  'object_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',c.relkind,'name',n.nspname||'.'||c.relname) ORDER BY c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='horse_offer_store_categories'),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_horse_offer_store_categories_v1','public.get_public_profile_marketplace_v2','public.set_my_horse_offer_store_categories_v1']::text[]))))::text,'UTF8')),'hex') horse_capability,
 encode(sha256(convert_to((jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM service_category_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM service_category_relations),
  'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.confrelid IN(to_regclass('public.service_store_categories'))),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN(to_regclass('public.service_store_categories'))),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN(to_regclass('public.service_store_categories')))),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('public.service_store_categories'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('public.service_store_categories'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege))),
  'object_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',c.relkind,'name',n.nspname||'.'||c.relname) ORDER BY n.nspname,c.relname,c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
    AND c.relname=ANY(ARRAY['service_store_categories','service_store_categories_pkey','service_store_categories_category_idx'])),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_service_store_categories_v1','public.get_public_profile_services_v2','public.get_public_profile_store_categories_v2','public.set_my_service_store_categories_v1']::text[]))))::text,'UTF8')),'hex') service_categories,encode(sha256(convert_to((jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM activity_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM activity_relations),
  'trigger',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,
  'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]') FROM pg_trigger t
  WHERE t.tgrelid='public.services'::regclass AND t.tgname='service_activity_start'),'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.confrelid IN(to_regclass('service_publication_private.activity'),to_regclass('service_publication_private.activity_rollout'))),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN(to_regclass('service_publication_private.activity'),to_regclass('service_publication_private.activity_rollout'))),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN(to_regclass('service_publication_private.activity'),to_regclass('service_publication_private.activity_rollout')))),'effective',(SELECT jsonb_agg(jsonb_build_object('table',t.name,'role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass(t.name),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass(t.name),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY t.name,a.role,p.privilege) FROM unnest(ARRAY['service_publication_private.activity','service_publication_private.activity_rollout']::text[]) t(name)
  CROSS JOIN unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege)),
  'objects',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind) ORDER BY c.relname,c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='service_publication_private' AND c.relname=ANY(ARRAY['activity','activity_rollout','activity_pkey','activity_rollout_pkey','service_activity_until_idx']::text[])),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_service_activity_v1','public.get_my_service_publication_snapshot_v2','public.get_my_service_publications_v2','public.renew_my_service_activity_v1','service_publication_private.activity_fields','service_publication_private.is_public','service_publication_private.start_activity']::text[]))))::text,'UTF8')),'hex') capability,((SELECT count(*) FROM pg_roles WHERE rolname IN('anon','authenticated'))=2
  AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN('anon','authenticated')
   AND (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls))
  AND NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE member IN(to_regrole('anon'),to_regrole('authenticated')))
  AND NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.listing_store_categories'::regclass
   AND relowner IN(to_regrole('anon'),to_regrole('authenticated')))
  AND NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.listing_store_categories'::regclass
   AND attnum>0 AND NOT attisdropped AND cardinality(attacl)>0)
  AND has_function_privilege('authenticated','public.set_my_listing_store_categories_v2(text,uuid[])','EXECUTE')
  AND NOT has_function_privilege('anon','public.set_my_listing_store_categories_v2(text,uuid[])','EXECUTE')
  AND NOT EXISTS(SELECT 1 FROM unnest(ARRAY['anon','authenticated']) a
   WHERE has_schema_privilege(a,'public','CREATE'))) safe_api_roles,
 (SELECT jsonb_build_object('published_count',count(*) FILTER(WHERE status='published'),
  'archived_count',count(*) FILTER(WHERE status='archived'),'draft_count',count(*) FILTER(WHERE status='draft'),
  'invalid_date_count',count(*) FILTER(WHERE NOT isfinite(created_at) OR NOT isfinite(updated_at)
   OR (published_at IS NOT NULL AND NOT isfinite(published_at)) OR (status='published' AND published_at IS NULL))) FROM public.services) transition_summary,
 encode(sha256(convert_to((jsonb_build_object('retained',r.result->'invariants'->>'existing_functions','categories',jsonb_build_object('readers',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM reader_facts),'profile',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM profile_functions),
  'category',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM category_functions),'management',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM capability_functions)),'horse',jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM horse_category_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM horse_category_relations),
  'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.confrelid IN(to_regclass('public.horse_offer_store_categories'))),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN(to_regclass('public.horse_offer_store_categories'))),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN(to_regclass('public.horse_offer_store_categories')))),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('public.horse_offer_store_categories'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('public.horse_offer_store_categories'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege))),
  'object_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',c.relkind,'name',n.nspname||'.'||c.relname) ORDER BY c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='horse_offer_store_categories'),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_horse_offer_store_categories_v1','public.get_public_profile_marketplace_v2','public.set_my_horse_offer_store_categories_v1']::text[]))),'service_categories',jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM service_category_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM service_category_relations),
  'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.confrelid IN(to_regclass('public.service_store_categories'))),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN(to_regclass('public.service_store_categories'))),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN(to_regclass('public.service_store_categories')))),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('public.service_store_categories'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('public.service_store_categories'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege))),
  'object_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',c.relkind,'name',n.nspname||'.'||c.relname) ORDER BY n.nspname,c.relname,c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
    AND c.relname=ANY(ARRAY['service_store_categories','service_store_categories_pkey','service_store_categories_category_idx'])),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_service_store_categories_v1','public.get_public_profile_services_v2','public.get_public_profile_store_categories_v2','public.set_my_service_store_categories_v1']::text[])))))::text,'UTF8')),'hex') existing_functions,
 encode(sha256(convert_to((jsonb_build_object('retained',r.result->'invariants'->>'existing_authority','store_categories',(SELECT authority FROM store_relations WHERE name='public.store_categories'),'ordinary_links',jsonb_build_object('authority',(SELECT authority FROM store_relations WHERE name='public.listing_store_categories'),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',has_table_privilege(a.role,'public.listing_store_categories',p.privilege),
  'grantable',has_table_privilege(a.role,'public.listing_store_categories',p.privilege||' WITH GRANT OPTION'))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege)),
  'columns',(SELECT jsonb_agg(jsonb_build_object('role',r.role,'column',a.attname,'privilege',p.privilege,
  'allowed',has_column_privilege(r.role,a.attrelid,a.attname,p.privilege)) ORDER BY r.role,a.attname,p.privilege)
  FROM pg_attribute a CROSS JOIN unnest(ARRAY['anon','authenticated']) r(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','REFERENCES']) p(privilege)
  WHERE a.attrelid='public.listing_store_categories'::regclass AND a.attnum>0 AND NOT a.attisdropped))),'horse',jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM horse_category_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM horse_category_relations),
  'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.confrelid IN(to_regclass('public.horse_offer_store_categories'))),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN(to_regclass('public.horse_offer_store_categories'))),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN(to_regclass('public.horse_offer_store_categories')))),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('public.horse_offer_store_categories'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('public.horse_offer_store_categories'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege))),
  'object_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',c.relkind,'name',n.nspname||'.'||c.relname) ORDER BY c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='horse_offer_store_categories'),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_horse_offer_store_categories_v1','public.get_public_profile_marketplace_v2','public.set_my_horse_offer_store_categories_v1']::text[]))),'service_categories',jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM service_category_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM service_category_relations),
  'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.confrelid IN(to_regclass('public.service_store_categories'))),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN(to_regclass('public.service_store_categories'))),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN(to_regclass('public.service_store_categories')))),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('public.service_store_categories'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('public.service_store_categories'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege))),
  'object_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',c.relkind,'name',n.nspname||'.'||c.relname) ORDER BY n.nspname,c.relname,c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
    AND c.relname=ANY(ARRAY['service_store_categories','service_store_categories_pkey','service_store_categories_category_idx'])),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_service_store_categories_v1','public.get_public_profile_services_v2','public.get_public_profile_store_categories_v2','public.set_my_service_store_categories_v1']::text[]))),'api_roles',jsonb_build_object('roles',(SELECT jsonb_agg(jsonb_build_object('name',rolname,'super',rolsuper,
  'createrole',rolcreaterole,'createdb',rolcreatedb,'replication',rolreplication,'bypassrls',rolbypassrls) ORDER BY rolname)
  FROM pg_roles WHERE rolname IN('anon','authenticated')),
  'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(roleid),
   'member',pg_get_userbyid(member),'grantor',pg_get_userbyid(grantor),'admin',admin_option,
   'inherit',inherit_option,'set',set_option) ORDER BY roleid::regrole::text,member::regrole::text,grantor::regrole::text),'[]')
   FROM pg_auth_members WHERE member IN(to_regrole('anon'),to_regrole('authenticated'))))))::text,'UTF8')),'hex') existing_authority,
 encode(sha256(convert_to((jsonb_build_object('retained',r.result->'invariants'->>'immutable_structure','categories',(SELECT coalesce(jsonb_agg(structure ORDER BY name),'[]') FROM store_relations),'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.conrelid IS DISTINCT FROM to_regclass('public.service_store_categories') AND q.conrelid IS DISTINCT FROM to_regclass('public.horse_offer_store_categories') AND q.confrelid IN('public.store_categories'::regclass,'public.listing_store_categories'::regclass)),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN('public.store_categories'::regclass,'public.listing_store_categories'::regclass)),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN('public.store_categories'::regclass,'public.listing_store_categories'::regclass))),'service_effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.conrelid IS DISTINCT FROM to_regclass('service_publication_private.activity') AND q.conrelid IS DISTINCT FROM to_regclass('public.service_store_categories') AND q.conrelid IS DISTINCT FROM to_regclass('public.horse_offer_store_categories') AND q.confrelid IN('public.services'::regclass,'public.service_images'::regclass)),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN('public.services'::regclass,'public.service_images'::regclass)),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND NOT (t.tgrelid='public.services'::regclass AND t.tgname='service_activity_start') AND t.tgrelid IN('public.services'::regclass,'public.service_images'::regclass))),'horse',jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM horse_category_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM horse_category_relations),
  'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.confrelid IN(to_regclass('public.horse_offer_store_categories'))),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN(to_regclass('public.horse_offer_store_categories'))),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN(to_regclass('public.horse_offer_store_categories')))),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('public.horse_offer_store_categories'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('public.horse_offer_store_categories'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege))),
  'object_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',c.relkind,'name',n.nspname||'.'||c.relname) ORDER BY c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='horse_offer_store_categories'),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_horse_offer_store_categories_v1','public.get_public_profile_marketplace_v2','public.set_my_horse_offer_store_categories_v1']::text[]))),'service_categories',jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM service_category_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM service_category_relations),
  'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.confrelid IN(to_regclass('public.service_store_categories'))),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN(to_regclass('public.service_store_categories'))),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN(to_regclass('public.service_store_categories')))),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('public.service_store_categories'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('public.service_store_categories'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege))),
  'object_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',c.relkind,'name',n.nspname||'.'||c.relname) ORDER BY n.nspname,c.relname,c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
    AND c.relname=ANY(ARRAY['service_store_categories','service_store_categories_pkey','service_store_categories_category_idx'])),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_service_store_categories_v1','public.get_public_profile_services_v2','public.get_public_profile_store_categories_v2','public.set_my_service_store_categories_v1']::text[])))))::text,'UTF8')),'hex') immutable_structure
 FROM retained r), checks AS MATERIALIZED (
 SELECT *,jsonb_build_object(
 'installer',coalesce((retained->'guards'->>'installer')::boolean,false),
 'actor_roles',coalesce((retained->'guards'->>'actor_roles')::boolean,false),
 'hosted_context_ready',coalesce((retained->'guards'->>'hosted_context_ready')::boolean,false),
 'retained_release',coalesce(retained->>'state'='applied' AND (retained->>'recognized')::boolean
  AND (retained->>'dependencies_ok')::boolean AND NOT EXISTS(SELECT 1 FROM jsonb_each(retained->'guards') g WHERE g.value<>'true'::jsonb)
  AND retained->'fingerprints'->>'dependencies'='9dd1c4ef3f97785a8f164bb5409f9e4788835fd7a280d8b5db326c36c1be2572'
  AND retained->'fingerprints'->>'capability'='7ac89799f70adb757c5f4eb2edb072e774141f315e6be8a3fb117b30c184ad9b',false),
 'category_functions',functions='e35a9612959d89d4638ca5b3f735616f16cc3363082c6c98302e07120f5f93f7' AND (SELECT count(*) FROM reader_facts)=3 AND (SELECT count(*) FROM profile_functions)=3
   AND (SELECT count(*) FROM category_functions)=9
   AND (SELECT count(*) FROM capability_functions)=1,
 'category_structure',structure='ab43784d467e7a72f2e8e79af3ab6ea47cc48142d2650ba97bcd0ff878bf3c5c' AND (SELECT count(*) FROM store_relations)=2,
 'category_delete_effects',effects='f98cc99812d85d67edc3e525e30e6c80d1c9b5b03b95e99a62f9bdba93aeabe2','service_delete_effects',service_effects='ed0a2afef1ac255765cd192495450ce1b835e7489b5811d4a1103cef97d66336',
 'retained_category_authority',category_authority='1db12d28099908a0d9e7cecedbf242d3fa95eb92c0183c606536769c8ea9cf71',
 'retained_link_authority',legacy_authority='d03a0054400a33d579e75d323531cde60a36ebef17c7e0478fcf89bd9d7e1983',
 'retained_horse_categories',horse_capability='66505e3f48da375c7d929f2732bc6f41a99a6caf468847b9fe911fe327c9e937',
 'retained_service_categories',service_categories='2a7d340ea0b8090a976e67c0042a8dbd946acc0df103b678c989f57e94edde06',
 'api_roles_and_entrypoints',safe_api_roles AND api_roles='a6b12ec9f31ef3e66313f5237759bd8eba9d59e906b4995dac67bbb73d0de1b5',
 'service_dates',(transition_summary->>'invalid_date_count')::bigint=0) guards,
 capability='7d41cdbb327fc60516e89116fd67f54e96fd7650f9a4c654b9482ce1e9c7fece' capability_absent,capability='1626569c5e4407df7c40bb70261350c2e1e95a1ab490aff065da49d198a2f632' capability_present FROM measured),
 assessed AS MATERIALIZED (SELECT *,NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value<>'true'::jsonb) dependencies_ok FROM checks)
 SELECT jsonb_build_object('schema_version',1,'kind','service-activity-v1',
 'state',CASE WHEN dependencies_ok AND capability_absent AND NOT capability_present THEN 'absent'
 WHEN dependencies_ok AND capability_present AND NOT capability_absent THEN 'applied' ELSE 'unknown' END,
 'recognized',dependencies_ok AND (capability_absent<>capability_present),
 'ready_to_apply',dependencies_ok AND capability_absent AND NOT capability_present,
 'dependencies_ok',dependencies_ok,'capability_absent',capability_absent,'capability_present',capability_present,
 'guards',guards,'hosted_context',retained->'hosted_context','transition_summary',transition_summary,
 'fingerprints',jsonb_build_object('dependencies',encode(sha256(convert_to((jsonb_build_object('retained',retained->'fingerprints','functions',functions,'structure',structure,'effects',effects,'service_effects',service_effects,'category_authority',category_authority,'ordinary_links',legacy_authority,'horse',horse_capability,'service_categories',service_categories,'api_roles',api_roles))::text,'UTF8')),'hex'),'capability',capability),
 'invariants',jsonb_build_object('existing_functions',existing_functions,'existing_authority',existing_authority,'immutable_structure',immutable_structure)) result FROM assessed),control_functions AS (SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind IN('f','p') AND (n.nspname='provider_controls_private' OR n.nspname||'.'||p.proname=ANY(ARRAY['public.get_marketplace_listings','public.get_marketplace_listings_nearby','public.get_my_provider_control_v1','public.get_store_by_slug','public.hidden_provider_ids_for_viewer_v1','public.list_my_provider_controls_v1','public.listing_images','public.listing_translations','public.search_public_listings_v1','public.search_public_listings_v2','public.search_public_marketplace_v1','public.search_public_services_v1','public.set_my_provider_control_v1']::text[]))), control_relations AS (SELECT n.nspname||'.'||c.relname name,
 jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'persistence',c.relpersistence,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
  'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(ad.adbin,ad.adrelid),
  'collation',CASE WHEN a.attcollation=0 THEN NULL ELSE a.attcollation::regcollation::text END) ORDER BY a.attnum),'[]')
  FROM pg_attribute a LEFT JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'definition',pg_get_constraintdef(q.oid),
  'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred,'local',q.conislocal,'inheritance',q.coninhcount,
  'no_inherit',q.connoinherit) ORDER BY q.conname),'[]') FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'nonstandard_not_null',(SELECT count(*) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype='n'
  AND (NOT q.convalidated OR NOT q.conislocal OR q.coninhcount<>0 OR q.connoinherit)),
 'inheritance',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY i.inhseqno),'[]') FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',ic.relname,'definition',pg_get_indexdef(i.indexrelid),
  'valid',i.indisvalid,'ready',i.indisready) ORDER BY ic.relname),'[]') FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid))
  ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND (n.nspname||'.'||c.relname=ANY(ARRAY['service_publication_private.events','service_publication_private.heads','service_publication_private.commands','service_publication_private.closed_requests','service_publication_private.gallery','service_publication_private.contact_receipts','service_publication_private.thread_context','service_publication_private.message_cards','public.services','public.service_images','horse_publication_private.thread_context']::text[]) OR NOT (t.tgrelid::regclass::text,t.tgname) IN (VALUES ('public.services','service_revision'),('public.service_images','service_gallery_authority'),('listing_publication_private.multipart_sessions','guard_service_multipart_key'),('listing_publication_private.web_images','guard_service_web_key'),('public.messages','service_message_context'),('horse_publication_private.thread_context','horse_select_context'),('service_publication_private.thread_context','service_select_context'),('service_publication_private.events','service_event_immutable'),('service_publication_private.commands','service_command_immutable'))))) structure,
 jsonb_build_object('acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'column_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('column',a.attname,'grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY a.attname,x.grantee::regrole::text,x.privilege_type),'[]') FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'permissive',q.polpermissive,'command',q.polcmd,
  'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(q.polroles) r),
  'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]')
  FROM pg_policy q WHERE q.polrelid=c.oid)) authority
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p') AND n.nspname='provider_controls_private'), measured AS MATERIALIZED (
 SELECT r.result retained,encode(sha256(convert_to((jsonb_build_object(
 'functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM control_functions),
 'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM control_relations),
 'effective',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('provider_controls_private.hidden_providers'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('provider_controls_private.hidden_providers'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege)),
 'reverse_block_index',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,
 'owner',pg_get_userbyid(c.relowner),'definition',CASE WHEN ix.indexrelid IS NOT NULL THEN pg_get_indexdef(ix.indexrelid) END,
 'valid',ix.indisvalid,'ready',ix.indisready,'unique',ix.indisunique,'options',c.reloptions) ORDER BY c.relname),'[]')
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_index ix ON ix.indexrelid=c.oid
 WHERE n.nspname='public' AND c.relname='user_blocks_blocked_blocker_idx_v1'),
 'view',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,
 'owner',pg_get_userbyid(c.relowner),'options',c.reloptions,'definition',CASE WHEN c.relkind='v' THEN pg_get_viewdef(c.oid,true) END,
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY x.grantee::regrole::text,x.privilege_type) FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'acl',a.attacl::text)
 ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped)) ORDER BY c.relname),'[]')
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='discovery_listings_v1'),
 'schema',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY x.grantee::regrole::text,x.privilege_type)
 FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)) ORDER BY n.nspname),'[]') FROM pg_namespace n WHERE n.nspname='provider_controls_private'),
 'objects',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner)) ORDER BY c.relname,c.relkind),'[]')
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='provider_controls_private'),
 'types',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.typname,'kind',t.typtype,'owner',pg_get_userbyid(t.typowner)) ORDER BY t.typname),'[]')
 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='provider_controls_private'),
 'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname||'.'||p.proname,'kind',p.prokind,
 'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='provider_controls_private' OR n.nspname||'.'||p.proname=ANY(ARRAY['public.get_marketplace_listings','public.get_marketplace_listings_nearby','public.get_my_provider_control_v1','public.get_store_by_slug','public.hidden_provider_ids_for_viewer_v1','public.list_my_provider_controls_v1','public.listing_images','public.listing_translations','public.search_public_listings_v1','public.search_public_listings_v2','public.search_public_marketplace_v1','public.search_public_services_v1','public.set_my_provider_control_v1']::text[])),
 'incoming',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'source',q.conrelid::regclass::text,'definition',pg_get_constraintdef(q.oid)) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
 FROM pg_constraint q WHERE q.contype='f' AND q.confrelid=to_regclass('provider_controls_private.hidden_providers')),
 'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rulename,'definition',pg_get_ruledef(r.oid)) ORDER BY r.rulename),'[]')
 FROM pg_rewrite r WHERE r.ev_class=to_regclass('provider_controls_private.hidden_providers')),
 'defaults',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(d.defaclrole),'kind',d.defaclobjtype,
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY x.grantee::regrole::text,x.privilege_type) FROM aclexplode(d.defaclacl) x))
 ORDER BY d.defaclrole::regrole::text,d.defaclobjtype),'[]') FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname='provider_controls_private')))::text,'UTF8')),'hex') capability,encode(sha256(convert_to(((SELECT jsonb_build_object('owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,
 'pair_index_ready',EXISTS(SELECT 1 FROM pg_index ix
 WHERE ix.indrelid=c.oid AND ix.indisunique AND ix.indisvalid AND ix.indisready AND ix.indnkeyatts=2 AND ix.indpred IS NULL AND ix.indexprs IS NULL
 AND strpos(pg_get_indexdef(ix.indexrelid),' USING btree ')>0
 AND (SELECT array_agg(a.attname::text ORDER BY key.ord) FROM unnest(ix.indkey) WITH ORDINALITY key(attnum,ord)
 JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=key.attnum WHERE key.ord<=ix.indnkeyatts)=ARRAY['blocker_id','blocked_id']::text[]),
 'primary_id_ready',EXISTS(SELECT 1 FROM pg_index ix WHERE ix.indrelid=c.oid AND ix.indisprimary AND ix.indisvalid AND ix.indisready AND ix.indnkeyatts=1
 AND (SELECT array_agg(a.attname::text) FROM unnest(ix.indkey) key(attnum) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=key.attnum)=ARRAY['id']::text[]),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'permissive',q.polpermissive,'command',q.polcmd,
 'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(q.polroles) r),
 'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]') FROM pg_policy q WHERE q.polrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]')
 FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal),
 'rules',(SELECT coalesce(jsonb_agg(pg_get_ruledef(r.oid) ORDER BY r.rulename),'[]') FROM pg_rewrite r WHERE r.ev_class=c.oid),
 'incoming',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,'definition',pg_get_constraintdef(q.oid)) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
 FROM pg_constraint q WHERE q.contype='f' AND q.confrelid=c.oid)) FROM pg_class c WHERE c.oid='public.user_blocks'::regclass))::text,'UTF8')),'hex') block_authority FROM retained r), checks AS MATERIALIZED (
 SELECT *,retained->'guards'||jsonb_build_object('retained_activity',coalesce(retained->>'state'='applied'
 AND (retained->>'recognized')::boolean AND (retained->>'dependencies_ok')::boolean
 AND retained->'fingerprints'='{"capability":"1626569c5e4407df7c40bb70261350c2e1e95a1ab490aff065da49d198a2f632","dependencies":"2efa9618fa872ff8cdfdca6fd1100fed477e464d8e7ef5f453af20cb63374578"}'::jsonb,false),
 'account_block_authority',block_authority='a7533e3bf5a49fa6d3ccbbd793746bdf4cf1565c4a6d7d024c29fdd9db8a4264') guards,
 capability='f62e31856c664d3d5ac92506b1d652cd30f499a9ce661ed5a26b5b729aaed281' capability_absent,capability='d3c84d6f27b060190000dcf0463582c269534e8eda399c22a7c25c89386ec65e' capability_present FROM measured),
 assessed AS MATERIALIZED(SELECT *,NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value<>'true'::jsonb) dependencies_ok FROM checks)
 SELECT jsonb_build_object('schema_version',1,'kind','provider-controls-v1',
 'state',CASE WHEN dependencies_ok AND capability_absent AND NOT capability_present THEN 'absent'
 WHEN dependencies_ok AND capability_present AND NOT capability_absent THEN 'applied' ELSE 'unknown' END,
 'recognized',dependencies_ok AND (capability_absent<>capability_present),'ready_to_apply',dependencies_ok AND capability_absent AND NOT capability_present,
 'dependencies_ok',dependencies_ok,'capability_absent',capability_absent,'capability_present',capability_present,
 'fingerprints',jsonb_build_object('dependencies',encode(sha256(convert_to((jsonb_build_object('retained',retained->'fingerprints','account_blocks',block_authority))::text,'UTF8')),'hex'),'capability',capability),
 'invariants',retained->'invariants','hosted_context',retained->'hosted_context','guards',guards) result FROM assessed;
 DO $before$ DECLARE before_report jsonb; BEGIN
 SELECT result INTO STRICT before_report FROM pg_temp.provider_controls_before;
 IF (before_report->>'state' IN('absent','applied') AND (before_report->>'recognized')::boolean
 AND (before_report->>'dependencies_ok')::boolean) IS NOT TRUE THEN
 RAISE EXCEPTION 'PROVIDER_CONTROLS_PRECONDITIONS_NOT_MATCHED' USING ERRCODE='55000';END IF;
 EXCEPTION WHEN no_data_found OR too_many_rows THEN
 RAISE EXCEPTION 'PROVIDER_CONTROLS_PRECONDITIONS_NOT_MATCHED' USING ERRCODE='55000';END $before$;
 DO $apply$ DECLARE before_report jsonb; BEGIN
 SELECT result INTO STRICT before_report FROM pg_temp.provider_controls_before;
 IF before_report->>'state'='absent' THEN
 EXECUTE $controls$-- COMPONENT 01_state.sql
-- One free, account-scoped discovery preference. No content or message writes.
CREATE SCHEMA provider_controls_private;
REVOKE ALL ON SCHEMA provider_controls_private FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE provider_controls_private.hidden_providers (
 viewer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 provider_identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE RESTRICT,
 revision uuid NOT NULL CHECK(revision<>'00000000-0000-0000-0000-000000000000'::uuid),
 hidden_until timestamptz CHECK(hidden_until IS NULL OR isfinite(hidden_until)),
 PRIMARY KEY(viewer_user_id,provider_identity_id)
);
CREATE INDEX hidden_providers_active_idx ON provider_controls_private.hidden_providers
 (viewer_user_id,hidden_until DESC,provider_identity_id) WHERE hidden_until IS NOT NULL;
ALTER TABLE provider_controls_private.hidden_providers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON provider_controls_private.hidden_providers FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION provider_controls_private.require_actor(p_expected_user_id uuid) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL OR p_expected_user_id IS NULL OR actor<>p_expected_user_id
 OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=actor) THEN
  RAISE EXCEPTION 'provider_control_actor_mismatch' USING ERRCODE='42501';END IF;
 RETURN actor;
END $f$;

CREATE FUNCTION provider_controls_private.validate_target(p_type text,p_id text) RETURNS void
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF p_type IS NULL OR p_id IS NULL OR p_type NOT IN('listing','horse_offer','service','profile','hidden_provider','blocked_account','conversation') THEN
  RAISE EXCEPTION 'provider_control_target_invalid' USING ERRCODE='22023';END IF;
 IF p_type='listing' THEN
  IF p_id!~'^(0|[1-9][0-9]{0,18}|-[1-9][0-9]{0,18})$' THEN
   RAISE EXCEPTION 'provider_control_target_invalid' USING ERRCODE='22023';END IF;
  IF p_id::numeric NOT BETWEEN -9223372036854775808 AND 9223372036854775807 THEN
   RAISE EXCEPTION 'provider_control_target_invalid' USING ERRCODE='22023';END IF;
 ELSIF p_type IN('blocked_account','conversation') THEN
  IF p_id!~'^[1-9][0-9]{0,18}$' THEN RAISE EXCEPTION 'provider_control_target_invalid' USING ERRCODE='22023';END IF;
  IF p_id::numeric>9223372036854775807 THEN RAISE EXCEPTION 'provider_control_target_invalid' USING ERRCODE='22023';END IF;
 ELSIF p_id!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  OR p_id='00000000-0000-0000-0000-000000000000' THEN
  RAISE EXCEPTION 'provider_control_target_invalid' USING ERRCODE='22023';END IF;
END $f$;

CREATE FUNCTION provider_controls_private.is_own_provider(p_actor uuid,p_identity uuid,p_account uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT p_actor=p_account OR EXISTS(SELECT 1 FROM public.identities i
 LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
 WHERE i.id=p_identity AND ((i.type='private' AND i.user_id=p_actor)
 OR (i.type='business' AND (b.owner_user_id=p_actor OR EXISTS(SELECT 1 FROM public.business_members m
 WHERE m.business_account_id=i.business_account_id AND m.user_id=p_actor AND m.status='active')))));
$f$;
REVOKE ALL ON FUNCTION provider_controls_private.require_actor(uuid),
 provider_controls_private.validate_target(text,text),provider_controls_private.is_own_provider(uuid,uuid,uuid)
 FROM PUBLIC,anon,authenticated,service_role;

-- COMPONENT 02_target.sql
-- Resolve only a currently public content reference or an existing own preference.
-- Account IDs are private here. The public response contains only provider metadata.
CREATE FUNCTION provider_controls_private.resolve_target(p_actor uuid,p_type text,p_id text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE identity_value uuid;account_value uuid;metadata jsonb;identity_active boolean;
BEGIN
 PERFORM provider_controls_private.validate_target(p_type,p_id);
 CASE p_type
 WHEN 'listing' THEN
  SELECT l.identity_id,l.user_id INTO identity_value,account_value FROM public.listings l
  JOIN public.identities i ON i.id=l.identity_id AND i.status='active'
  JOIN public.identity_profiles ip ON ip.identity_id=i.id
  WHERE l.id=p_id::bigint AND l.status='active' AND (l.active_until IS NULL OR l.active_until>statement_timestamp());
 WHEN 'horse_offer' THEN
  SELECT h.identity_id,h.created_by_user_id INTO identity_value,account_value FROM public.horse_offers h
  JOIN public.identities i ON i.id=h.identity_id AND i.status='active'
  JOIN public.identity_profiles ip ON ip.identity_id=i.id
  WHERE h.id=p_id::uuid AND horse_publication_private.is_public(h.id);
 WHEN 'service' THEN
  SELECT s.identity_id,CASE WHEN i.type='private' THEN i.user_id ELSE b.owner_user_id END
  INTO identity_value,account_value FROM public.services s JOIN public.identities i ON i.id=s.identity_id AND i.status='active'
  LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
  WHERE s.id=p_id::uuid AND service_publication_private.is_public(s.id);
 WHEN 'profile' THEN
  SELECT i.id,CASE WHEN i.type='private' THEN i.user_id ELSE b.owner_user_id END
  INTO identity_value,account_value FROM public.identities i
  JOIN public.identity_profiles ip ON ip.identity_id=i.id
  LEFT JOIN public.business_accounts b ON b.id=i.business_account_id WHERE i.id=p_id::uuid AND i.status='active';
 WHEN 'hidden_provider' THEN
  SELECT i.id,CASE WHEN i.type='private' THEN i.user_id ELSE b.owner_user_id END
  INTO identity_value,account_value FROM provider_controls_private.hidden_providers h
  JOIN public.identities i ON i.id=h.provider_identity_id
  LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
  WHERE h.viewer_user_id=p_actor AND h.provider_identity_id=p_id::uuid;
 WHEN 'blocked_account' THEN
  SELECT b.blocked_id INTO account_value FROM public.user_blocks b WHERE b.id=p_id::bigint AND b.blocker_id=p_actor;
  IF account_value IS NOT NULL THEN
   SELECT i.id INTO identity_value FROM public.identities i LEFT JOIN public.identity_profiles ip ON ip.identity_id=i.id
   WHERE i.type='private' AND i.user_id=account_value ORDER BY (i.status='active') DESC,ip.slug NULLS LAST,i.id LIMIT 1;
  END IF;
 WHEN 'conversation' THEN
  SELECT CASE WHEN c.buyer_id=p_actor THEN c.seller_identity_id ELSE c.buyer_identity_id END,
   CASE WHEN c.buyer_id=p_actor THEN c.seller_id ELSE c.buyer_id END INTO identity_value,account_value
  FROM public.conversations c WHERE c.id=p_id::bigint AND p_actor IN(c.buyer_id,c.seller_id)
  AND messaging_private_v2.exact_thread(c.id,p_actor,CASE WHEN c.buyer_id=p_actor THEN c.buyer_identity_id ELSE c.seller_identity_id END);
 END CASE;
 IF identity_value IS NULL AND account_value IS NULL THEN RETURN NULL;END IF;
 -- The caller's own block must remain readable for reconciliation and undo.
 -- An incoming block alone cannot reveal a formerly public content target.
 IF p_type NOT IN('hidden_provider','blocked_account','conversation') AND EXISTS(SELECT 1 FROM public.user_blocks b
 WHERE b.blocker_id=account_value AND b.blocked_id=p_actor)
 AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE b.blocker_id=p_actor AND b.blocked_id=account_value) THEN RETURN NULL;END IF;
 SELECT jsonb_build_object('identity_id',i.id,'display_name',left(coalesce(nullif(ip.display_name,''),nullif(i.display_name,''),'Selqiro'),200),
  'slug',CASE WHEN length(ip.slug)<=512 THEN ip.slug END,
  'avatar_url',CASE WHEN length(ip.avatar_url)<=2048 AND ip.avatar_url~'^(https?://|/api/)' THEN ip.avatar_url END,
  'identity_active',i.status='active') INTO metadata
 FROM public.identities i LEFT JOIN public.identity_profiles ip ON ip.identity_id=i.id WHERE i.id=identity_value;
 IF metadata IS NULL THEN metadata:=jsonb_build_object('identity_id',NULL,'display_name','Selqiro',
 'slug',NULL,'avatar_url',NULL,'identity_active',false);END IF;
 RETURN metadata||jsonb_build_object('account_id',account_value,'target_token',encode(sha256(convert_to(
  jsonb_build_array(p_actor,p_type,p_id,identity_value,account_value)::text,'UTF8')),'hex'));
END $f$;

-- SET holds the referenced content and identity before resolving the binding again.
-- The account-block table is locked only afterwards, matching messaging order.
CREATE FUNCTION provider_controls_private.lock_target(p_actor uuid,p_type text,p_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE identity_value uuid;business_value uuid;
BEGIN
 PERFORM provider_controls_private.validate_target(p_type,p_id);
 PERFORM 1 FROM public.profiles WHERE id=p_actor FOR KEY SHARE;
 CASE p_type
 WHEN 'listing' THEN SELECT identity_id INTO identity_value FROM public.listings WHERE id=p_id::bigint FOR SHARE;
 WHEN 'horse_offer' THEN SELECT identity_id INTO identity_value FROM public.horse_offers WHERE id=p_id::uuid FOR SHARE;
 WHEN 'service' THEN SELECT identity_id INTO identity_value FROM public.services WHERE id=p_id::uuid FOR SHARE;
 WHEN 'profile' THEN identity_value:=p_id::uuid;
 WHEN 'hidden_provider' THEN SELECT provider_identity_id INTO identity_value FROM provider_controls_private.hidden_providers
  WHERE viewer_user_id=p_actor AND provider_identity_id=p_id::uuid;
 ELSE NULL;
 END CASE;
 IF identity_value IS NOT NULL THEN
  SELECT business_account_id INTO business_value FROM public.identities WHERE id=identity_value FOR SHARE;
  IF business_value IS NOT NULL THEN PERFORM 1 FROM public.business_accounts WHERE id=business_value FOR SHARE;END IF;
 END IF;
END $f$;
REVOKE ALL ON FUNCTION provider_controls_private.resolve_target(uuid,text,text),
 provider_controls_private.lock_target(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;

-- COMPONENT 03_reads.sql
CREATE FUNCTION provider_controls_private.snapshot(p_actor uuid,p_type text,p_id text,p_target jsonb,p_now timestamptz) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE h provider_controls_private.hidden_providers%ROWTYPE;b public.user_blocks%ROWTYPE;
 identity_value uuid:=(p_target->>'identity_id')::uuid;account_value uuid:=(p_target->>'account_id')::uuid;
 other_block boolean:=false;own_provider boolean:=true;available boolean:=p_target IS NOT NULL;
BEGIN
 IF available THEN
  SELECT * INTO h FROM provider_controls_private.hidden_providers WHERE viewer_user_id=p_actor AND provider_identity_id=identity_value;
  SELECT * INTO b FROM public.user_blocks WHERE blocker_id=p_actor AND blocked_id=account_value;
  SELECT EXISTS(SELECT 1 FROM public.user_blocks WHERE blocker_id=account_value AND blocked_id=p_actor) INTO other_block;
  own_provider:=coalesce(provider_controls_private.is_own_provider(p_actor,identity_value,account_value),false);
 END IF;
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_actor,'target_type',p_type,'target_id',p_id,
  'target_available',available,'target_token',p_target->>'target_token',
  'provider',jsonb_build_object('identity_id',identity_value,'display_name',coalesce(p_target->>'display_name','Selqiro'),
   'slug',p_target->>'slug','avatar_url',p_target->>'avatar_url'),
  'hidden_until',h.hidden_until,'hidden',coalesce(h.hidden_until>p_now,false),'hide_revision',h.revision,
  'blocked_by_me',b.id IS NOT NULL,'blocked_by_other',other_block,'block_id',b.id::text,'block_created_at',b.created_at,
  'can_hide',available AND identity_value IS NOT NULL AND NOT own_provider AND coalesce((p_target->>'identity_active')::boolean,false)
   AND p_type NOT IN('blocked_account','hidden_provider','conversation') AND b.id IS NULL AND NOT other_block,
  'can_block',available AND account_value IS NOT NULL AND NOT own_provider AND p_type NOT IN('hidden_provider','conversation')
   AND (b.id IS NOT NULL OR NOT other_block),'server_now',p_now);
END $f$;

CREATE FUNCTION public.get_my_provider_control_v1(p_expected_user_id uuid,p_target_type text,p_target_id text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE actor uuid:=provider_controls_private.require_actor(p_expected_user_id);target jsonb;
 read_time timestamptz:=statement_timestamp();
BEGIN
 target:=provider_controls_private.resolve_target(actor,p_target_type,p_target_id);
 RETURN provider_controls_private.snapshot(actor,p_target_type,p_target_id,target,read_time);
END $f$;

CREATE FUNCTION public.list_my_provider_controls_v1(p_expected_user_id uuid,p_kind text,
 p_result_limit integer DEFAULT 25,p_result_offset integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE actor uuid:=provider_controls_private.require_actor(p_expected_user_id);items jsonb;total bigint;
 read_time timestamptz:=statement_timestamp();
BEGIN
 IF p_kind IS NULL OR p_kind NOT IN('hidden','blocked') OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 50
 OR p_result_offset IS NULL OR p_result_offset NOT BETWEEN 0 AND 100000 THEN
  RAISE EXCEPTION 'provider_control_list_invalid' USING ERRCODE='22023';END IF;
 WITH candidates AS MATERIALIZED(
  SELECT 'hidden_provider'::text target_type,h.provider_identity_id::text target_id,h.hidden_until sort_time
  FROM provider_controls_private.hidden_providers h WHERE p_kind='hidden' AND h.viewer_user_id=actor AND h.hidden_until>read_time
  UNION ALL SELECT 'blocked_account',b.id::text,b.created_at FROM public.user_blocks b WHERE p_kind='blocked' AND b.blocker_id=actor
 ), page AS(SELECT * FROM candidates ORDER BY sort_time DESC,target_id LIMIT p_result_limit OFFSET p_result_offset)
 SELECT (SELECT count(*) FROM candidates),coalesce((SELECT jsonb_agg(provider_controls_private.snapshot(actor,p.target_type,p.target_id,
  provider_controls_private.resolve_target(actor,p.target_type,p.target_id),read_time) ORDER BY p.sort_time DESC,p.target_id) FROM page p),'[]'::jsonb)
 INTO total,items;
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',actor,'kind',p_kind,'items',items,'total_count',total::text,
 'result_limit',p_result_limit,'result_offset',p_result_offset,'has_more',p_result_offset+jsonb_array_length(items)<total,
 'next_offset',CASE WHEN p_result_offset+jsonb_array_length(items)<total THEN p_result_offset+jsonb_array_length(items) END);
END $f$;
REVOKE ALL ON FUNCTION provider_controls_private.snapshot(uuid,text,text,jsonb,timestamptz),
 public.get_my_provider_control_v1(uuid,text,text),public.list_my_provider_controls_v1(uuid,text,integer,integer)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_provider_control_v1(uuid,text,text),
 public.list_my_provider_controls_v1(uuid,text,integer,integer) TO authenticated;

-- COMPONENT 04_actions.sql
CREATE FUNCTION public.set_my_provider_control_v1(p_expected_user_id uuid,p_target_type text,p_target_id text,p_action text,
 p_expected_target_token text,p_expected_revision uuid DEFAULT NULL,p_next_revision uuid DEFAULT NULL,
 p_expected_block_id text DEFAULT NULL,p_expected_block_created_at timestamptz DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE actor uuid:=provider_controls_private.require_actor(p_expected_user_id);target jsonb;state jsonb;
 identity_value uuid;account_value uuid;h provider_controls_private.hidden_providers%ROWTYPE;b public.user_blocks%ROWTYPE;
 read_time timestamptz;changed boolean:=false;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'provider_control_read_committed_required' USING ERRCODE='22023';END IF;
 IF p_action IS NULL OR p_action NOT IN('hide','unhide','block','unblock') OR p_expected_target_token IS NULL
 OR p_expected_target_token!~'^[0-9a-f]{64}$' OR (p_target_type='hidden_provider' AND p_action<>'unhide')
 OR (p_target_type='blocked_account' AND p_action<>'unblock') OR p_target_type='conversation' THEN
  RAISE EXCEPTION 'provider_control_action_invalid' USING ERRCODE='22023';END IF;
 IF p_action IN('hide','unhide') THEN
  IF p_next_revision IS NULL OR p_next_revision='00000000-0000-0000-0000-000000000000'::uuid
  OR p_next_revision=p_expected_revision OR p_expected_block_id IS NOT NULL OR p_expected_block_created_at IS NOT NULL THEN
   RAISE EXCEPTION 'provider_control_revision_invalid' USING ERRCODE='22023';END IF;
 ELSE
  IF p_expected_revision IS NOT NULL OR p_next_revision IS NOT NULL
  OR ((p_expected_block_id IS NULL)<>(p_expected_block_created_at IS NULL))
  OR (p_expected_block_created_at IS NOT NULL AND NOT isfinite(p_expected_block_created_at)) THEN
   RAISE EXCEPTION 'provider_control_block_input_invalid' USING ERRCODE='22023';END IF;
  IF p_expected_block_id IS NOT NULL THEN PERFORM provider_controls_private.validate_target('blocked_account',p_expected_block_id);END IF;
  IF p_action='unblock' AND p_expected_block_id IS NULL THEN
   RAISE EXCEPTION 'provider_control_block_input_invalid' USING ERRCODE='22023';END IF;
 END IF;
 PERFORM provider_controls_private.lock_target(actor,p_target_type,p_target_id);
 -- A bounded table lock is the existing account-block serialization contract.
 IF p_action IN('block','unblock') THEN LOCK TABLE public.user_blocks IN SHARE ROW EXCLUSIVE MODE;
 ELSE LOCK TABLE public.user_blocks IN SHARE MODE;END IF;
 target:=provider_controls_private.resolve_target(actor,p_target_type,p_target_id);
 IF target IS NULL THEN RAISE EXCEPTION 'provider_control_unavailable' USING ERRCODE='42501';END IF;
 IF target->>'target_token' IS DISTINCT FROM p_expected_target_token THEN
  RAISE EXCEPTION 'provider_control_target_conflict' USING ERRCODE='40001';END IF;
 identity_value:=(target->>'identity_id')::uuid;account_value:=(target->>'account_id')::uuid;
 IF p_action IN('hide','unhide') THEN
  IF identity_value IS NULL THEN RAISE EXCEPTION 'provider_control_unavailable' USING ERRCODE='42501';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('selqiro-provider-control:'||actor::text||':'||identity_value::text,0));
  SELECT * INTO h FROM provider_controls_private.hidden_providers WHERE viewer_user_id=actor AND provider_identity_id=identity_value FOR UPDATE;
  read_time:=clock_timestamp();
  state:=provider_controls_private.snapshot(actor,p_target_type,p_target_id,target,read_time);
  IF p_action='hide' AND NOT (state->>'can_hide')::boolean THEN
   RAISE EXCEPTION 'provider_control_unavailable' USING ERRCODE='42501';END IF;
  -- Exact replay never restarts the clock. A new generation requires its own CAS.
  IF h.revision=p_next_revision AND ((p_action='hide' AND h.hidden_until IS NOT NULL) OR (p_action='unhide' AND h.hidden_until IS NULL)) THEN NULL;
  ELSE
   IF h.revision IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'provider_control_conflict' USING ERRCODE='40001';END IF;
   IF (p_action='hide' AND NOT coalesce(h.hidden_until>read_time,false)) OR (p_action='unhide' AND h.hidden_until IS NOT NULL) THEN
    INSERT INTO provider_controls_private.hidden_providers(viewer_user_id,provider_identity_id,revision,hidden_until)
    VALUES(actor,identity_value,p_next_revision,CASE WHEN p_action='hide' THEN read_time+interval '24 hours' END)
    ON CONFLICT(viewer_user_id,provider_identity_id) DO UPDATE SET revision=EXCLUDED.revision,hidden_until=EXCLUDED.hidden_until;
    changed:=true;
   END IF;
  END IF;
 ELSE
  read_time:=clock_timestamp();state:=provider_controls_private.snapshot(actor,p_target_type,p_target_id,target,read_time);
  IF NOT (state->>'can_block')::boolean THEN RAISE EXCEPTION 'provider_control_unavailable' USING ERRCODE='42501';END IF;
  SELECT * INTO b FROM public.user_blocks WHERE blocker_id=actor AND blocked_id=account_value;
  IF p_action='block' THEN
   IF b.id IS NULL AND p_expected_block_id IS NOT NULL THEN RAISE EXCEPTION 'provider_control_conflict' USING ERRCODE='40001';END IF;
   IF b.id IS NOT NULL AND p_expected_block_id IS NOT NULL
   AND (b.id::text<>p_expected_block_id OR b.created_at IS DISTINCT FROM p_expected_block_created_at) THEN
    RAISE EXCEPTION 'provider_control_conflict' USING ERRCODE='40001';END IF;
   IF b.id IS NULL THEN INSERT INTO public.user_blocks(blocker_id,blocked_id,created_at) VALUES(actor,account_value,read_time);changed:=true;END IF;
  ELSE
   IF b.id IS NULL OR b.id::text<>p_expected_block_id OR b.created_at IS DISTINCT FROM p_expected_block_created_at THEN
    RAISE EXCEPTION 'provider_control_conflict' USING ERRCODE='40001';END IF;
   DELETE FROM public.user_blocks WHERE id=b.id AND blocker_id=actor AND blocked_id=account_value AND created_at=p_expected_block_created_at;
   changed:=FOUND;
  END IF;
 END IF;
 RETURN provider_controls_private.snapshot(actor,p_target_type,p_target_id,target,read_time)||jsonb_build_object('action',p_action,'changed',changed);
END $f$;
REVOKE ALL ON FUNCTION public.set_my_provider_control_v1(uuid,text,text,text,text,uuid,uuid,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.set_my_provider_control_v1(uuid,text,text,text,text,uuid,uuid,text,timestamptz) TO authenticated;

-- COMPONENT 05_search_ordinary_v1.sql
-- Retained filters, wire, ordering and public grants; preference before count/page.
CREATE OR REPLACE FUNCTION public.search_public_listings_v1(
  p_search_query text default '',
  p_category text default null,
  p_subcategory text default null,
  p_detail_category text default null,
  p_condition text default null,
  p_location_query text default '',
  p_result_limit integer default 24,
  p_result_offset integer default 0
)
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public, auth, pg_temp
-- Optional predicates must be planned using this call's actual search inputs.
-- This setting is local to the function; it does not alter the caller/session default.
set plan_cache_mode = force_custom_plan
as $function$
declare
  v_query text := btrim(coalesce(p_search_query, ''));
  v_location text := btrim(coalesce(p_location_query, ''));
  v_category text := nullif(btrim(p_category), '');
  v_subcategory text := nullif(btrim(p_subcategory), '');
  v_detail text := nullif(btrim(p_detail_category), '');
  v_condition text := nullif(btrim(p_condition), '');
  v_actor uuid := auth.uid();
  v_tsquery tsquery;
  v_result jsonb;
begin
  if char_length(v_query) > 160 or char_length(v_location) > 160 then
    raise exception 'listing_search_text_too_long' using errcode = '22023';
  end if;
  if p_result_limit is null or p_result_limit < 1 or p_result_limit > 60
    or p_result_offset is null or p_result_offset < 0 or p_result_offset > 100000 then
    raise exception 'listing_search_pagination_invalid' using errcode = '22023';
  end if;
  if (v_category is not null and (char_length(v_category) > 120 or v_category !~ '^[a-z][a-z0-9_]*$'))
    or (v_subcategory is not null and (char_length(v_subcategory) > 160 or v_subcategory !~ '^[a-z][a-z0-9_]*$'))
    or (v_detail is not null and (char_length(v_detail) > 160 or v_detail !~ '^[a-z][a-z0-9_]*$'))
    or (v_subcategory is not null and v_category is null)
    or (v_detail is not null and v_subcategory is null) then
    raise exception 'listing_search_category_path_invalid' using errcode = '22023';
  end if;
  if v_condition is not null and v_condition not in ('new', 'used', 'damaged') then
    raise exception 'listing_search_condition_invalid' using errcode = '22023';
  end if;
  -- Plain words are ANDed. No user-controlled SQL, FTS syntax or implicit AI query.
  -- The old search_vector contains raw location and arbitrary details: do not use it.
  v_tsquery := plainto_tsquery('pg_catalog.simple'::regconfig, v_query);
  with viewer_hidden AS MATERIALIZED (SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=v_actor AND hidden_until>statement_timestamp()), matched as materialized (
    select l.id, l.created_at, l.title, left(l.description, 280) as description_preview,
      l.price, l.price_amount, l.category, l.subcategory, l.condition, l.country, l.city,
      case when jsonb_typeof(l.details -> 'detailCategory') = 'string'
        then l.details ->> 'detailCategory' else null end as detail_category,
      l.image as fallback_image, ip.display_name as seller_name, ip.slug as seller_slug,
      ip.avatar_url as seller_avatar_url, i.type as seller_type
    from public.listings l
    join public.identities i on i.id = l.identity_id and i.status = 'active'
    join public.identity_profiles ip on ip.identity_id = i.id
    where NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=l.identity_id) and l.status = 'active'
      and (l.active_until is null or l.active_until > now())
      and (v_query = '' or
        public.public_listing_search_document_v1(l.title, l.description, l.category, l.subcategory, l.details) @@ v_tsquery)
      and (v_category is null or l.category = v_category)
      and (v_subcategory is null or l.subcategory = v_subcategory)
      and (v_detail is null or (jsonb_typeof(l.details -> 'detailCategory') = 'string'
        and l.details ->> 'detailCategory' = v_detail))
      and (v_condition is null or l.condition = v_condition)
      and (v_location = '' or strpos(lower(coalesce(l.city, '') || ' ' || coalesce(l.country, '')), lower(v_location)) > 0)
      -- Preserve the existing account-block meaning, now before count/pagination.
      -- This is not a new business/identity-level block policy.
      and not exists (
        select 1 from public.user_blocks b
        where v_actor is not null and (
          (b.blocker_id = v_actor and b.blocked_id = l.user_id)
          or (b.blocked_id = v_actor and b.blocker_id = l.user_id)
        )
      )
  ), page as (
    select m.* from matched m
    order by m.created_at desc, m.id desc
    limit p_result_limit offset p_result_offset
  ), cards as (
    select p.id, p.created_at, jsonb_build_object(
      'content_type', 'listing', 'content_id', p.id::text,
      'title', p.title, 'description_preview', p.description_preview,
      'price', p.price,
      'price_amount', case when p.price_amount >= 0 and p.price_amount::text not in ('NaN','Infinity','-Infinity')
        then p.price_amount::text else null end,
      -- Legacy listings have no canonical currency column. Never invent EUR.
      'currency', null,
      'category', p.category, 'subcategory', p.subcategory,
      'detail_category', p.detail_category, 'condition', p.condition,
      'country', p.country, 'city', p.city,
      'image_url', coalesce(img.thumb_url, img.medium_url, img.original_url, p.fallback_image),
      'seller_name', p.seller_name, 'seller_slug', p.seller_slug,
      'seller_avatar_url', p.seller_avatar_url, 'seller_type', p.seller_type,
      'created_at', p.created_at
    ) as card
    from page p
    left join lateral (
      select li.thumb_url, li.medium_url, li.original_url from public.listing_images li
      where li.listing_id = p.id
      order by li.is_primary desc nulls last, li.sort_order asc nulls last,
        li.created_at asc nulls last, li.id asc
      limit 1
    ) img on true
  ), totals as (select count(*) as n from matched)
  select jsonb_build_object(
    'schema_version', 1, 'content_scope', 'ordinary_listings', 'sort', 'newest',
    'items', coalesce((select jsonb_agg(c.card order by c.created_at desc, c.id desc) from cards c), '[]'::jsonb),
    'total_count', t.n::text, 'result_limit', p_result_limit, 'result_offset', p_result_offset,
    'has_more', t.n > p_result_offset::bigint + p_result_limit,
    'next_offset', case when t.n > p_result_offset::bigint + p_result_limit
      and p_result_offset + p_result_limit <= 100000 then p_result_offset + p_result_limit else null end,
    'window_limit_reached', t.n > p_result_offset::bigint + p_result_limit
      and p_result_offset + p_result_limit > 100000
  ) into v_result from totals t;
  return v_result;
end;
$function$;

-- COMPONENT 06_search_ordinary_v2.sql
-- Retained filters, wire, ordering and public grants; preference before count/page.
CREATE OR REPLACE FUNCTION public.search_public_listings_v2(p_search_query text DEFAULT ''::text, p_category text DEFAULT NULL::text, p_subcategory text DEFAULT NULL::text, p_detail_category text DEFAULT NULL::text, p_condition text DEFAULT NULL::text, p_location_query text DEFAULT ''::text, p_result_limit integer DEFAULT 24, p_result_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
 SET plan_cache_mode TO 'force_custom_plan'
AS $function$
declare
  v_query text := btrim(coalesce(p_search_query, ''));
  v_location text := btrim(coalesce(p_location_query, ''));
  v_category text := nullif(btrim(p_category), '');
  v_subcategory text := nullif(btrim(p_subcategory), '');
  v_detail text := nullif(btrim(p_detail_category), '');
  v_condition text := nullif(btrim(p_condition), '');
  v_actor uuid := public.listing_actor_uid_hosted_v1();
  v_tsquery tsquery;
  v_result jsonb;
begin
  if char_length(v_query) > 160 or char_length(v_location) > 160 then
    raise exception 'listing_search_text_too_long' using errcode = '22023';
  end if;
  if p_result_limit is null or p_result_limit < 1 or p_result_limit > 60
    or p_result_offset is null or p_result_offset < 0 or p_result_offset > 100000 then
    raise exception 'listing_search_pagination_invalid' using errcode = '22023';
  end if;
  if (v_category is not null and (char_length(v_category) > 120 or v_category !~ '^[a-z][a-z0-9_]*$'))
    or (v_subcategory is not null and (char_length(v_subcategory) > 160 or v_subcategory !~ '^[a-z][a-z0-9_]*$'))
    or (v_detail is not null and (char_length(v_detail) > 160 or v_detail !~ '^[a-z][a-z0-9_]*$'))
    or (v_subcategory is not null and v_category is null)
    or (v_detail is not null and v_subcategory is null) then
    raise exception 'listing_search_category_path_invalid' using errcode = '22023';
  end if;
  if v_condition is not null and v_condition not in ('new', 'used', 'damaged') then
    raise exception 'listing_search_condition_invalid' using errcode = '22023';
  end if;
  -- Plain words are ANDed. No user-controlled SQL, FTS syntax or implicit AI query.
  -- The old search_vector contains raw location and arbitrary details: do not use it.
  v_tsquery := plainto_tsquery('pg_catalog.simple'::regconfig, v_query);
  with viewer_hidden AS MATERIALIZED (SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=v_actor AND hidden_until>statement_timestamp()), matched as materialized (
    select l.id, l.created_at, l.title, left(l.description, 280) as description_preview,
      l.price, l.price_amount, l.price_kind, l.currency, l.price_revision, l.category, l.subcategory, l.condition, l.country, l.city,
      case when jsonb_typeof(l.details -> 'detailCategory') = 'string'
        then l.details ->> 'detailCategory' else null end as detail_category,
      l.image as fallback_image, ip.display_name as seller_name, ip.slug as seller_slug,
      ip.avatar_url as seller_avatar_url, i.type as seller_type
    from public.listings l
    join public.identities i on i.id = l.identity_id and i.status = 'active'
    join public.identity_profiles ip on ip.identity_id = i.id
    where NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=l.identity_id) and l.status = 'active'
      and (l.active_until is null or l.active_until > now())
      and (v_query = '' or
        public.public_listing_search_document_v1(l.title, l.description, l.category, l.subcategory, l.details) @@ v_tsquery)
      and (v_category is null or l.category = v_category)
      and (v_subcategory is null or l.subcategory = v_subcategory)
      and (v_detail is null or (jsonb_typeof(l.details -> 'detailCategory') = 'string'
        and l.details ->> 'detailCategory' = v_detail))
      and (v_condition is null or l.condition = v_condition)
      and (v_location = '' or strpos(lower(coalesce(l.city, '') || ' ' || coalesce(l.country, '')), lower(v_location)) > 0)
      -- Preserve the existing account-block meaning, now before count/pagination.
      -- This is not a new business/identity-level block policy.
      and not exists (
        select 1 from public.user_blocks b
        where v_actor is not null and (
          (b.blocker_id = v_actor and b.blocked_id = l.user_id)
          or (b.blocked_id = v_actor and b.blocker_id = l.user_id)
        )
      )
  ), page as (
    select m.* from matched m
    order by m.created_at desc, m.id desc
    limit p_result_limit offset p_result_offset
  ), cards as (
    select p.id, p.created_at, jsonb_build_object(
      'content_type', 'listing', 'content_id', p.id::text,
      'title', p.title, 'description_preview', p.description_preview,
      'price', public.listing_price_read_model_v1(p.price_kind,p.price_amount,
        p.currency,p.price_revision,p.price),
      'category', p.category, 'subcategory', p.subcategory,
      'detail_category', p.detail_category, 'condition', p.condition,
      'country', p.country, 'city', p.city,
      'image_url', coalesce(img.thumb_url, img.medium_url, img.original_url, p.fallback_image),
      'seller_name', p.seller_name, 'seller_slug', p.seller_slug,
      'seller_avatar_url', p.seller_avatar_url, 'seller_type', p.seller_type,
      'created_at', p.created_at
    ) as card
    from page p
    left join lateral (
      select li.thumb_url, li.medium_url, li.original_url from public.listing_images li
      where li.listing_id = p.id
      order by li.is_primary desc nulls last, li.sort_order asc nulls last,
        li.created_at asc nulls last, li.id asc
      limit 1
    ) img on true
  ), totals as (select count(*) as n from matched)
  select jsonb_build_object(
    'schema_version', 2, 'content_scope', 'ordinary_listings', 'sort', 'newest',
    'items', coalesce((select jsonb_agg(c.card order by c.created_at desc, c.id desc) from cards c), '[]'::jsonb),
    'total_count', t.n::text, 'result_limit', p_result_limit, 'result_offset', p_result_offset,
    'has_more', t.n > p_result_offset::bigint + p_result_limit,
    'next_offset', case when t.n > p_result_offset::bigint + p_result_limit
      and p_result_offset + p_result_limit <= 100000 then p_result_offset + p_result_limit else null end,
    'window_limit_reached', t.n > p_result_offset::bigint + p_result_limit
      and p_result_offset + p_result_limit > 100000
  ) into v_result from totals t;
  return v_result;
end;
$function$;

-- COMPONENT 07_search_marketplace.sql
CREATE OR REPLACE FUNCTION public.search_public_marketplace_v1(p_search_query text DEFAULT '',p_category text DEFAULT NULL,
 p_subcategory text DEFAULT NULL,p_detail_category text DEFAULT NULL,p_condition text DEFAULT NULL,
 p_location_query text DEFAULT '',p_result_limit integer DEFAULT 24,p_result_offset integer DEFAULT 0,
 p_identity_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET plan_cache_mode='force_custom_plan' AS $f$
DECLARE q text:=btrim(coalesce(p_search_query,''));loc text:=btrim(coalesce(p_location_query,''));
 cat text:=nullif(btrim(p_category),'');sub text:=nullif(btrim(p_subcategory),'');
 detail text:=nullif(btrim(p_detail_category),'');cond text:=nullif(btrim(p_condition),'');
 actor uuid:=public.listing_actor_uid_hosted_v1();query tsquery;result jsonb;
BEGIN
 IF char_length(q)>160 OR char_length(loc)>160 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 60
  OR p_result_offset IS NULL OR p_result_offset NOT BETWEEN 0 AND 100000 THEN
  RAISE EXCEPTION 'marketplace_search_input' USING ERRCODE='22023'; END IF;
 IF (cat IS NOT NULL AND (length(cat)>120 OR cat!~'^[a-z][a-z0-9_]*$'))
  OR (sub IS NOT NULL AND (length(sub)>160 OR sub!~'^[a-z][a-z0-9_]*$' OR cat IS NULL))
  OR (detail IS NOT NULL AND (length(detail)>160 OR detail!~'^[a-z][a-z0-9_]*$' OR sub IS NULL))
  OR (cond IS NOT NULL AND cond NOT IN('new','used','damaged'))
  OR (cat='horses' AND (detail IS NOT NULL OR (sub IS NOT NULL AND sub NOT IN('sale','free_transfer','lease','co_rider','wanted')))) THEN
  RAISE EXCEPTION 'marketplace_search_filters' USING ERRCODE='22023'; END IF;
 query:=plainto_tsquery('pg_catalog.simple'::regconfig,q);
 WITH viewer_hidden AS MATERIALIZED (SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=actor AND hidden_until>statement_timestamp()), ordinary AS MATERIALIZED(
  SELECT 'listing'::text content_type,l.id::text content_id,l.id numeric_id,NULL::uuid horse_id,l.created_at,
   jsonb_build_object('content_type','listing','content_id',l.id::text,'offer_type',NULL,
    'title',l.title,'description_preview',left(l.description,280),
    'price',public.listing_price_read_model_v1(l.price_kind,l.price_amount,l.currency,l.price_revision,l.price),
    'category',l.category,'subcategory',l.subcategory,
    'detail_category',CASE WHEN jsonb_typeof(l.details->'detailCategory')='string' THEN l.details->>'detailCategory' END,
    'condition',l.condition,'country',l.country,'city',l.city,
    'image_url',coalesce(img.thumb_url,img.medium_url,img.original_url,l.image),
    'seller_name',ip.display_name,'seller_slug',ip.slug,'seller_avatar_url',ip.avatar_url,'seller_type',i.type,'created_at',l.created_at) card
  FROM public.listings l JOIN public.identities i ON i.id=l.identity_id AND i.status='active'
  JOIN public.identity_profiles ip ON ip.identity_id=i.id
  LEFT JOIN LATERAL(SELECT li.thumb_url,li.medium_url,li.original_url FROM public.listing_images li WHERE li.listing_id=l.id
   ORDER BY li.is_primary DESC NULLS LAST,li.sort_order ASC NULLS LAST,li.created_at ASC NULLS LAST,li.id LIMIT 1) img ON true
  WHERE NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=l.identity_id) AND l.status='active' AND (l.active_until IS NULL OR l.active_until>now())
   AND (p_identity_id IS NULL OR l.identity_id=p_identity_id)
   AND (q='' OR public.public_listing_search_document_v1(l.title,l.description,l.category,l.subcategory,l.details)@@query)
   AND (cat IS NULL OR l.category=cat) AND (sub IS NULL OR l.subcategory=sub)
   AND (detail IS NULL OR (jsonb_typeof(l.details->'detailCategory')='string' AND l.details->>'detailCategory'=detail))
   AND (cond IS NULL OR l.condition=cond)
   AND (loc='' OR strpos(lower(coalesce(l.city,'')||' '||coalesce(l.country,'')),lower(loc))>0)
   AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL AND
    ((b.blocker_id=actor AND b.blocked_id=l.user_id) OR (b.blocked_id=actor AND b.blocker_id=l.user_id)))
 ), horses AS MATERIALIZED(
  SELECT 'horse_offer'::text content_type,h.id::text content_id,NULL::bigint numeric_id,h.id horse_id,h.created_at,
   jsonb_build_object('content_type','horse_offer','content_id',h.id,'offer_type',h.offer_type,
    'title',h.title,'description_preview',left(h.description,280),'price',horse_publication_private.public_price(h),
    'category','horses','subcategory',h.offer_type,'detail_category',NULL,'condition',NULL,'country','EE',
    'city',CASE WHEN h.offer_type='wanted' THEN h.details#>>'{wanted,search_area,city_or_municipality}' ELSE h.city END,
    'image_url',img.original_url,'seller_name',ip.display_name,'seller_slug',ip.slug,
    'seller_avatar_url',ip.avatar_url,'seller_type',i.type,'created_at',h.created_at) card
  FROM public.horse_offers h JOIN public.identities i ON i.id=h.identity_id AND i.status='active'
  JOIN public.identity_profiles ip ON ip.identity_id=i.id
  LEFT JOIN LATERAL(SELECT im.original_url FROM public.horse_offer_images im WHERE im.horse_offer_id=h.id
   ORDER BY im.is_primary DESC,im.sort_order,im.created_at,im.id LIMIT 1) img ON true
  WHERE NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=h.identity_id) AND horse_publication_private.is_public(h.id) AND (p_identity_id IS NULL OR h.identity_id=p_identity_id)
   AND (cat IS NULL OR cat='horses') AND (sub IS NULL OR h.offer_type=sub) AND detail IS NULL AND cond IS NULL
   AND (q='' OR to_tsvector('pg_catalog.simple'::regconfig,coalesce(h.title,'')||' '||coalesce(h.description,'')||' '||
    coalesce(h.breed,'')||' '||coalesce(h.discipline,'')||' '||coalesce(h.details#>>'{wanted,preferred_breed}',''))@@query)
   AND (loc='' OR strpos(lower(CASE WHEN h.offer_type='wanted' THEN coalesce(h.details#>>'{wanted,search_area,city_or_municipality}','')
     ELSE coalesce(h.city,'') END||' EE'),lower(loc))>0)
   AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL AND
    ((b.blocker_id=actor AND b.blocked_id=h.created_by_user_id) OR (b.blocked_id=actor AND b.blocker_id=h.created_by_user_id)))
 ), matched AS MATERIALIZED(SELECT * FROM ordinary UNION ALL SELECT * FROM horses),
 page AS(SELECT * FROM matched ORDER BY created_at DESC,content_type,numeric_id DESC,horse_id DESC LIMIT p_result_limit OFFSET p_result_offset),
 totals AS(SELECT count(*) n FROM matched)
 SELECT jsonb_build_object('schema_version',1,'content_scope','marketplace','sort','newest',
  'items',coalesce((SELECT jsonb_agg(card ORDER BY created_at DESC,content_type,numeric_id DESC,horse_id DESC) FROM page),'[]'::jsonb),
  'total_count',n::text,'result_limit',p_result_limit,'result_offset',p_result_offset,
  'has_more',n>p_result_offset::bigint+p_result_limit,
  'next_offset',CASE WHEN n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit<=100000 THEN p_result_offset+p_result_limit END,
  'window_limit_reached',n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit>100000)
 INTO result FROM totals;
 RETURN result;
END $f$;

-- COMPONENT 08_search_services.sql
CREATE OR REPLACE FUNCTION public.search_public_services_v1(p_query text DEFAULT '',p_category text DEFAULT NULL,p_subcategory text DEFAULT NULL,
 p_country text DEFAULT NULL,p_city text DEFAULT NULL,p_result_limit integer DEFAULT 24,p_result_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE items jsonb;total bigint;query text:=lower(btrim(coalesce(p_query,'')));
BEGIN
 IF length(query)>300 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 100 OR p_result_offset IS NULL
 OR p_result_offset<0 OR p_result_offset>1000000 OR length(p_category)>120 OR length(p_subcategory)>160
 OR length(p_country)>120 OR length(p_city)>160 THEN RAISE EXCEPTION 'service_search_invalid' USING ERRCODE='22023';END IF;
 WITH viewer_hidden AS MATERIALIZED (SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=public.listing_actor_uid_hosted_v1() AND hidden_until>statement_timestamp()), candidates AS MATERIALIZED(SELECT s.* FROM public.services s WHERE NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=s.identity_id) AND service_publication_private.is_public(s.id) AND service_publication_private.visible_to_viewer(s.id)
 AND (nullif(btrim(p_category),'') IS NULL OR s.category=btrim(p_category))
 AND (nullif(btrim(p_subcategory),'') IS NULL OR s.subcategory=btrim(p_subcategory))
 AND (nullif(btrim(p_country),'') IS NULL OR lower(s.country)=lower(btrim(p_country)))
 AND (nullif(btrim(p_city),'') IS NULL OR lower(s.city)=lower(btrim(p_city)))
 AND (query='' OR NOT EXISTS(SELECT 1 FROM regexp_split_to_table(query,'\s+') token
 WHERE token<>'' AND position(token IN lower(concat_ws(' ',s.title,s.description,s.category,s.subcategory,s.country,s.city,s.location)))=0))),
 page AS(SELECT * FROM candidates ORDER BY published_at DESC,created_at DESC,id LIMIT p_result_limit OFFSET p_result_offset)
 SELECT (SELECT count(*) FROM candidates),coalesce((SELECT jsonb_agg(service_publication_private.public_fields(p)
 ORDER BY p.published_at DESC,p.created_at DESC,p.id) FROM page p),'[]'::jsonb) INTO total,items;
 RETURN jsonb_build_object('schema_version',1,'items',items,'total_count',total::text,'result_limit',p_result_limit,
 'result_offset',p_result_offset,'has_more',p_result_offset+jsonb_array_length(items)<total,
 'next_offset',CASE WHEN p_result_offset+jsonb_array_length(items)<total THEN p_result_offset+jsonb_array_length(items) ELSE NULL END);
END $f$;

-- COMPONENT 09_public_profile.sql
-- Select the same canonical/legacy slug candidate first. A blocked selected
-- profile must not fall through to another account's coinciding legacy alias.
-- Temporary discovery hiding never affects direct profile access.
CREATE OR REPLACE FUNCTION public.get_store_by_slug(store_slug_input text)
RETURNS TABLE(identity_profile_id uuid,identity_id uuid,identity_type text,business_account_id uuid,
 display_name text,slug text,bio text,avatar_url text,banner_url text,banner_dominant_color text,
 contact_phone text,contact_email text,website_url text,address_text text,city text,country text,
 lat double precision,lng double precision,location_visibility text,legacy_user_id uuid,is_premium boolean)
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp AS $f$
 WITH selected AS MATERIALIZED(
  SELECT ip.id identity_profile_id,i.id identity_id,i.type identity_type,i.business_account_id,
   ip.display_name,ip.slug,coalesce(ip.bio,p.bio) bio,coalesce(ip.avatar_url,p.avatar_url) avatar_url,
   coalesce(ip.banner_url,p.banner_url) banner_url,coalesce(ip.banner_dominant_color,p.banner_dominant_color) banner_dominant_color,
   ip.contact_phone,ip.contact_email,ip.website_url,ip.address_text,ip.city,ip.country,
   ip.lat,ip.lng,ip.location_visibility,i.user_id legacy_user_id,coalesce(p.is_premium,false) is_premium,
   CASE WHEN i.type='private' THEN i.user_id ELSE business.owner_user_id END block_account_id
  FROM public.identity_profiles ip JOIN public.identities i ON i.id=ip.identity_id
  LEFT JOIN public.profiles p ON p.id=i.user_id
  LEFT JOIN public.business_accounts business ON business.id=i.business_account_id
  WHERE ip.slug=store_slug_input OR p.store_slug=store_slug_input
  ORDER BY CASE WHEN ip.slug=store_slug_input THEN 0 ELSE 1 END LIMIT 1
 )
 SELECT s.identity_profile_id,s.identity_id,s.identity_type,s.business_account_id,s.display_name,s.slug,s.bio,
 s.avatar_url,s.banner_url,s.banner_dominant_color,s.contact_phone,s.contact_email,s.website_url,s.address_text,
 s.city,s.country,s.lat,s.lng,s.location_visibility,s.legacy_user_id,s.is_premium FROM selected s
 WHERE NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE auth.uid() IS NOT NULL
 AND ((b.blocker_id=auth.uid() AND b.blocked_id=s.block_account_id)
 OR (b.blocked_id=auth.uid() AND b.blocker_id=s.block_account_id)));
$f$;

-- COMPONENT 10_legacy_search.sql
-- Existing legacy wires and sorting; filters now run before page selection.
CREATE OR REPLACE FUNCTION "public"."get_marketplace_listings"("result_limit" integer DEFAULT 30, "result_offset" integer DEFAULT 0) RETURNS TABLE("listing_id" bigint, "user_id" "uuid", "identity_id" "uuid", "seller_name" "text", "seller_slug" "text", "seller_type" "text", "is_premium" boolean, "title" "text", "description" "text", "price" "text", "price_amount" numeric, "image" "text", "category" "text", "subcategory" "text", "condition" "text", "country" "text", "city" "text", "location" "text", "listing_lat" double precision, "listing_lng" double precision, "search_text" "text", "details" "jsonb", "active_until" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH viewer_hidden AS MATERIALIZED (SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=auth.uid() AND hidden_until>statement_timestamp())
  select
    l.id,
    l.user_id,
    l.identity_id,

    ip.display_name,
    ip.slug,
    i.type,
    coalesce(p.is_premium, false),

    l.title,
    l.description,
    l.price,
    l.price_amount,
    coalesce(li.thumb_url, li.medium_url, li.original_url, l.image),

    l.category,
    l.subcategory,
    l.condition,

    l.country,
    l.city,
    l.location,
    l.listing_lat,
    l.listing_lng,

    l.search_text,
    l.details,

    l.active_until,
    l.created_at

  from listings l
  join identities i
    on i.id = l.identity_id
  join identity_profiles ip
    on ip.identity_id = i.id
  left join profiles p
    on p.id = i.user_id
  left join lateral (
    select thumb_url, medium_url, original_url
    from listing_images
    where listing_id = l.id
    order by is_primary desc, sort_order asc, created_at asc
    limit 1
  ) li on true
  where NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=l.identity_id)
    AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE auth.uid() IS NOT NULL
     AND ((b.blocker_id=auth.uid() AND b.blocked_id=l.user_id) OR (b.blocked_id=auth.uid() AND b.blocker_id=l.user_id)))
    AND l.status = 'active'
    and (
      l.active_until is null
      or l.active_until > now()
    )
  order by l.created_at desc
  limit result_limit
  offset result_offset;
$$;

CREATE OR REPLACE FUNCTION "public"."get_marketplace_listings_nearby"("center_lat" double precision DEFAULT NULL::double precision, "center_lng" double precision DEFAULT NULL::double precision, "result_limit" integer DEFAULT 30, "result_offset" integer DEFAULT 0) RETURNS TABLE("listing_id" bigint, "user_id" "uuid", "identity_id" "uuid", "seller_name" "text", "seller_slug" "text", "seller_type" "text", "is_premium" boolean, "title" "text", "description" "text", "price" "text", "price_amount" numeric, "image" "text", "category" "text", "subcategory" "text", "condition" "text", "country" "text", "city" "text", "location" "text", "listing_lat" double precision, "listing_lng" double precision, "search_text" "text", "details" "jsonb", "distance_km" double precision, "active_until" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH viewer_hidden AS MATERIALIZED (SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=auth.uid() AND hidden_until>statement_timestamp())
  select
    l.id,
    l.user_id,
    l.identity_id,
    ip.display_name,
    ip.slug,
    i.type,
    coalesce(p.is_premium, false),
    l.title,
    l.description,
    l.price,
    l.price_amount,
    coalesce(li.thumb_url, li.medium_url, li.original_url, l.image),
    l.category,
    l.subcategory,
    l.condition,
    l.country,
    l.city,
    l.location,
    l.listing_lat,
    l.listing_lng,
    l.search_text,
    l.details,
    case
      when center_lat is not null
       and center_lng is not null
       and l.listing_lat is not null
       and l.listing_lng is not null
      then 6371 * 2 * asin(
        sqrt(
          power(sin(radians(l.listing_lat - center_lat) / 2), 2) +
          cos(radians(center_lat)) *
          cos(radians(l.listing_lat)) *
          power(sin(radians(l.listing_lng - center_lng) / 2), 2)
        )
      )
      else null
    end as distance_km,
    l.active_until,
    l.created_at
  from listings l
  join identities i on i.id = l.identity_id
  join identity_profiles ip on ip.identity_id = i.id
  left join profiles p on p.id = l.user_id
  left join lateral (
    select thumb_url, medium_url, original_url
    from listing_images
    where listing_id = l.id
    order by is_primary desc, sort_order asc, created_at asc
    limit 1
  ) li on true
  where NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=l.identity_id)
    AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE auth.uid() IS NOT NULL
     AND ((b.blocker_id=auth.uid() AND b.blocked_id=l.user_id) OR (b.blocked_id=auth.uid() AND b.blocker_id=l.user_id)))
    AND l.status = 'active'
    and (l.active_until is null or l.active_until > now())
  order by
    case when center_lat is not null and center_lng is not null then
      case
        when l.listing_lat is null or l.listing_lng is null then 1
        else 0
      end
    else 0 end,
    distance_km asc nulls last,
    l.created_at desc
  limit result_limit
  offset result_offset;
$$;

-- COMPONENT 11_legacy_feed.sql
-- A narrow own-preference projection for an invoker view. The unauthenticated
-- viewer gets no identities. It grants no direct access to the private table.
CREATE FUNCTION public.hidden_provider_ids_for_viewer_v1() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT h.provider_identity_id FROM provider_controls_private.hidden_providers h
 WHERE h.viewer_user_id=auth.uid() AND h.hidden_until>statement_timestamp();
$f$;
REVOKE ALL ON FUNCTION public.hidden_provider_ids_for_viewer_v1() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.hidden_provider_ids_for_viewer_v1() TO anon,authenticated;

-- Top-level l.* retains the underlying FK column lineage for PostgREST embeds.
-- RLS and table grants are those of the real invoker, never the view owner.
CREATE VIEW public.discovery_listings_v1 WITH(security_invoker=true,security_barrier=true) AS
 WITH viewer_hidden AS MATERIALIZED(SELECT public.hidden_provider_ids_for_viewer_v1() identity_id)
 SELECT l.* FROM public.listings l
 WHERE NOT EXISTS(SELECT 1 FROM viewer_hidden h WHERE h.identity_id=l.identity_id)
 AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE auth.uid() IS NOT NULL
  AND ((b.blocker_id=auth.uid() AND b.blocked_id=l.user_id) OR (b.blocked_id=auth.uid() AND b.blocker_id=l.user_id)));
REVOKE ALL ON public.discovery_listings_v1 FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.discovery_listings_v1 TO anon,authenticated;

-- Explicit to-many relationships avoid relying on CTE view FK inference.
-- SECURITY INVOKER preserves each related table's real RLS and SELECT grants.
CREATE FUNCTION public.listing_images(p_listing public.discovery_listings_v1) RETURNS SETOF public.listing_images
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT image.* FROM public.listing_images image WHERE image.listing_id=(p_listing).id;
$f$;
CREATE FUNCTION public.listing_translations(p_listing public.discovery_listings_v1) RETURNS SETOF public.listing_translations
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT translation.* FROM public.listing_translations translation WHERE translation.listing_id=(p_listing).id;
$f$;
REVOKE ALL ON FUNCTION public.listing_images(public.discovery_listings_v1),public.listing_translations(public.discovery_listings_v1)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.listing_images(public.discovery_listings_v1),public.listing_translations(public.discovery_listings_v1)
 TO anon,authenticated;

-- COMPONENT 12_block_lookup_index.sql
-- The existing unique (blocker_id,blocked_id) index retains pair uniqueness.
-- Incoming viewer sets also need blocked_id as the leading lookup key.
-- Bounded transactional CREATE INDEX; no content or preference row writes.
CREATE INDEX user_blocks_blocked_blocker_idx_v1 ON public.user_blocks USING btree(blocked_id,blocker_id);
$controls$;END IF;
 EXCEPTION WHEN no_data_found OR too_many_rows THEN
 RAISE EXCEPTION 'PROVIDER_CONTROLS_PRECONDITIONS_NOT_MATCHED' USING ERRCODE='55000';END $apply$;
 CREATE TEMP TABLE provider_controls_after ON COMMIT DROP AS WITH retained AS MATERIALIZED (WITH retained AS MATERIALIZED (WITH function_facts AS (SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname<>ALL(ARRAY['public.get_my_service_activity_v1','public.get_my_service_publication_snapshot_v2','public.get_my_service_publications_v2','public.renew_my_service_activity_v1','service_publication_private.activity_fields','service_publication_private.is_public','service_publication_private.start_activity']::text[]) AND (n.nspname IN('listing_publication_private','listing_contact_private','messaging_private_v2','horse_publication_private','service_publication_private')
  OR n.nspname||'.'||p.proname=ANY(ARRAY['horse_publication_private.accept_shown_policies','horse_publication_private.assert_actor','horse_publication_private.attempt_publication_matches','horse_publication_private.capture_message_card','horse_publication_private.cleanup_object_eligible','horse_publication_private.close_published_attempt','horse_publication_private.confirmations','horse_publication_private.contact_snapshot','horse_publication_private.current_policies','horse_publication_private.effective_active_until','horse_publication_private.guard_image_request_key','horse_publication_private.has_current_publication','horse_publication_private.is_public','horse_publication_private.lifecycle_snapshot','horse_publication_private.lock_cleanup_context','horse_publication_private.lock_lifecycle','horse_publication_private.media_binding','horse_publication_private.normalize_content','horse_publication_private.normalize_gallery','horse_publication_private.protect_command','horse_publication_private.public_fields','horse_publication_private.public_price','horse_publication_private.require_policies','horse_publication_private.require_ready_image','horse_publication_private.retired_web_deleted','horse_publication_private.reusable_confirmation','horse_publication_private.snapshot','listing_contact_private.guard_conversation','listing_contact_private.guard_message','listing_contact_private.guard_participant','listing_contact_private.peer_name_hosted_v1','listing_contact_private.peer_ready','listing_contact_private.positive_id','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_key','listing_contact_private.require_member','listing_contact_private.require_peer','listing_contact_private.require_unblocked','listing_publication_private.account_source_cleanup_eligible_v1','listing_publication_private.allocate_managed_publication_attempt_v1','listing_publication_private.apply_delete','listing_publication_private.apply_final','listing_publication_private.assert_final_last_boundary','listing_publication_private.assert_hosted_install_context','listing_publication_private.assert_hosted_preview_actor','listing_publication_private.assert_hosted_preview_object','listing_publication_private.assert_ordinary_publication_v1','listing_publication_private.close_locked_attempt','listing_publication_private.expire_one_v1','listing_publication_private.final_material','listing_publication_private.final_receipt','listing_publication_private.guard_cleanup_web_fence','listing_publication_private.guard_closed_journey_request','listing_publication_private.guard_legacy_source_in_multipart','listing_publication_private.guard_managed_image','listing_publication_private.guard_managed_listing','listing_publication_private.guard_source_grant_after_no_release','listing_publication_private.hosted_completed_source_deleted_v1','listing_publication_private.hosted_retired_web_deleted_v1','listing_publication_private.hosted_s3_query_value_v1','listing_publication_private.hosted_storage_contract_ready','listing_publication_private.legacy_cleanup_state_before_multipart_v2','listing_publication_private.lock_account_upload_actor_v1','listing_publication_private.lock_account_upload_identity_v1','listing_publication_private.lock_managed_image_addition_parent_v1','listing_publication_private.lock_managed_listing_images_v1','listing_publication_private.lock_multipart_cleanup_context','listing_publication_private.lock_multipart_context','listing_publication_private.lock_multipart_object','listing_publication_private.lock_retired_web_cleanup_context_v1','listing_publication_private.lock_source_release_grant','listing_publication_private.lock_upload_service_actor','listing_publication_private.lock_web_context','listing_publication_private.managed_image_addition_journey_v1','listing_publication_private.managed_image_addition_receipt_v1','listing_publication_private.managed_image_addition_status_v1','listing_publication_private.managed_image_cleanup_task_v2','listing_publication_private.managed_image_family_v1','listing_publication_private.managed_image_gallery_projection_v1','listing_publication_private.managed_image_origins_v1','listing_publication_private.managed_image_root_v1','listing_publication_private.multipart_binding','listing_publication_private.no_truncate','listing_publication_private.normalize_images','listing_publication_private.normalize_managed_image_addition_v1','listing_publication_private.object_cleanup_state','listing_publication_private.pending_upload_reserved_bytes_v1','listing_publication_private.protect_cleanup','listing_publication_private.protect_managed_image_addition_v1','listing_publication_private.protect_managed_image_presentation_v1','listing_publication_private.protect_multipart_abort','listing_publication_private.protect_multipart_attempt','listing_publication_private.protect_multipart_auxiliary','listing_publication_private.protect_multipart_session','listing_publication_private.protect_object','listing_publication_private.protect_publication','listing_publication_private.protect_slot','listing_publication_private.protect_source_no_release','listing_publication_private.protect_source_recorded_no_release','listing_publication_private.protect_source_release_intent','listing_publication_private.protect_source_release_tracking','listing_publication_private.protect_upload_grant','listing_publication_private.protect_web_completion','listing_publication_private.protect_web_image','listing_publication_private.protect_write_reconcile_job','listing_publication_private.protect_write_settlement','listing_publication_private.require_actor','listing_publication_private.require_managed_image_actor_v1','listing_publication_private.require_managed_image_policies_v1','listing_publication_private.require_policies','listing_publication_private.require_upload_service','listing_publication_private.reserve_upload_dispatch_v1','listing_publication_private.snapshot','listing_publication_private.track_source_grant_birth','listing_publication_private.upload_binding','listing_publication_private.validate_managed_image_intent_v1','listing_publication_private.validate_web_intent','listing_publication_private.web_binding','listing_publication_private.web_receipt','messaging_private_v2.bucket_ready','messaging_private_v2.exact_thread','messaging_private_v2.guard_account_block','messaging_private_v2.identity_card','messaging_private_v2.photo_receipt','messaging_private_v2.protect_attached_photo','messaging_private_v2.require_thread','messaging_private_v2.safe_legacy_path','messaging_private_v2.set_block','public.advance_horse_offer_edit_revision_v1','public.append_my_managed_listing_image_v1','public.apply_horse_offer_draft_patch_v1','public.build_horse_offer_content_snapshot_v1','public.cancel_my_horse_publication_v1','public.cancel_my_listing_publication_journey_v2','public.cancel_my_listing_publication_v1','public.cancel_my_managed_listing_image_addition_v1','public.cancel_my_message_photo_v2','public.claim_horse_publication_cleanup_v1','public.claim_listing_account_source_cleanup_v1','public.claim_listing_cleanup_for_attempt_v2','public.claim_listing_cleanup_v1','public.claim_listing_multipart_complete_v2','public.claim_listing_multipart_part_v2','public.claim_listing_published_source_cleanup_v1','public.claim_listing_retired_web_cleanup_v1','public.claim_listing_web_image_v1','public.claim_message_photo_cleanup_v2','public.claim_message_photo_upload_v2','public.contact_my_horse_seller_v1','public.contact_my_listing_seller_v1','public.current_user_has_identity_access','public.delete_my_published_listing_v1','public.finish_message_photo_cleanup_v2','public.finish_message_photo_upload_v2','public.get_listing_multipart_v2','public.get_my_horse_media_binding_v1','public.get_my_horse_offer_edit_snapshot_v1','public.get_my_horse_offer_lifecycle_v1','public.get_my_horse_offer_publication_snapshot_v1','public.get_my_horse_offer_v1','public.get_my_horse_publication_attempt_v1','public.get_my_horse_publication_image_binding_v1','public.get_my_listing_cleanup_summary_v1','public.get_my_listing_conversation_v1','public.get_my_listing_conversation_v2','public.get_my_listing_media_binding_v2','public.get_my_listing_publication_confirmation_v1','public.get_my_listing_publication_journey_v2','public.get_my_listing_publication_v1','public.get_my_listing_retired_web_cleanup_v1','public.get_my_managed_listing_image_addition_v1','public.get_my_managed_listing_images_v1','public.get_my_managed_listing_v2','public.get_my_message_photo_binding_v2','public.get_my_message_thread_v2','public.get_public_horse_media_binding_v1','public.get_public_horse_offer_v1','public.get_public_listing_media_binding_v1','public.get_required_publication_policies_v1','public.get_selqiro_hosted_preview_readiness_v1','public.guard_listing_price_v2','public.hide_my_thread_v2','public.is_valid_service_category_pair_v2','public.list_my_listing_conversations_v1','public.list_my_message_threads_v2','public.listing_actor_uid_hosted_v1','public.listing_basics_search_text_v1','public.listing_contact_is_managed_v1','public.listing_contact_visible_v1','public.listing_create_category_path_valid_v1','public.listing_final_guard_state_v1','public.listing_price_currency_scale_v1','public.listing_price_legacy_label_v1','public.listing_price_read_model_v1','public.listing_price_tuple_valid_v1','public.lock_listing_creation_actor_v1','public.mark_my_thread_read_v2','public.normalize_listing_basics_v1','public.normalize_listing_create_location_v1','public.normalize_listing_creation_v1','public.normalize_listing_price_v1','public.prepare_listing_multipart_cleanup_v2','public.prepare_listing_web_write_v1','public.prepare_my_horse_publication_v1','public.prepare_my_listing_publication_v1','public.prepare_my_managed_listing_image_addition_v1','public.prevent_horse_offer_publication_event_update_v1','public.prevent_publication_policy_acceptance_update','public.prevent_publication_policy_document_version_mutation','public.public_listing_search_document_v1','public.publish_my_horse_offer_v1','public.publish_my_listing_v1','public.record_horse_publication_cleanup_v1','public.record_listing_account_source_cleanup_v1','public.record_listing_cleanup_v1','public.record_listing_multipart_abort_v2','public.record_listing_multipart_completed_v2','public.record_listing_multipart_created_v2','public.record_listing_multipart_verified_v2','public.record_listing_published_source_cleanup_v1','public.record_listing_retired_web_cleanup_v1','public.record_listing_web_ready_v1','public.remove_my_managed_listing_image_v1','public.renew_my_horse_offer_activity_v1','public.require_listing_create_keys_v1','public.require_my_active_identity_v2','public.require_my_current_publication_policy_acceptance_v1','public.reserve_listing_multipart_v2','public.reserve_my_message_photo_v2','public.search_public_marketplace_v1','public.send_my_listing_message_v1','public.send_my_message_v2','public.set_listing_primary_image_v2','public.set_my_horse_offer_status_v1','public.set_my_managed_listing_primary_image_v1','public.set_my_thread_block_v2','public.set_publication_policy_acceptance_snapshot','public.set_v2_profile_content_updated_at','public.update_horse_offer_search_vector_v1','public.update_my_horse_offer_draft_v1','public.validate_horse_offer_current_publication_event_v1','public.validate_horse_offer_image_identity_v1','public.validate_horse_offer_publication_event_v1','public.validate_service_image_identity_v2','listing_publication_private.assert_non_horse_attempt_v1','listing_publication_private.lock_account_source_cleanup_context_v1','listing_publication_private.multipart_object_fully_deleted','listing_publication_private.protect_attempt','listing_publication_private.require_attempt_policies_v1','listing_publication_private.upload_object_is_published_web_v1','public.add_my_service_image_v2','public.can_manage_service_storage_v2','public.cancel_my_service_publication_v1','public.claim_service_publication_cleanup_v1','public.contact_my_service_provider_v1','public.delete_my_service_image_v2','public.get_my_marketplace_message_thread_v1','public.get_my_service_media_binding_v1','public.get_my_service_publication_attempt_v1','public.get_my_service_publication_image_binding_v1','public.get_my_service_publication_snapshot_v1','public.get_my_service_publications_v1','public.get_public_profile_services_v1','public.get_public_service_media_binding_v1','public.get_public_service_v1','public.prepare_my_service_publication_v1','public.publish_my_service_v1','public.record_service_publication_cleanup_v1','public.save_my_service_v2','public.search_public_services_v1','public.set_my_service_activity_v1','public.set_my_service_primary_image_v2','public.set_my_service_status_v2','public.validate_service_category_pair_v2','service_publication_private.accept_shown_policies','service_publication_private.advance_revision','service_publication_private.assert_actor','service_publication_private.attempt_publication_matches','service_publication_private.capture_message_card','service_publication_private.cleanup_object_eligible','service_publication_private.close_published_attempt','service_publication_private.contact_snapshot','service_publication_private.content','service_publication_private.content_snapshot','service_publication_private.current_policies','service_publication_private.guard_gallery','service_publication_private.guard_image_request_key','service_publication_private.has_current_publication','service_publication_private.image_projection','service_publication_private.is_public','service_publication_private.lock_cleanup_context','service_publication_private.media_binding','service_publication_private.normalize_content','service_publication_private.normalize_gallery','service_publication_private.protect_receipt','service_publication_private.public_fields','service_publication_private.require_policies','service_publication_private.require_ready_image','service_publication_private.retired_web_deleted','service_publication_private.select_current_context','service_publication_private.snapshot','service_publication_private.visible_to_viewer']::text[])) AND n.nspname||'.'||p.proname<>ALL(ARRAY['public.get_marketplace_listings','public.get_marketplace_listings_nearby','public.get_store_by_slug','public.search_public_listings_v1','public.search_public_listings_v2','public.search_public_marketplace_v1','public.search_public_services_v1']::text[])
 UNION ALL SELECT x.name,x.signature,x.facts,x.acl
 FROM jsonb_to_recordset('[{"name":"public.search_public_marketplace_v1","signature":"public.search_public_marketplace_v1(text, text, text, text, text, text, integer, integer, uuid)","facts":{"kind":"f","owner":"postgres","language":"plpgsql","parallel":"u","leakproof":false,"definition":"CREATE OR REPLACE FUNCTION public.search_public_marketplace_v1(p_search_query text DEFAULT ''''::text, p_category text DEFAULT NULL::text, p_subcategory text DEFAULT NULL::text, p_detail_category text DEFAULT NULL::text, p_condition text DEFAULT NULL::text, p_location_query text DEFAULT ''''::text, p_result_limit integer DEFAULT 24, p_result_offset integer DEFAULT 0, p_identity_id uuid DEFAULT NULL::uuid)\n RETURNS jsonb\n LANGUAGE plpgsql\n STABLE SECURITY DEFINER\n SET search_path TO ''pg_catalog'', ''public'', ''auth'', ''pg_temp''\n SET plan_cache_mode TO ''force_custom_plan''\nAS $function$\nDECLARE q text:=btrim(coalesce(p_search_query,''''));loc text:=btrim(coalesce(p_location_query,''''));\n cat text:=nullif(btrim(p_category),'''');sub text:=nullif(btrim(p_subcategory),'''');\n detail text:=nullif(btrim(p_detail_category),'''');cond text:=nullif(btrim(p_condition),'''');\n actor uuid:=public.listing_actor_uid_hosted_v1();query tsquery;result jsonb;\nBEGIN\n IF char_length(q)>160 OR char_length(loc)>160 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 60\n  OR p_result_offset IS NULL OR p_result_offset NOT BETWEEN 0 AND 100000 THEN\n  RAISE EXCEPTION ''marketplace_search_input'' USING ERRCODE=''22023''; END IF;\n IF (cat IS NOT NULL AND (length(cat)>120 OR cat!~''^[a-z][a-z0-9_]*$''))\n  OR (sub IS NOT NULL AND (length(sub)>160 OR sub!~''^[a-z][a-z0-9_]*$'' OR cat IS NULL))\n  OR (detail IS NOT NULL AND (length(detail)>160 OR detail!~''^[a-z][a-z0-9_]*$'' OR sub IS NULL))\n  OR (cond IS NOT NULL AND cond NOT IN(''new'',''used'',''damaged''))\n  OR (cat=''horses'' AND (detail IS NOT NULL OR (sub IS NOT NULL AND sub NOT IN(''sale'',''free_transfer'',''lease'',''co_rider'',''wanted'')))) THEN\n  RAISE EXCEPTION ''marketplace_search_filters'' USING ERRCODE=''22023''; END IF;\n query:=plainto_tsquery(''pg_catalog.simple''::regconfig,q);\n WITH ordinary AS MATERIALIZED(\n  SELECT ''listing''::text content_type,l.id::text content_id,l.id numeric_id,NULL::uuid horse_id,l.created_at,\n   jsonb_build_object(''content_type'',''listing'',''content_id'',l.id::text,''offer_type'',NULL,\n    ''title'',l.title,''description_preview'',left(l.description,280),\n    ''price'',public.listing_price_read_model_v1(l.price_kind,l.price_amount,l.currency,l.price_revision,l.price),\n    ''category'',l.category,''subcategory'',l.subcategory,\n    ''detail_category'',CASE WHEN jsonb_typeof(l.details->''detailCategory'')=''string'' THEN l.details->>''detailCategory'' END,\n    ''condition'',l.condition,''country'',l.country,''city'',l.city,\n    ''image_url'',coalesce(img.thumb_url,img.medium_url,img.original_url,l.image),\n    ''seller_name'',ip.display_name,''seller_slug'',ip.slug,''seller_avatar_url'',ip.avatar_url,''seller_type'',i.type,''created_at'',l.created_at) card\n  FROM public.listings l JOIN public.identities i ON i.id=l.identity_id AND i.status=''active''\n  JOIN public.identity_profiles ip ON ip.identity_id=i.id\n  LEFT JOIN LATERAL(SELECT li.thumb_url,li.medium_url,li.original_url FROM public.listing_images li WHERE li.listing_id=l.id\n   ORDER BY li.is_primary DESC NULLS LAST,li.sort_order ASC NULLS LAST,li.created_at ASC NULLS LAST,li.id LIMIT 1) img ON true\n  WHERE l.status=''active'' AND (l.active_until IS NULL OR l.active_until>now())\n   AND (p_identity_id IS NULL OR l.identity_id=p_identity_id)\n   AND (q='''' OR public.public_listing_search_document_v1(l.title,l.description,l.category,l.subcategory,l.details)@@query)\n   AND (cat IS NULL OR l.category=cat) AND (sub IS NULL OR l.subcategory=sub)\n   AND (detail IS NULL OR (jsonb_typeof(l.details->''detailCategory'')=''string'' AND l.details->>''detailCategory''=detail))\n   AND (cond IS NULL OR l.condition=cond)\n   AND (loc='''' OR strpos(lower(coalesce(l.city,'''')||'' ''||coalesce(l.country,'''')),lower(loc))>0)\n   AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL AND\n    ((b.blocker_id=actor AND b.blocked_id=l.user_id) OR (b.blocked_id=actor AND b.blocker_id=l.user_id)))\n ), horses AS MATERIALIZED(\n  SELECT ''horse_offer''::text content_type,h.id::text content_id,NULL::bigint numeric_id,h.id horse_id,h.created_at,\n   jsonb_build_object(''content_type'',''horse_offer'',''content_id'',h.id,''offer_type'',h.offer_type,\n    ''title'',h.title,''description_preview'',left(h.description,280),''price'',horse_publication_private.public_price(h),\n    ''category'',''horses'',''subcategory'',h.offer_type,''detail_category'',NULL,''condition'',NULL,''country'',''EE'',\n    ''city'',CASE WHEN h.offer_type=''wanted'' THEN h.details#>>''{wanted,search_area,city_or_municipality}'' ELSE h.city END,\n    ''image_url'',img.original_url,''seller_name'',ip.display_name,''seller_slug'',ip.slug,\n    ''seller_avatar_url'',ip.avatar_url,''seller_type'',i.type,''created_at'',h.created_at) card\n  FROM public.horse_offers h JOIN public.identities i ON i.id=h.identity_id AND i.status=''active''\n  JOIN public.identity_profiles ip ON ip.identity_id=i.id\n  LEFT JOIN LATERAL(SELECT im.original_url FROM public.horse_offer_images im WHERE im.horse_offer_id=h.id\n   ORDER BY im.is_primary DESC,im.sort_order,im.created_at,im.id LIMIT 1) img ON true\n  WHERE horse_publication_private.is_public(h.id) AND (p_identity_id IS NULL OR h.identity_id=p_identity_id)\n   AND (cat IS NULL OR cat=''horses'') AND (sub IS NULL OR h.offer_type=sub) AND detail IS NULL AND cond IS NULL\n   AND (q='''' OR to_tsvector(''pg_catalog.simple''::regconfig,coalesce(h.title,'''')||'' ''||coalesce(h.description,'''')||'' ''||\n    coalesce(h.breed,'''')||'' ''||coalesce(h.discipline,'''')||'' ''||coalesce(h.details#>>''{wanted,preferred_breed}'',''''))@@query)\n   AND (loc='''' OR strpos(lower(CASE WHEN h.offer_type=''wanted'' THEN coalesce(h.details#>>''{wanted,search_area,city_or_municipality}'','''')\n     ELSE coalesce(h.city,'''') END||'' EE''),lower(loc))>0)\n   AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL AND\n    ((b.blocker_id=actor AND b.blocked_id=h.created_by_user_id) OR (b.blocked_id=actor AND b.blocker_id=h.created_by_user_id)))\n ), matched AS MATERIALIZED(SELECT * FROM ordinary UNION ALL SELECT * FROM horses),\n page AS(SELECT * FROM matched ORDER BY created_at DESC,content_type,numeric_id DESC,horse_id DESC LIMIT p_result_limit OFFSET p_result_offset),\n totals AS(SELECT count(*) n FROM matched)\n SELECT jsonb_build_object(''schema_version'',1,''content_scope'',''marketplace'',''sort'',''newest'',\n  ''items'',coalesce((SELECT jsonb_agg(card ORDER BY created_at DESC,content_type,numeric_id DESC,horse_id DESC) FROM page),''[]''::jsonb),\n  ''total_count'',n::text,''result_limit'',p_result_limit,''result_offset'',p_result_offset,\n  ''has_more'',n>p_result_offset::bigint+p_result_limit,\n  ''next_offset'',CASE WHEN n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit<=100000 THEN p_result_offset+p_result_limit END,\n  ''window_limit_reached'',n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit>100000)\n INTO result FROM totals;\n RETURN result;\nEND $function$\n"},"acl":[{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}]},{"name":"public.search_public_services_v1","signature":"public.search_public_services_v1(text, text, text, text, text, integer, integer)","facts":{"kind":"f","owner":"postgres","language":"plpgsql","parallel":"u","leakproof":false,"definition":"CREATE OR REPLACE FUNCTION public.search_public_services_v1(p_query text DEFAULT ''''::text, p_category text DEFAULT NULL::text, p_subcategory text DEFAULT NULL::text, p_country text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_result_limit integer DEFAULT 24, p_result_offset integer DEFAULT 0)\n RETURNS jsonb\n LANGUAGE plpgsql\n STABLE SECURITY DEFINER\n SET search_path TO ''pg_catalog'', ''pg_temp''\nAS $function$\nDECLARE items jsonb;total bigint;query text:=lower(btrim(coalesce(p_query,'''')));\nBEGIN\n IF length(query)>300 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 100 OR p_result_offset IS NULL\n OR p_result_offset<0 OR p_result_offset>1000000 OR length(p_category)>120 OR length(p_subcategory)>160\n OR length(p_country)>120 OR length(p_city)>160 THEN RAISE EXCEPTION ''service_search_invalid'' USING ERRCODE=''22023'';END IF;\n WITH candidates AS MATERIALIZED(SELECT s.* FROM public.services s WHERE service_publication_private.is_public(s.id) AND service_publication_private.visible_to_viewer(s.id)\n AND (nullif(btrim(p_category),'''') IS NULL OR s.category=btrim(p_category))\n AND (nullif(btrim(p_subcategory),'''') IS NULL OR s.subcategory=btrim(p_subcategory))\n AND (nullif(btrim(p_country),'''') IS NULL OR lower(s.country)=lower(btrim(p_country)))\n AND (nullif(btrim(p_city),'''') IS NULL OR lower(s.city)=lower(btrim(p_city)))\n AND (query='''' OR NOT EXISTS(SELECT 1 FROM regexp_split_to_table(query,''\\s+'') token\n WHERE token<>'''' AND position(token IN lower(concat_ws('' '',s.title,s.description,s.category,s.subcategory,s.country,s.city,s.location)))=0))),\n page AS(SELECT * FROM candidates ORDER BY published_at DESC,created_at DESC,id LIMIT p_result_limit OFFSET p_result_offset)\n SELECT (SELECT count(*) FROM candidates),coalesce((SELECT jsonb_agg(service_publication_private.public_fields(p)\n ORDER BY p.published_at DESC,p.created_at DESC,p.id) FROM page p),''[]''::jsonb) INTO total,items;\n RETURN jsonb_build_object(''schema_version'',1,''items'',items,''total_count'',total::text,''result_limit'',p_result_limit,\n ''result_offset'',p_result_offset,''has_more'',p_result_offset+jsonb_array_length(items)<total,\n ''next_offset'',CASE WHEN p_result_offset+jsonb_array_length(items)<total THEN p_result_offset+jsonb_array_length(items) ELSE NULL END);\nEND $function$\n"},"acl":[{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}]}]'::jsonb) x(name text,signature text,facts jsonb,acl jsonb)),relation_facts AS (SELECT n.nspname||'.'||c.relname name,
 jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'persistence',c.relpersistence,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
  'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(ad.adbin,ad.adrelid),
  'collation',CASE WHEN a.attcollation=0 THEN NULL ELSE a.attcollation::regcollation::text END) ORDER BY a.attnum),'[]')
  FROM pg_attribute a LEFT JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'definition',pg_get_constraintdef(q.oid),
  'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred,'local',q.conislocal,'inheritance',q.coninhcount,
  'no_inherit',q.connoinherit) ORDER BY q.conname),'[]') FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'nonstandard_not_null',(SELECT count(*) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype='n'
  AND (NOT q.convalidated OR NOT q.conislocal OR q.coninhcount<>0 OR q.connoinherit)),
 'inheritance',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY i.inhseqno),'[]') FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',ic.relname,'definition',pg_get_indexdef(i.indexrelid),
  'valid',i.indisvalid,'ready',i.indisready) ORDER BY ic.relname),'[]') FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid AND NOT (c.oid='public.user_blocks'::regclass AND i.indexrelid IS NOT DISTINCT FROM to_regclass('public.user_blocks_blocked_blocker_idx_v1'))),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid))
  ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND NOT (c.oid='public.services'::regclass AND t.tgname='service_activity_start') AND (n.nspname||'.'||c.relname=ANY(ARRAY['service_publication_private.events','service_publication_private.heads','service_publication_private.commands','service_publication_private.closed_requests','service_publication_private.gallery','service_publication_private.contact_receipts','service_publication_private.thread_context','service_publication_private.message_cards','public.services','public.service_images','horse_publication_private.thread_context']::text[]) OR NOT (t.tgrelid::regclass::text,t.tgname) IN (VALUES ('public.services','service_revision'),('public.service_images','service_gallery_authority'),('listing_publication_private.multipart_sessions','guard_service_multipart_key'),('listing_publication_private.web_images','guard_service_web_key'),('public.messages','service_message_context'),('horse_publication_private.thread_context','horse_select_context'),('service_publication_private.thread_context','service_select_context'),('service_publication_private.events','service_event_immutable'),('service_publication_private.commands','service_command_immutable'))))) structure,
 jsonb_build_object('acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'column_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('column',a.attname,'grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY a.attname,x.grantee::regrole::text,x.privilege_type),'[]') FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'permissive',q.polpermissive,'command',q.polcmd,
  'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(q.polroles) r),
  'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]')
  FROM pg_policy q WHERE q.polrelid=c.oid)) authority
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p') AND n.nspname||'.'||c.relname<>ALL(ARRAY['service_publication_private.activity','service_publication_private.activity_rollout']::text[])
 AND (n.nspname IN('listing_publication_private','listing_contact_private','messaging_private_v2','horse_publication_private','service_publication_private')
  OR n.nspname||'.'||c.relname=ANY(ARRAY['public.horse_offers','public.horse_offer_images','public.horse_offer_publication_events','horse_publication_private.commands','horse_publication_private.closed_requests','horse_publication_private.gallery','horse_publication_private.contact_receipts','horse_publication_private.message_cards','public.publication_policy_documents','public.user_publication_policy_acceptances','public.service_categories','service_publication_private.events','service_publication_private.heads','service_publication_private.commands','service_publication_private.closed_requests','service_publication_private.gallery','service_publication_private.contact_receipts','service_publication_private.thread_context','service_publication_private.message_cards','public.services','public.service_images','horse_publication_private.thread_context','public.profiles','public.identities','public.business_members','public.business_accounts','public.listings','public.listing_images','public.conversations','public.messages','public.conversation_participants','public.identity_profiles','public.user_blocks']::text[]))),
 hosted AS (SELECT jsonb_build_object('project_ref',project_ref,'release_id',release_id,'instance_id',instance_id,
 'release_ready',release_ready,'storage_authority_version',storage_authority_version,'cleanup_mode','held') context,to_jsonb(s) all_settings
 FROM listing_publication_private.hosted_preview_settings s WHERE singleton),
 measured AS MATERIALIZED (SELECT encode(sha256(convert_to((jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]')
 FROM function_facts WHERE NOT(name=ANY(ARRAY['listing_publication_private.assert_non_horse_attempt_v1','listing_publication_private.lock_account_source_cleanup_context_v1','listing_publication_private.multipart_object_fully_deleted','listing_publication_private.protect_attempt','listing_publication_private.require_attempt_policies_v1','listing_publication_private.upload_object_is_published_web_v1','public.add_my_service_image_v2','public.can_manage_service_storage_v2','public.cancel_my_service_publication_v1','public.claim_service_publication_cleanup_v1','public.contact_my_service_provider_v1','public.delete_my_service_image_v2','public.get_my_marketplace_message_thread_v1','public.get_my_service_media_binding_v1','public.get_my_service_publication_attempt_v1','public.get_my_service_publication_image_binding_v1','public.get_my_service_publication_snapshot_v1','public.get_my_service_publications_v1','public.get_public_profile_services_v1','public.get_public_service_media_binding_v1','public.get_public_service_v1','public.prepare_my_service_publication_v1','public.publish_my_service_v1','public.record_service_publication_cleanup_v1','public.save_my_service_v2','public.search_public_services_v1','public.set_my_service_activity_v1','public.set_my_service_primary_image_v2','public.set_my_service_status_v2','public.validate_service_category_pair_v2','service_publication_private.accept_shown_policies','service_publication_private.advance_revision','service_publication_private.assert_actor','service_publication_private.attempt_publication_matches','service_publication_private.capture_message_card','service_publication_private.cleanup_object_eligible','service_publication_private.close_published_attempt','service_publication_private.contact_snapshot','service_publication_private.content','service_publication_private.content_snapshot','service_publication_private.current_policies','service_publication_private.guard_gallery','service_publication_private.guard_image_request_key','service_publication_private.has_current_publication','service_publication_private.image_projection','service_publication_private.is_public','service_publication_private.lock_cleanup_context','service_publication_private.media_binding','service_publication_private.normalize_content','service_publication_private.normalize_gallery','service_publication_private.protect_receipt','service_publication_private.public_fields','service_publication_private.require_policies','service_publication_private.require_ready_image','service_publication_private.retired_web_deleted','service_publication_private.select_current_context','service_publication_private.snapshot','service_publication_private.visible_to_viewer']::text[]) OR name LIKE 'service_publication_private.%')),
 'canonical_structure',(SELECT coalesce(jsonb_agg(structure ORDER BY name),'[]') FROM relation_facts WHERE name=ANY(ARRAY['public.horse_offers','public.horse_offer_images','public.horse_offer_publication_events','horse_publication_private.commands','horse_publication_private.closed_requests','horse_publication_private.gallery','horse_publication_private.contact_receipts','horse_publication_private.message_cards','public.publication_policy_documents','public.user_publication_policy_acceptances','public.service_categories']::text[])),
 'canonical_authority',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',name,'authority',authority) ORDER BY name),'[]')
 FROM relation_facts WHERE name=ANY(ARRAY['public.horse_offers','public.horse_offer_images','public.horse_offer_publication_events','horse_publication_private.commands','horse_publication_private.closed_requests','horse_publication_private.gallery','horse_publication_private.contact_receipts','horse_publication_private.message_cards','public.publication_policy_documents','public.user_publication_policy_acceptances','public.service_categories']::text[])),
 'views',(SELECT jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'owner',pg_get_userbyid(c.relowner),
 'kind',c.relkind,'options',c.reloptions,'definition',pg_get_viewdef(c.oid,true)) ORDER BY n.nspname,c.relname)
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='v' AND n.nspname||'.'||c.relname=ANY(ARRAY['listing_publication_private.hosted_storage_objects','listing_publication_private.hosted_s3_multipart_uploads','listing_publication_private.hosted_s3_multipart_uploads_parts']::text[]))))::text,'UTF8')),'hex') dependencies,encode(sha256(convert_to((jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]')
 FROM function_facts WHERE (name=ANY(ARRAY['listing_publication_private.assert_non_horse_attempt_v1','listing_publication_private.lock_account_source_cleanup_context_v1','listing_publication_private.multipart_object_fully_deleted','listing_publication_private.protect_attempt','listing_publication_private.require_attempt_policies_v1','listing_publication_private.upload_object_is_published_web_v1','public.add_my_service_image_v2','public.can_manage_service_storage_v2','public.cancel_my_service_publication_v1','public.claim_service_publication_cleanup_v1','public.contact_my_service_provider_v1','public.delete_my_service_image_v2','public.get_my_marketplace_message_thread_v1','public.get_my_service_media_binding_v1','public.get_my_service_publication_attempt_v1','public.get_my_service_publication_image_binding_v1','public.get_my_service_publication_snapshot_v1','public.get_my_service_publications_v1','public.get_public_profile_services_v1','public.get_public_service_media_binding_v1','public.get_public_service_v1','public.prepare_my_service_publication_v1','public.publish_my_service_v1','public.record_service_publication_cleanup_v1','public.save_my_service_v2','public.search_public_services_v1','public.set_my_service_activity_v1','public.set_my_service_primary_image_v2','public.set_my_service_status_v2','public.validate_service_category_pair_v2','service_publication_private.accept_shown_policies','service_publication_private.advance_revision','service_publication_private.assert_actor','service_publication_private.attempt_publication_matches','service_publication_private.capture_message_card','service_publication_private.cleanup_object_eligible','service_publication_private.close_published_attempt','service_publication_private.contact_snapshot','service_publication_private.content','service_publication_private.content_snapshot','service_publication_private.current_policies','service_publication_private.guard_gallery','service_publication_private.guard_image_request_key','service_publication_private.has_current_publication','service_publication_private.image_projection','service_publication_private.is_public','service_publication_private.lock_cleanup_context','service_publication_private.media_binding','service_publication_private.normalize_content','service_publication_private.normalize_gallery','service_publication_private.protect_receipt','service_publication_private.public_fields','service_publication_private.require_policies','service_publication_private.require_ready_image','service_publication_private.retired_web_deleted','service_publication_private.select_current_context','service_publication_private.snapshot','service_publication_private.visible_to_viewer']::text[]) OR name LIKE 'service_publication_private.%') AND name<>ALL(ARRAY['public.get_my_service_publications_v1','public.get_public_profile_services_v1']::text[])),
 'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]')
 FROM relation_facts WHERE name=ANY(ARRAY['public.services','public.service_images','horse_publication_private.thread_context']::text[]) OR name LIKE 'service_publication_private.%'),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',n.nspname||'.'||c.relname,'name',t.tgname,
 'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY n.nspname,c.relname,t.tgname),'[]')
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE (t.tgrelid::regclass::text,t.tgname) IN (VALUES ('public.services','service_revision'),('public.service_images','service_gallery_authority'),('listing_publication_private.multipart_sessions','guard_service_multipart_key'),('listing_publication_private.web_images','guard_service_web_key'),('public.messages','service_message_context'),('horse_publication_private.thread_context','horse_select_context'),('service_publication_private.thread_context','service_select_context'),('service_publication_private.events','service_event_immutable'),('service_publication_private.commands','service_command_immutable'))),'schema',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type) FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)) ORDER BY n.nspname),'[]')
 FROM pg_namespace n WHERE n.nspname=ANY(ARRAY['service_publication_private']::text[])),
 'objects',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner)) ORDER BY c.relname),'[]')
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='service_publication_private' AND c.relname<>ALL(ARRAY['activity','activity_rollout','activity_pkey','activity_rollout_pkey','service_activity_until_idx']::text[])),
 'defaults',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(d.defaclrole),'kind',d.defaclobjtype,
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable) FROM aclexplode(d.defaclacl) x))
 ORDER BY pg_get_userbyid(d.defaclrole),d.defaclobjtype),'[]') FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname='service_publication_private')))::text,'UTF8')),'hex') capability,
 encode(sha256(convert_to(((SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]')
 FROM function_facts WHERE NOT(name=ANY(ARRAY['listing_publication_private.assert_non_horse_attempt_v1','listing_publication_private.lock_account_source_cleanup_context_v1','listing_publication_private.multipart_object_fully_deleted','listing_publication_private.protect_attempt','listing_publication_private.require_attempt_policies_v1','listing_publication_private.upload_object_is_published_web_v1','public.add_my_service_image_v2','public.can_manage_service_storage_v2','public.cancel_my_service_publication_v1','public.claim_service_publication_cleanup_v1','public.contact_my_service_provider_v1','public.delete_my_service_image_v2','public.get_my_marketplace_message_thread_v1','public.get_my_service_media_binding_v1','public.get_my_service_publication_attempt_v1','public.get_my_service_publication_image_binding_v1','public.get_my_service_publication_snapshot_v1','public.get_my_service_publications_v1','public.get_public_profile_services_v1','public.get_public_service_media_binding_v1','public.get_public_service_v1','public.prepare_my_service_publication_v1','public.publish_my_service_v1','public.record_service_publication_cleanup_v1','public.save_my_service_v2','public.search_public_services_v1','public.set_my_service_activity_v1','public.set_my_service_primary_image_v2','public.set_my_service_status_v2','public.validate_service_category_pair_v2','service_publication_private.accept_shown_policies','service_publication_private.advance_revision','service_publication_private.assert_actor','service_publication_private.attempt_publication_matches','service_publication_private.capture_message_card','service_publication_private.cleanup_object_eligible','service_publication_private.close_published_attempt','service_publication_private.contact_snapshot','service_publication_private.content','service_publication_private.content_snapshot','service_publication_private.current_policies','service_publication_private.guard_gallery','service_publication_private.guard_image_request_key','service_publication_private.has_current_publication','service_publication_private.image_projection','service_publication_private.is_public','service_publication_private.lock_cleanup_context','service_publication_private.media_binding','service_publication_private.normalize_content','service_publication_private.normalize_gallery','service_publication_private.protect_receipt','service_publication_private.public_fields','service_publication_private.require_policies','service_publication_private.require_ready_image','service_publication_private.retired_web_deleted','service_publication_private.select_current_context','service_publication_private.snapshot','service_publication_private.visible_to_viewer']::text[]) OR name LIKE 'service_publication_private.%')))::text,'UTF8')),'hex') existing_functions,
 encode(sha256(convert_to((jsonb_build_object('tables',(SELECT jsonb_agg(jsonb_build_object('name',name,'authority',authority) ORDER BY name)
 FROM relation_facts WHERE NOT(name=ANY(ARRAY['service_publication_private.events','service_publication_private.heads','service_publication_private.commands','service_publication_private.closed_requests','service_publication_private.gallery','service_publication_private.contact_receipts','service_publication_private.thread_context','service_publication_private.message_cards','public.services','public.service_images','horse_publication_private.thread_context']::text[])) AND name NOT LIKE 'service_publication_private.%'),
 'schemas',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type) FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)) ORDER BY n.nspname),'[]')
 FROM pg_namespace n WHERE n.nspname=ANY(ARRAY['public','listing_publication_private','listing_contact_private','messaging_private_v2','horse_publication_private']::text[])),
 'roles',jsonb_build_object('roles',(SELECT jsonb_agg(jsonb_build_object('name',rolname,'login',rolcanlogin,'super',rolsuper,
 'createdb',rolcreatedb,'createrole',rolcreaterole,'inherit',rolinherit,'replication',rolreplication,'bypassrls',rolbypassrls) ORDER BY rolname)
 FROM pg_roles WHERE rolname=ANY(ARRAY['selqiro_listing_final_writer_v1','selqiro_listing_contact_writer_v1']::text[])),
 'members',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(roleid),'member',pg_get_userbyid(member),'grantor',pg_get_userbyid(grantor),
 'admin',admin_option,'inherit',inherit_option,'set',set_option) ORDER BY roleid::regrole::text,member::regrole::text,grantor::regrole::text),'[]')
 FROM pg_auth_members WHERE pg_get_userbyid(roleid)=ANY(ARRAY['selqiro_listing_final_writer_v1','selqiro_listing_contact_writer_v1']::text[]) OR pg_get_userbyid(member)=ANY(ARRAY['selqiro_listing_final_writer_v1','selqiro_listing_contact_writer_v1']::text[]))),'settings',(SELECT all_settings FROM hosted),
 'actors',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.actor_user_id),'[]') FROM listing_publication_private.hosted_preview_actors a)))::text,'UTF8')),'hex') existing_authority,
 encode(sha256(convert_to(((SELECT jsonb_agg(structure ORDER BY name) FROM relation_facts WHERE NOT(name=ANY(ARRAY['service_publication_private.events','service_publication_private.heads','service_publication_private.commands','service_publication_private.closed_requests','service_publication_private.gallery','service_publication_private.contact_receipts','service_publication_private.thread_context','service_publication_private.message_cards','public.services','public.service_images','horse_publication_private.thread_context']::text[])) AND name NOT LIKE 'service_publication_private.%'))::text,'UTF8')),'hex') immutable_structure),
 checks AS MATERIALIZED (SELECT dependencies='9dd1c4ef3f97785a8f164bb5409f9e4788835fd7a280d8b5db326c36c1be2572' AS functions,
 current_user='postgres' AND session_user='postgres' AND current_setting('transaction_isolation')='read committed'
 AND current_setting('server_version_num')::integer>=170000 AS installer,
 jsonb_build_object('roles',(SELECT jsonb_agg(jsonb_build_object('name',rolname,'login',rolcanlogin,'super',rolsuper,
 'createdb',rolcreatedb,'createrole',rolcreaterole,'inherit',rolinherit,'replication',rolreplication,'bypassrls',rolbypassrls) ORDER BY rolname)
 FROM pg_roles WHERE rolname=ANY(ARRAY['selqiro_listing_final_writer_v1','selqiro_listing_contact_writer_v1']::text[])),
 'members',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(roleid),'member',pg_get_userbyid(member),'grantor',pg_get_userbyid(grantor),
 'admin',admin_option,'inherit',inherit_option,'set',set_option) ORDER BY roleid::regrole::text,member::regrole::text,grantor::regrole::text),'[]')
 FROM pg_auth_members WHERE pg_get_userbyid(roleid)=ANY(ARRAY['selqiro_listing_final_writer_v1','selqiro_listing_contact_writer_v1']::text[]) OR pg_get_userbyid(member)=ANY(ARRAY['selqiro_listing_final_writer_v1','selqiro_listing_contact_writer_v1']::text[])))='{"roles":[{"name":"selqiro_listing_contact_writer_v1","login":false,"super":false,"inherit":false,"createdb":false,"bypassrls":false,"createrole":false,"replication":false},{"name":"selqiro_listing_final_writer_v1","login":false,"super":false,"inherit":false,"createdb":false,"bypassrls":false,"createrole":false,"replication":false}],"members":[{"set":true,"role":"selqiro_listing_contact_writer_v1","admin":false,"member":"postgres","grantor":"postgres","inherit":true},{"set":false,"role":"selqiro_listing_contact_writer_v1","admin":true,"member":"postgres","grantor":"supabase_admin","inherit":false},{"set":true,"role":"selqiro_listing_final_writer_v1","admin":false,"member":"postgres","grantor":"postgres","inherit":true},{"set":false,"role":"selqiro_listing_final_writer_v1","admin":true,"member":"postgres","grantor":"supabase_admin","inherit":false}]}'::jsonb AND NOT EXISTS(SELECT 1 FROM unnest(ARRAY['selqiro_listing_final_writer_v1','selqiro_listing_contact_writer_v1']::text[]) r
 WHERE has_schema_privilege(r,'public','CREATE') OR has_schema_privilege(r,'listing_publication_private','CREATE')
 OR EXISTS(SELECT 1 FROM unnest(ARRAY['anon','authenticated','service_role']) a WHERE pg_has_role(a,r,'MEMBER'))) AS actor_roles,
 NOT EXISTS(SELECT 1 FROM pg_namespace n CROSS JOIN unnest(ARRAY['anon','authenticated','service_role']) a
 WHERE n.nspname IN('listing_publication_private','listing_contact_private','messaging_private_v2','horse_publication_private')
 AND (n.nspowner<>to_regrole('postgres') OR has_schema_privilege(a,n.oid,'USAGE') OR has_schema_privilege(a,n.oid,'CREATE'))) AS closed_private_schema,
 NOT EXISTS(SELECT 1 FROM unnest(ARRAY['public.profiles','public.identities','public.business_members','public.business_accounts','public.services','public.service_images','public.service_categories','public.horse_offers','public.horse_offer_images','public.horse_offer_publication_events','horse_publication_private.commands','horse_publication_private.closed_requests','horse_publication_private.gallery','horse_publication_private.contact_receipts','horse_publication_private.thread_context','horse_publication_private.message_cards','listing_publication_private.attempts','listing_publication_private.objects','listing_publication_private.slots','listing_publication_private.web_images','listing_publication_private.multipart_sessions','listing_publication_private.cleanup','listing_contact_private.channels','public.messages','public.conversations']::text[]) required(name) LEFT JOIN pg_class c ON c.oid=to_regclass(required.name)
 WHERE c.oid IS NULL OR c.relkind<>'r' OR NOT c.relrowsecurity OR c.relowner<>to_regrole('postgres')) AS core_relations,
 NOT EXISTS(SELECT 1 FROM (VALUES ('public.profiles','id','uuid'),('public.profiles','active_identity_id','uuid'),('public.identities','id','uuid'),('public.identities','status','text'),('public.identities','business_account_id','uuid'),('public.business_members','user_id','uuid'),('public.business_members','business_account_id','uuid'),('public.business_members','status','text'),('public.messages','id','bigint'),('public.messages','conversation_id','bigint'),('public.messages','sender_id','uuid'),('public.conversations','id','bigint'),('public.conversation_participants','conversation_id','bigint'),('public.conversation_participants','user_id','uuid'),('public.business_accounts','id','uuid'),('public.business_accounts','owner_user_id','uuid'),('public.identities','user_id','uuid'),('public.identity_profiles','identity_id','uuid'),('public.identity_profiles','display_name','text'),('public.identity_profiles','slug','text')) required(relation_name,column_name,type_name)
 WHERE NOT EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=to_regclass(required.relation_name) AND a.attname=required.column_name
 AND NOT a.attisdropped AND a.atttypid=to_regtype(required.type_name) AND a.attgenerated=''))
 AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.business_accounts'::regclass AND attname='owner_user_id' AND attnotnull AND NOT attisdropped) AS required_columns,
 (SELECT jsonb_agg(jsonb_build_object('relation',n.nspname||'.'||c.relname,'name',t.tgname,'enabled',t.tgenabled,
 'definition',pg_get_triggerdef(t.oid)) ORDER BY n.nspname,c.relname,t.tgname)
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE t.tgname=ANY(ARRAY['protect_attempt','protect_slot','protect_object','protect_web_image','protect_publication','protect_cleanup','guard_managed_listing','guard_managed_image','protect_multipart_attempt','protect_multipart_session','protect_multipart_auxiliary','guard_horse_multipart_key','guard_horse_web_key','horse_message_context']::text[]) AND n.nspname IN('public','listing_publication_private'))='[{"name":"protect_attempt","enabled":"O","relation":"listing_publication_private.attempts","definition":"CREATE TRIGGER protect_attempt BEFORE DELETE OR UPDATE ON listing_publication_private.attempts FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_attempt()"},{"name":"protect_cleanup","enabled":"O","relation":"listing_publication_private.cleanup","definition":"CREATE TRIGGER protect_cleanup BEFORE DELETE OR UPDATE ON listing_publication_private.cleanup FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_cleanup()"},{"name":"protect_multipart_attempt","enabled":"O","relation":"listing_publication_private.multipart_attempts","definition":"CREATE TRIGGER protect_multipart_attempt BEFORE INSERT OR DELETE OR UPDATE ON listing_publication_private.multipart_attempts FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_multipart_attempt()"},{"name":"protect_multipart_auxiliary","enabled":"O","relation":"listing_publication_private.multipart_auxiliary_receipts","definition":"CREATE TRIGGER protect_multipart_auxiliary BEFORE INSERT OR DELETE OR UPDATE ON listing_publication_private.multipart_auxiliary_receipts FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_multipart_auxiliary()"},{"name":"guard_horse_multipart_key","enabled":"O","relation":"listing_publication_private.multipart_sessions","definition":"CREATE TRIGGER guard_horse_multipart_key BEFORE INSERT ON listing_publication_private.multipart_sessions FOR EACH ROW EXECUTE FUNCTION horse_publication_private.guard_image_request_key()"},{"name":"protect_multipart_session","enabled":"O","relation":"listing_publication_private.multipart_sessions","definition":"CREATE TRIGGER protect_multipart_session BEFORE INSERT OR DELETE OR UPDATE ON listing_publication_private.multipart_sessions FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_multipart_session()"},{"name":"protect_object","enabled":"O","relation":"listing_publication_private.objects","definition":"CREATE TRIGGER protect_object BEFORE DELETE OR UPDATE ON listing_publication_private.objects FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_object()"},{"name":"protect_publication","enabled":"O","relation":"listing_publication_private.publications","definition":"CREATE TRIGGER protect_publication BEFORE DELETE OR UPDATE ON listing_publication_private.publications FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_publication()"},{"name":"protect_slot","enabled":"O","relation":"listing_publication_private.slots","definition":"CREATE TRIGGER protect_slot BEFORE DELETE OR UPDATE ON listing_publication_private.slots FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_slot()"},{"name":"guard_horse_web_key","enabled":"O","relation":"listing_publication_private.web_images","definition":"CREATE TRIGGER guard_horse_web_key BEFORE INSERT ON listing_publication_private.web_images FOR EACH ROW EXECUTE FUNCTION horse_publication_private.guard_image_request_key()"},{"name":"protect_web_image","enabled":"O","relation":"listing_publication_private.web_images","definition":"CREATE TRIGGER protect_web_image BEFORE DELETE OR UPDATE ON listing_publication_private.web_images FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_web_image()"},{"name":"guard_managed_image","enabled":"O","relation":"public.listing_images","definition":"CREATE TRIGGER guard_managed_image BEFORE INSERT OR DELETE OR UPDATE ON public.listing_images FOR EACH ROW EXECUTE FUNCTION listing_publication_private.guard_managed_image()"},{"name":"guard_managed_listing","enabled":"O","relation":"public.listings","definition":"CREATE TRIGGER guard_managed_listing BEFORE INSERT OR DELETE OR UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION listing_publication_private.guard_managed_listing()"},{"name":"horse_message_context","enabled":"O","relation":"public.messages","definition":"CREATE TRIGGER horse_message_context AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION horse_publication_private.capture_message_card()"}]'::jsonb AS managed_triggers,
 (SELECT jsonb_agg(jsonb_build_object('relation',n.nspname||'.'||c.relname,'name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
 'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(p.polroles) r),
 'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY n.nspname,c.relname,p.polname)
 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE (n.nspname||'.'||c.relname,p.polname) IN (VALUES ('horse_publication_private.closed_requests','horse_closed_writer_read'),('horse_publication_private.commands','horse_command_writer_read'),('horse_publication_private.contact_receipts','contact_writer'),('horse_publication_private.gallery','horse_gallery_writer_read'),('horse_publication_private.message_cards','contact_writer'),('horse_publication_private.thread_context','contact_writer'),('listing_contact_private.channels','contact_writer'),('listing_contact_private.contact_receipts','contact_writer'),('listing_contact_private.message_receipts','contact_writer'),('listing_publication_private.attempts','final_internal_writer'),('listing_publication_private.cleanup','final_internal_writer'),('listing_publication_private.managed_image_additions_v1','managed_image_addition_writer'),('listing_publication_private.managed_image_presentations_v1','managed_image_presentation_writer'),('listing_publication_private.multipart_abort_observations','multipart_abort_internal'),('listing_publication_private.multipart_attempts','multipart_attempt_internal'),('listing_publication_private.multipart_auxiliary_receipts','multipart_auxiliary_internal'),('listing_publication_private.multipart_sessions','multipart_session_internal'),('listing_publication_private.objects','final_internal_writer'),('listing_publication_private.publications','contact_writer_read'),('listing_publication_private.publications','final_internal_writer'),('listing_publication_private.slots','final_internal_writer'),('listing_publication_private.source_no_release','source_no_release_internal'),('listing_publication_private.source_recorded_no_release','recorded_no_release_insert_internal'),('listing_publication_private.source_recorded_no_release','release_read_internal'),('listing_publication_private.source_release_tracking','release_read_internal'),('listing_publication_private.source_release_tracking','tracking_insert_internal'),('listing_publication_private.upload_grants','final_internal_writer'),('listing_publication_private.web_images','final_internal_writer'),('listing_publication_private.web_write_completions','completion_internal_writer'),('listing_publication_private.write_settlements','settlement_internal'),('messaging_private_v2.photos','controlled_writer'),('messaging_private_v2.read_watermarks','controlled_writer'),('messaging_private_v2.send_receipts','controlled_writer'),('public.business_members','contact_writer_lock'),('public.business_members','contact_writer_read'),('public.conversation_participants','contact_identity_visibility'),('public.conversation_participants','contact_writer'),('public.conversations','contact_identity_visibility'),('public.conversations','contact_writer'),('public.horse_offer_images','horse_writer_read_images'),('public.horse_offer_publication_events','horse_writer_read_events'),('public.horse_offers','horse_writer_read_offers'),('public.identities','contact_writer_lock'),('public.identities','contact_writer_read'),('public.listing_images','final_writer_images'),('public.listings','contact_writer_lock'),('public.listings','contact_writer_read'),('public.listings','final_writer_listings'),('public.messages','contact_identity_visibility'),('public.messages','contact_writer'),('public.profiles','contact_writer_lock'),('public.profiles','contact_writer_read'),('public.user_blocks','contact_writer_lock'),('public.user_blocks','contact_writer_read')))='[{"name":"horse_closed_writer_read","check":null,"roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"r","relation":"horse_publication_private.closed_requests","permissive":true},{"name":"horse_command_writer_read","check":null,"roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"r","relation":"horse_publication_private.commands","permissive":true},{"name":"contact_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"horse_publication_private.contact_receipts","permissive":true},{"name":"horse_gallery_writer_read","check":null,"roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"r","relation":"horse_publication_private.gallery","permissive":true},{"name":"contact_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"horse_publication_private.message_cards","permissive":true},{"name":"contact_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"horse_publication_private.thread_context","permissive":true},{"name":"contact_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"listing_contact_private.channels","permissive":true},{"name":"contact_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"listing_contact_private.contact_receipts","permissive":true},{"name":"contact_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"listing_contact_private.message_receipts","permissive":true},{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.attempts","permissive":true},{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.cleanup","permissive":true},{"name":"managed_image_addition_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.managed_image_additions_v1","permissive":true},{"name":"managed_image_presentation_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.managed_image_presentations_v1","permissive":true},{"name":"multipart_abort_internal","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.multipart_abort_observations","permissive":true},{"name":"multipart_attempt_internal","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.multipart_attempts","permissive":true},{"name":"multipart_auxiliary_internal","check":null,"roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"r","relation":"listing_publication_private.multipart_auxiliary_receipts","permissive":true},{"name":"multipart_session_internal","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.multipart_sessions","permissive":true},{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.objects","permissive":true},{"name":"contact_writer_read","check":null,"roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"r","relation":"listing_publication_private.publications","permissive":true},{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.publications","permissive":true},{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.slots","permissive":true},{"name":"source_no_release_internal","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.source_no_release","permissive":true},{"name":"recorded_no_release_insert_internal","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":null,"command":"a","relation":"listing_publication_private.source_recorded_no_release","permissive":true},{"name":"release_read_internal","check":null,"roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"r","relation":"listing_publication_private.source_recorded_no_release","permissive":true},{"name":"release_read_internal","check":null,"roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"r","relation":"listing_publication_private.source_release_tracking","permissive":true},{"name":"tracking_insert_internal","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":null,"command":"a","relation":"listing_publication_private.source_release_tracking","permissive":true},{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.upload_grants","permissive":true},{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.web_images","permissive":true},{"name":"completion_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.web_write_completions","permissive":true},{"name":"settlement_internal","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.write_settlements","permissive":true},{"name":"controlled_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"messaging_private_v2.photos","permissive":true},{"name":"controlled_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"messaging_private_v2.read_watermarks","permissive":true},{"name":"controlled_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"messaging_private_v2.send_receipts","permissive":true},{"name":"contact_writer_lock","check":"false","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"w","relation":"public.business_members","permissive":true},{"name":"contact_writer_read","check":null,"roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"r","relation":"public.business_members","permissive":true},{"name":"contact_identity_visibility","check":"public.listing_contact_visible_v1(conversation_id)","roles":["authenticated"],"using":"public.listing_contact_visible_v1(conversation_id)","command":"*","relation":"public.conversation_participants","permissive":false},{"name":"contact_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"public.conversation_participants","permissive":true},{"name":"contact_identity_visibility","check":"public.listing_contact_visible_v1(id)","roles":["authenticated"],"using":"public.listing_contact_visible_v1(id)","command":"*","relation":"public.conversations","permissive":false},{"name":"contact_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"public.conversations","permissive":true},{"name":"horse_writer_read_images","check":null,"roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"r","relation":"public.horse_offer_images","permissive":true},{"name":"horse_writer_read_events","check":null,"roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"r","relation":"public.horse_offer_publication_events","permissive":true},{"name":"horse_writer_read_offers","check":null,"roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"r","relation":"public.horse_offers","permissive":true},{"name":"contact_writer_lock","check":"false","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"w","relation":"public.identities","permissive":true},{"name":"contact_writer_read","check":null,"roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"r","relation":"public.identities","permissive":true},{"name":"final_writer_images","check":"(EXISTS ( SELECT 1\n   FROM public.listings l\n  WHERE ((l.id = listing_images.listing_id) AND public.current_user_has_identity_access(l.identity_id))))","roles":["selqiro_listing_final_writer_v1"],"using":"(EXISTS ( SELECT 1\n   FROM public.listings l\n  WHERE ((l.id = listing_images.listing_id) AND public.current_user_has_identity_access(l.identity_id))))","command":"*","relation":"public.listing_images","permissive":true},{"name":"contact_writer_lock","check":"false","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"w","relation":"public.listings","permissive":true},{"name":"contact_writer_read","check":null,"roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"r","relation":"public.listings","permissive":true},{"name":"final_writer_listings","check":"public.current_user_has_identity_access(identity_id)","roles":["selqiro_listing_final_writer_v1"],"using":"public.current_user_has_identity_access(identity_id)","command":"*","relation":"public.listings","permissive":true},{"name":"contact_identity_visibility","check":"public.listing_contact_visible_v1(conversation_id)","roles":["authenticated"],"using":"public.listing_contact_visible_v1(conversation_id)","command":"*","relation":"public.messages","permissive":false},{"name":"contact_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","relation":"public.messages","permissive":true},{"name":"contact_writer_lock","check":"false","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"w","relation":"public.profiles","permissive":true},{"name":"contact_writer_read","check":null,"roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"r","relation":"public.profiles","permissive":true},{"name":"contact_writer_lock","check":"false","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"w","relation":"public.user_blocks","permissive":true},{"name":"contact_writer_read","check":null,"roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"r","relation":"public.user_blocks","permissive":true}]'::jsonb AND NOT EXISTS(SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname||'.'||c.relname=ANY(ARRAY['horse_publication_private.closed_requests','horse_publication_private.commands','horse_publication_private.contact_receipts','horse_publication_private.gallery','horse_publication_private.message_cards','horse_publication_private.thread_context','listing_contact_private.channels','listing_contact_private.contact_receipts','listing_contact_private.message_receipts','listing_publication_private.attempts','listing_publication_private.cleanup','listing_publication_private.managed_image_additions_v1','listing_publication_private.managed_image_presentations_v1','listing_publication_private.multipart_abort_observations','listing_publication_private.multipart_attempts','listing_publication_private.multipart_auxiliary_receipts','listing_publication_private.multipart_sessions','listing_publication_private.objects','listing_publication_private.publications','listing_publication_private.slots','listing_publication_private.source_no_release','listing_publication_private.source_recorded_no_release','listing_publication_private.source_release_tracking','listing_publication_private.upload_grants','listing_publication_private.web_images','listing_publication_private.web_write_completions','listing_publication_private.write_settlements','messaging_private_v2.photos','messaging_private_v2.read_watermarks','messaging_private_v2.send_receipts']::text[])
 AND (n.nspname||'.'||c.relname,p.polname) NOT IN (VALUES ('horse_publication_private.closed_requests','horse_closed_writer_read'),('horse_publication_private.commands','horse_command_writer_read'),('horse_publication_private.contact_receipts','contact_writer'),('horse_publication_private.gallery','horse_gallery_writer_read'),('horse_publication_private.message_cards','contact_writer'),('horse_publication_private.thread_context','contact_writer'),('listing_contact_private.channels','contact_writer'),('listing_contact_private.contact_receipts','contact_writer'),('listing_contact_private.message_receipts','contact_writer'),('listing_publication_private.attempts','final_internal_writer'),('listing_publication_private.cleanup','final_internal_writer'),('listing_publication_private.managed_image_additions_v1','managed_image_addition_writer'),('listing_publication_private.managed_image_presentations_v1','managed_image_presentation_writer'),('listing_publication_private.multipart_abort_observations','multipart_abort_internal'),('listing_publication_private.multipart_attempts','multipart_attempt_internal'),('listing_publication_private.multipart_auxiliary_receipts','multipart_auxiliary_internal'),('listing_publication_private.multipart_sessions','multipart_session_internal'),('listing_publication_private.objects','final_internal_writer'),('listing_publication_private.publications','contact_writer_read'),('listing_publication_private.publications','final_internal_writer'),('listing_publication_private.slots','final_internal_writer'),('listing_publication_private.source_no_release','source_no_release_internal'),('listing_publication_private.source_recorded_no_release','recorded_no_release_insert_internal'),('listing_publication_private.source_recorded_no_release','release_read_internal'),('listing_publication_private.source_release_tracking','release_read_internal'),('listing_publication_private.source_release_tracking','tracking_insert_internal'),('listing_publication_private.upload_grants','final_internal_writer'),('listing_publication_private.web_images','final_internal_writer'),('listing_publication_private.web_write_completions','completion_internal_writer'),('listing_publication_private.write_settlements','settlement_internal'),('messaging_private_v2.photos','controlled_writer'),('messaging_private_v2.read_watermarks','controlled_writer'),('messaging_private_v2.send_receipts','controlled_writer'),('public.business_members','contact_writer_lock'),('public.business_members','contact_writer_read'),('public.conversation_participants','contact_identity_visibility'),('public.conversation_participants','contact_writer'),('public.conversations','contact_identity_visibility'),('public.conversations','contact_writer'),('public.horse_offer_images','horse_writer_read_images'),('public.horse_offer_publication_events','horse_writer_read_events'),('public.horse_offers','horse_writer_read_offers'),('public.identities','contact_writer_lock'),('public.identities','contact_writer_read'),('public.listing_images','final_writer_images'),('public.listings','contact_writer_lock'),('public.listings','contact_writer_read'),('public.listings','final_writer_listings'),('public.messages','contact_identity_visibility'),('public.messages','contact_writer'),('public.profiles','contact_writer_lock'),('public.profiles','contact_writer_read'),('public.user_blocks','contact_writer_lock'),('public.user_blocks','contact_writer_read'))) AS final_writer_policies,
 EXISTS(SELECT 1 FROM hosted WHERE context->>'project_ref'='vyjletlmwoiwxsnsunlm' AND context->>'release_id'='listing-publication-hosted-preview-v1'
 AND (context->>'release_ready')::boolean AND context->>'storage_authority_version'='source-part-rfc3986-v1'
 AND context->>'instance_id'='2d088814-0900-448a-a9d1-7b05470cb1d2') AND listing_publication_private.hosted_storage_contract_ready() AS hosted_context_ready,
 capability='c33641ef8c175d9b6cb4b80dba1503b95685fd371f68e92d62607101a40c5b26' AND to_regnamespace('service_publication_private') IS NULL
 AND (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['listing_publication_private.assert_non_horse_attempt_v1','listing_publication_private.lock_account_source_cleanup_context_v1','listing_publication_private.multipart_object_fully_deleted','listing_publication_private.protect_attempt','listing_publication_private.require_attempt_policies_v1','listing_publication_private.upload_object_is_published_web_v1','public.add_my_service_image_v2','public.can_manage_service_storage_v2','public.cancel_my_service_publication_v1','public.claim_service_publication_cleanup_v1','public.contact_my_service_provider_v1','public.delete_my_service_image_v2','public.get_my_marketplace_message_thread_v1','public.get_my_service_media_binding_v1','public.get_my_service_publication_attempt_v1','public.get_my_service_publication_image_binding_v1','public.get_my_service_publication_snapshot_v1','public.get_my_service_publications_v1','public.get_public_profile_services_v1','public.get_public_service_media_binding_v1','public.get_public_service_v1','public.prepare_my_service_publication_v1','public.publish_my_service_v1','public.record_service_publication_cleanup_v1','public.save_my_service_v2','public.search_public_services_v1','public.set_my_service_activity_v1','public.set_my_service_primary_image_v2','public.set_my_service_status_v2','public.validate_service_category_pair_v2','service_publication_private.accept_shown_policies','service_publication_private.advance_revision','service_publication_private.assert_actor','service_publication_private.attempt_publication_matches','service_publication_private.capture_message_card','service_publication_private.cleanup_object_eligible','service_publication_private.close_published_attempt','service_publication_private.contact_snapshot','service_publication_private.content','service_publication_private.content_snapshot','service_publication_private.current_policies','service_publication_private.guard_gallery','service_publication_private.guard_image_request_key','service_publication_private.has_current_publication','service_publication_private.image_projection','service_publication_private.is_public','service_publication_private.lock_cleanup_context','service_publication_private.media_binding','service_publication_private.normalize_content','service_publication_private.normalize_gallery','service_publication_private.protect_receipt','service_publication_private.public_fields','service_publication_private.require_policies','service_publication_private.require_ready_image','service_publication_private.retired_web_deleted','service_publication_private.select_current_context','service_publication_private.snapshot','service_publication_private.visible_to_viewer']::text[]))=15 AS capability_absent,
 capability='7ac89799f70adb757c5f4eb2edb072e774141f315e6be8a3fb117b30c184ad9b' AND to_regnamespace('service_publication_private') IS NOT NULL
 AND (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['listing_publication_private.assert_non_horse_attempt_v1','listing_publication_private.lock_account_source_cleanup_context_v1','listing_publication_private.multipart_object_fully_deleted','listing_publication_private.protect_attempt','listing_publication_private.require_attempt_policies_v1','listing_publication_private.upload_object_is_published_web_v1','public.add_my_service_image_v2','public.can_manage_service_storage_v2','public.cancel_my_service_publication_v1','public.claim_service_publication_cleanup_v1','public.contact_my_service_provider_v1','public.delete_my_service_image_v2','public.get_my_marketplace_message_thread_v1','public.get_my_service_media_binding_v1','public.get_my_service_publication_attempt_v1','public.get_my_service_publication_image_binding_v1','public.get_my_service_publication_snapshot_v1','public.get_my_service_publications_v1','public.get_public_profile_services_v1','public.get_public_service_media_binding_v1','public.get_public_service_v1','public.prepare_my_service_publication_v1','public.publish_my_service_v1','public.record_service_publication_cleanup_v1','public.save_my_service_v2','public.search_public_services_v1','public.set_my_service_activity_v1','public.set_my_service_primary_image_v2','public.set_my_service_status_v2','public.validate_service_category_pair_v2','service_publication_private.accept_shown_policies','service_publication_private.advance_revision','service_publication_private.assert_actor','service_publication_private.attempt_publication_matches','service_publication_private.capture_message_card','service_publication_private.cleanup_object_eligible','service_publication_private.close_published_attempt','service_publication_private.contact_snapshot','service_publication_private.content','service_publication_private.content_snapshot','service_publication_private.current_policies','service_publication_private.guard_gallery','service_publication_private.guard_image_request_key','service_publication_private.has_current_publication','service_publication_private.image_projection','service_publication_private.is_public','service_publication_private.lock_cleanup_context','service_publication_private.media_binding','service_publication_private.normalize_content','service_publication_private.normalize_gallery','service_publication_private.protect_receipt','service_publication_private.public_fields','service_publication_private.require_policies','service_publication_private.require_ready_image','service_publication_private.retired_web_deleted','service_publication_private.select_current_context','service_publication_private.snapshot','service_publication_private.visible_to_viewer']::text[]))=58 AS capability_present FROM measured),
 assessed AS MATERIALIZED (SELECT *,coalesce(functions AND installer AND actor_roles AND closed_private_schema AND core_relations
 AND required_columns AND managed_triggers AND final_writer_policies AND hosted_context_ready,false) dependencies_ok FROM checks),
 result_row AS (SELECT jsonb_build_object('schema_version',1,'kind','service-publication-v1',
 'state',CASE WHEN dependencies_ok AND capability_absent AND NOT capability_present THEN 'absent'
 WHEN dependencies_ok AND capability_present AND NOT capability_absent THEN 'applied' ELSE 'unknown' END,
 'recognized',dependencies_ok AND (capability_absent<>capability_present),'ready_to_apply',dependencies_ok AND capability_absent AND NOT capability_present,
 'dependencies_ok',dependencies_ok,'capability_absent',capability_absent,'capability_present',capability_present,
 'guards',to_jsonb(assessed)-ARRAY['dependencies_ok','capability_absent','capability_present'],'hosted_context',(SELECT context FROM hosted),
 'fingerprints',jsonb_build_object('dependencies',dependencies,'capability',capability),
 'invariants',jsonb_build_object('existing_functions',existing_functions,'existing_authority',existing_authority,'immutable_structure',immutable_structure)) result
 FROM assessed CROSS JOIN measured) SELECT result FROM result_row),
 reader_facts AS (SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_service_publications_v1','public.get_public_profile_marketplace_v1','public.get_public_profile_services_v1']::text[])),
 profile_functions AS (SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname=ANY(ARRAY['public.get_public_profile_listings_v1','public.prepare_store_category_name','public.validate_store_category_parent']::text[])),
 store_relations AS (SELECT n.nspname||'.'||c.relname name,
 jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'persistence',c.relpersistence,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
  'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(ad.adbin,ad.adrelid),
  'collation',CASE WHEN a.attcollation=0 THEN NULL ELSE a.attcollation::regcollation::text END) ORDER BY a.attnum),'[]')
  FROM pg_attribute a LEFT JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'definition',pg_get_constraintdef(q.oid),
  'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred,'local',q.conislocal,'inheritance',q.coninhcount,
  'no_inherit',q.connoinherit) ORDER BY q.conname),'[]') FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'nonstandard_not_null',(SELECT count(*) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype='n'
  AND (NOT q.convalidated OR NOT q.conislocal OR q.coninhcount<>0 OR q.connoinherit)),
 'inheritance',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY i.inhseqno),'[]') FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',ic.relname,'definition',pg_get_indexdef(i.indexrelid),
  'valid',i.indisvalid,'ready',i.indisready) ORDER BY ic.relname),'[]') FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid AND NOT (c.oid='public.user_blocks'::regclass AND i.indexrelid IS NOT DISTINCT FROM to_regclass('public.user_blocks_blocked_blocker_idx_v1'))),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid))
  ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND (n.nspname||'.'||c.relname=ANY(ARRAY['service_publication_private.events','service_publication_private.heads','service_publication_private.commands','service_publication_private.closed_requests','service_publication_private.gallery','service_publication_private.contact_receipts','service_publication_private.thread_context','service_publication_private.message_cards','public.services','public.service_images','horse_publication_private.thread_context']::text[]) OR NOT (t.tgrelid::regclass::text,t.tgname) IN (VALUES ('public.services','service_revision'),('public.service_images','service_gallery_authority'),('listing_publication_private.multipart_sessions','guard_service_multipart_key'),('listing_publication_private.web_images','guard_service_web_key'),('public.messages','service_message_context'),('horse_publication_private.thread_context','horse_select_context'),('service_publication_private.thread_context','service_select_context'),('service_publication_private.events','service_event_immutable'),('service_publication_private.commands','service_command_immutable'))))) structure,
 jsonb_build_object('acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'column_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('column',a.attname,'grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY a.attname,x.grantee::regrole::text,x.privilege_type),'[]') FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'permissive',q.polpermissive,'command',q.polcmd,
  'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(q.polroles) r),
  'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]')
  FROM pg_policy q WHERE q.polrelid=c.oid)) authority
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p')
 AND n.nspname||'.'||c.relname=ANY(ARRAY['public.store_categories','public.listing_store_categories']::text[])),
 category_functions AS (SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname=ANY(ARRAY['public.create_my_store_child_category_v2','public.create_my_store_root_category_v2','public.current_user_has_identity_access','public.delete_my_store_category_v2','public.prepare_store_category_name','public.rename_my_store_category_v2','public.require_my_active_identity_v2','public.set_my_listing_store_categories_v2','public.validate_store_category_parent']::text[])),
 capability_functions AS (SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname=ANY(ARRAY['public.manage_my_store_category_v1']::text[])),
 horse_category_functions AS (SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_horse_offer_store_categories_v1','public.get_public_profile_marketplace_v2','public.set_my_horse_offer_store_categories_v1']::text[])),
 horse_category_relations AS (SELECT n.nspname||'.'||c.relname name,
 jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'persistence',c.relpersistence,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
  'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(ad.adbin,ad.adrelid),
  'collation',CASE WHEN a.attcollation=0 THEN NULL ELSE a.attcollation::regcollation::text END) ORDER BY a.attnum),'[]')
  FROM pg_attribute a LEFT JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'definition',pg_get_constraintdef(q.oid),
  'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred,'local',q.conislocal,'inheritance',q.coninhcount,
  'no_inherit',q.connoinherit) ORDER BY q.conname),'[]') FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'nonstandard_not_null',(SELECT count(*) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype='n'
  AND (NOT q.convalidated OR NOT q.conislocal OR q.coninhcount<>0 OR q.connoinherit)),
 'inheritance',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY i.inhseqno),'[]') FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',ic.relname,'definition',pg_get_indexdef(i.indexrelid),
  'valid',i.indisvalid,'ready',i.indisready) ORDER BY ic.relname),'[]') FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid AND NOT (c.oid='public.user_blocks'::regclass AND i.indexrelid IS NOT DISTINCT FROM to_regclass('public.user_blocks_blocked_blocker_idx_v1'))),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid))
  ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND (n.nspname||'.'||c.relname=ANY(ARRAY['service_publication_private.events','service_publication_private.heads','service_publication_private.commands','service_publication_private.closed_requests','service_publication_private.gallery','service_publication_private.contact_receipts','service_publication_private.thread_context','service_publication_private.message_cards','public.services','public.service_images','horse_publication_private.thread_context']::text[]) OR NOT (t.tgrelid::regclass::text,t.tgname) IN (VALUES ('public.services','service_revision'),('public.service_images','service_gallery_authority'),('listing_publication_private.multipart_sessions','guard_service_multipart_key'),('listing_publication_private.web_images','guard_service_web_key'),('public.messages','service_message_context'),('horse_publication_private.thread_context','horse_select_context'),('service_publication_private.thread_context','service_select_context'),('service_publication_private.events','service_event_immutable'),('service_publication_private.commands','service_command_immutable'))))) structure,
 jsonb_build_object('acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'column_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('column',a.attname,'grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY a.attname,x.grantee::regrole::text,x.privilege_type),'[]') FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'permissive',q.polpermissive,'command',q.polcmd,
  'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(q.polroles) r),
  'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]')
  FROM pg_policy q WHERE q.polrelid=c.oid)) authority
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p') AND n.nspname||'.'||c.relname='public.horse_offer_store_categories'),
 service_category_functions AS (SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_service_store_categories_v1','public.get_public_profile_services_v2','public.get_public_profile_store_categories_v2','public.set_my_service_store_categories_v1']::text[])),
 service_category_relations AS (SELECT n.nspname||'.'||c.relname name,
 jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'persistence',c.relpersistence,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
  'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(ad.adbin,ad.adrelid),
  'collation',CASE WHEN a.attcollation=0 THEN NULL ELSE a.attcollation::regcollation::text END) ORDER BY a.attnum),'[]')
  FROM pg_attribute a LEFT JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'definition',pg_get_constraintdef(q.oid),
  'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred,'local',q.conislocal,'inheritance',q.coninhcount,
  'no_inherit',q.connoinherit) ORDER BY q.conname),'[]') FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'nonstandard_not_null',(SELECT count(*) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype='n'
  AND (NOT q.convalidated OR NOT q.conislocal OR q.coninhcount<>0 OR q.connoinherit)),
 'inheritance',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY i.inhseqno),'[]') FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',ic.relname,'definition',pg_get_indexdef(i.indexrelid),
  'valid',i.indisvalid,'ready',i.indisready) ORDER BY ic.relname),'[]') FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid AND NOT (c.oid='public.user_blocks'::regclass AND i.indexrelid IS NOT DISTINCT FROM to_regclass('public.user_blocks_blocked_blocker_idx_v1'))),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid))
  ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND (n.nspname||'.'||c.relname=ANY(ARRAY['service_publication_private.events','service_publication_private.heads','service_publication_private.commands','service_publication_private.closed_requests','service_publication_private.gallery','service_publication_private.contact_receipts','service_publication_private.thread_context','service_publication_private.message_cards','public.services','public.service_images','horse_publication_private.thread_context']::text[]) OR NOT (t.tgrelid::regclass::text,t.tgname) IN (VALUES ('public.services','service_revision'),('public.service_images','service_gallery_authority'),('listing_publication_private.multipart_sessions','guard_service_multipart_key'),('listing_publication_private.web_images','guard_service_web_key'),('public.messages','service_message_context'),('horse_publication_private.thread_context','horse_select_context'),('service_publication_private.thread_context','service_select_context'),('service_publication_private.events','service_event_immutable'),('service_publication_private.commands','service_command_immutable'))))) structure,
 jsonb_build_object('acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'column_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('column',a.attname,'grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY a.attname,x.grantee::regrole::text,x.privilege_type),'[]') FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'permissive',q.polpermissive,'command',q.polcmd,
  'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(q.polroles) r),
  'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]')
  FROM pg_policy q WHERE q.polrelid=c.oid)) authority
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p') AND n.nspname||'.'||c.relname='public.service_store_categories'),
 activity_functions AS (SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_service_activity_v1','public.get_my_service_publication_snapshot_v2','public.get_my_service_publications_v2','public.renew_my_service_activity_v1','service_publication_private.activity_fields','service_publication_private.is_public','service_publication_private.start_activity']::text[])),
 activity_relations AS (SELECT n.nspname||'.'||c.relname name,
 jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'persistence',c.relpersistence,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
  'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(ad.adbin,ad.adrelid),
  'collation',CASE WHEN a.attcollation=0 THEN NULL ELSE a.attcollation::regcollation::text END) ORDER BY a.attnum),'[]')
  FROM pg_attribute a LEFT JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'definition',pg_get_constraintdef(q.oid),
  'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred,'local',q.conislocal,'inheritance',q.coninhcount,
  'no_inherit',q.connoinherit) ORDER BY q.conname),'[]') FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'nonstandard_not_null',(SELECT count(*) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype='n'
  AND (NOT q.convalidated OR NOT q.conislocal OR q.coninhcount<>0 OR q.connoinherit)),
 'inheritance',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY i.inhseqno),'[]') FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',ic.relname,'definition',pg_get_indexdef(i.indexrelid),
  'valid',i.indisvalid,'ready',i.indisready) ORDER BY ic.relname),'[]') FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid AND NOT (c.oid='public.user_blocks'::regclass AND i.indexrelid IS NOT DISTINCT FROM to_regclass('public.user_blocks_blocked_blocker_idx_v1'))),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid))
  ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND (n.nspname||'.'||c.relname=ANY(ARRAY['service_publication_private.events','service_publication_private.heads','service_publication_private.commands','service_publication_private.closed_requests','service_publication_private.gallery','service_publication_private.contact_receipts','service_publication_private.thread_context','service_publication_private.message_cards','public.services','public.service_images','horse_publication_private.thread_context']::text[]) OR NOT (t.tgrelid::regclass::text,t.tgname) IN (VALUES ('public.services','service_revision'),('public.service_images','service_gallery_authority'),('listing_publication_private.multipart_sessions','guard_service_multipart_key'),('listing_publication_private.web_images','guard_service_web_key'),('public.messages','service_message_context'),('horse_publication_private.thread_context','horse_select_context'),('service_publication_private.thread_context','service_select_context'),('service_publication_private.events','service_event_immutable'),('service_publication_private.commands','service_command_immutable'))))) structure,
 jsonb_build_object('acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'column_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('column',a.attname,'grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY a.attname,x.grantee::regrole::text,x.privilege_type),'[]') FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'permissive',q.polpermissive,'command',q.polcmd,
  'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(q.polroles) r),
  'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]')
  FROM pg_policy q WHERE q.polrelid=c.oid)) authority
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p') AND n.nspname||'.'||c.relname=ANY(ARRAY['service_publication_private.activity','service_publication_private.activity_rollout']::text[])), measured AS MATERIALIZED (
 SELECT r.result retained,encode(sha256(convert_to((jsonb_build_object('readers',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM reader_facts),'profile',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM profile_functions),
  'category',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM category_functions),'management',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM capability_functions)))::text,'UTF8')),'hex') functions,encode(sha256(convert_to(((SELECT coalesce(jsonb_agg(structure ORDER BY name),'[]') FROM store_relations))::text,'UTF8')),'hex') structure,
 encode(sha256(convert_to((jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.conrelid IS DISTINCT FROM to_regclass('public.service_store_categories') AND q.conrelid IS DISTINCT FROM to_regclass('public.horse_offer_store_categories') AND q.confrelid IN('public.store_categories'::regclass,'public.listing_store_categories'::regclass)),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN('public.store_categories'::regclass,'public.listing_store_categories'::regclass)),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN('public.store_categories'::regclass,'public.listing_store_categories'::regclass))))::text,'UTF8')),'hex') effects,encode(sha256(convert_to((jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.conrelid IS DISTINCT FROM to_regclass('service_publication_private.activity') AND q.conrelid IS DISTINCT FROM to_regclass('public.service_store_categories') AND q.conrelid IS DISTINCT FROM to_regclass('public.horse_offer_store_categories') AND q.confrelid IN('public.services'::regclass,'public.service_images'::regclass)),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN('public.services'::regclass,'public.service_images'::regclass)),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND NOT (t.tgrelid='public.services'::regclass AND t.tgname='service_activity_start') AND t.tgrelid IN('public.services'::regclass,'public.service_images'::regclass))))::text,'UTF8')),'hex') service_effects,encode(sha256(convert_to(((SELECT authority FROM store_relations WHERE name='public.store_categories'))::text,'UTF8')),'hex') category_authority,
 encode(sha256(convert_to((jsonb_build_object('roles',(SELECT jsonb_agg(jsonb_build_object('name',rolname,'super',rolsuper,
  'createrole',rolcreaterole,'createdb',rolcreatedb,'replication',rolreplication,'bypassrls',rolbypassrls) ORDER BY rolname)
  FROM pg_roles WHERE rolname IN('anon','authenticated')),
  'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(roleid),
   'member',pg_get_userbyid(member),'grantor',pg_get_userbyid(grantor),'admin',admin_option,
   'inherit',inherit_option,'set',set_option) ORDER BY roleid::regrole::text,member::regrole::text,grantor::regrole::text),'[]')
   FROM pg_auth_members WHERE member IN(to_regrole('anon'),to_regrole('authenticated')))))::text,'UTF8')),'hex') api_roles,encode(sha256(convert_to((jsonb_build_object('authority',(SELECT authority FROM store_relations WHERE name='public.listing_store_categories'),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',has_table_privilege(a.role,'public.listing_store_categories',p.privilege),
  'grantable',has_table_privilege(a.role,'public.listing_store_categories',p.privilege||' WITH GRANT OPTION'))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege)),
  'columns',(SELECT jsonb_agg(jsonb_build_object('role',r.role,'column',a.attname,'privilege',p.privilege,
  'allowed',has_column_privilege(r.role,a.attrelid,a.attname,p.privilege)) ORDER BY r.role,a.attname,p.privilege)
  FROM pg_attribute a CROSS JOIN unnest(ARRAY['anon','authenticated']) r(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','REFERENCES']) p(privilege)
  WHERE a.attrelid='public.listing_store_categories'::regclass AND a.attnum>0 AND NOT a.attisdropped))))::text,'UTF8')),'hex') legacy_authority,encode(sha256(convert_to((jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM horse_category_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM horse_category_relations),
  'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.confrelid IN(to_regclass('public.horse_offer_store_categories'))),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN(to_regclass('public.horse_offer_store_categories'))),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN(to_regclass('public.horse_offer_store_categories')))),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('public.horse_offer_store_categories'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('public.horse_offer_store_categories'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege))),
  'object_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',c.relkind,'name',n.nspname||'.'||c.relname) ORDER BY c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='horse_offer_store_categories'),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_horse_offer_store_categories_v1','public.get_public_profile_marketplace_v2','public.set_my_horse_offer_store_categories_v1']::text[]))))::text,'UTF8')),'hex') horse_capability,
 encode(sha256(convert_to((jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM service_category_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM service_category_relations),
  'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.confrelid IN(to_regclass('public.service_store_categories'))),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN(to_regclass('public.service_store_categories'))),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN(to_regclass('public.service_store_categories')))),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('public.service_store_categories'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('public.service_store_categories'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege))),
  'object_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',c.relkind,'name',n.nspname||'.'||c.relname) ORDER BY n.nspname,c.relname,c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
    AND c.relname=ANY(ARRAY['service_store_categories','service_store_categories_pkey','service_store_categories_category_idx'])),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_service_store_categories_v1','public.get_public_profile_services_v2','public.get_public_profile_store_categories_v2','public.set_my_service_store_categories_v1']::text[]))))::text,'UTF8')),'hex') service_categories,encode(sha256(convert_to((jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM activity_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM activity_relations),
  'trigger',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,
  'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]') FROM pg_trigger t
  WHERE t.tgrelid='public.services'::regclass AND t.tgname='service_activity_start'),'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.confrelid IN(to_regclass('service_publication_private.activity'),to_regclass('service_publication_private.activity_rollout'))),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN(to_regclass('service_publication_private.activity'),to_regclass('service_publication_private.activity_rollout'))),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN(to_regclass('service_publication_private.activity'),to_regclass('service_publication_private.activity_rollout')))),'effective',(SELECT jsonb_agg(jsonb_build_object('table',t.name,'role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass(t.name),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass(t.name),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY t.name,a.role,p.privilege) FROM unnest(ARRAY['service_publication_private.activity','service_publication_private.activity_rollout']::text[]) t(name)
  CROSS JOIN unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege)),
  'objects',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind) ORDER BY c.relname,c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='service_publication_private' AND c.relname=ANY(ARRAY['activity','activity_rollout','activity_pkey','activity_rollout_pkey','service_activity_until_idx']::text[])),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_service_activity_v1','public.get_my_service_publication_snapshot_v2','public.get_my_service_publications_v2','public.renew_my_service_activity_v1','service_publication_private.activity_fields','service_publication_private.is_public','service_publication_private.start_activity']::text[]))))::text,'UTF8')),'hex') capability,((SELECT count(*) FROM pg_roles WHERE rolname IN('anon','authenticated'))=2
  AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN('anon','authenticated')
   AND (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls))
  AND NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE member IN(to_regrole('anon'),to_regrole('authenticated')))
  AND NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.listing_store_categories'::regclass
   AND relowner IN(to_regrole('anon'),to_regrole('authenticated')))
  AND NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.listing_store_categories'::regclass
   AND attnum>0 AND NOT attisdropped AND cardinality(attacl)>0)
  AND has_function_privilege('authenticated','public.set_my_listing_store_categories_v2(text,uuid[])','EXECUTE')
  AND NOT has_function_privilege('anon','public.set_my_listing_store_categories_v2(text,uuid[])','EXECUTE')
  AND NOT EXISTS(SELECT 1 FROM unnest(ARRAY['anon','authenticated']) a
   WHERE has_schema_privilege(a,'public','CREATE'))) safe_api_roles,
 (SELECT jsonb_build_object('published_count',count(*) FILTER(WHERE status='published'),
  'archived_count',count(*) FILTER(WHERE status='archived'),'draft_count',count(*) FILTER(WHERE status='draft'),
  'invalid_date_count',count(*) FILTER(WHERE NOT isfinite(created_at) OR NOT isfinite(updated_at)
   OR (published_at IS NOT NULL AND NOT isfinite(published_at)) OR (status='published' AND published_at IS NULL))) FROM public.services) transition_summary,
 encode(sha256(convert_to((jsonb_build_object('retained',r.result->'invariants'->>'existing_functions','categories',jsonb_build_object('readers',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM reader_facts),'profile',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM profile_functions),
  'category',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM category_functions),'management',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM capability_functions)),'horse',jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM horse_category_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM horse_category_relations),
  'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.confrelid IN(to_regclass('public.horse_offer_store_categories'))),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN(to_regclass('public.horse_offer_store_categories'))),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN(to_regclass('public.horse_offer_store_categories')))),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('public.horse_offer_store_categories'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('public.horse_offer_store_categories'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege))),
  'object_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',c.relkind,'name',n.nspname||'.'||c.relname) ORDER BY c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='horse_offer_store_categories'),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_horse_offer_store_categories_v1','public.get_public_profile_marketplace_v2','public.set_my_horse_offer_store_categories_v1']::text[]))),'service_categories',jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM service_category_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM service_category_relations),
  'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.confrelid IN(to_regclass('public.service_store_categories'))),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN(to_regclass('public.service_store_categories'))),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN(to_regclass('public.service_store_categories')))),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('public.service_store_categories'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('public.service_store_categories'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege))),
  'object_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',c.relkind,'name',n.nspname||'.'||c.relname) ORDER BY n.nspname,c.relname,c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
    AND c.relname=ANY(ARRAY['service_store_categories','service_store_categories_pkey','service_store_categories_category_idx'])),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_service_store_categories_v1','public.get_public_profile_services_v2','public.get_public_profile_store_categories_v2','public.set_my_service_store_categories_v1']::text[])))))::text,'UTF8')),'hex') existing_functions,
 encode(sha256(convert_to((jsonb_build_object('retained',r.result->'invariants'->>'existing_authority','store_categories',(SELECT authority FROM store_relations WHERE name='public.store_categories'),'ordinary_links',jsonb_build_object('authority',(SELECT authority FROM store_relations WHERE name='public.listing_store_categories'),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',has_table_privilege(a.role,'public.listing_store_categories',p.privilege),
  'grantable',has_table_privilege(a.role,'public.listing_store_categories',p.privilege||' WITH GRANT OPTION'))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege)),
  'columns',(SELECT jsonb_agg(jsonb_build_object('role',r.role,'column',a.attname,'privilege',p.privilege,
  'allowed',has_column_privilege(r.role,a.attrelid,a.attname,p.privilege)) ORDER BY r.role,a.attname,p.privilege)
  FROM pg_attribute a CROSS JOIN unnest(ARRAY['anon','authenticated']) r(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','REFERENCES']) p(privilege)
  WHERE a.attrelid='public.listing_store_categories'::regclass AND a.attnum>0 AND NOT a.attisdropped))),'horse',jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM horse_category_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM horse_category_relations),
  'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.confrelid IN(to_regclass('public.horse_offer_store_categories'))),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN(to_regclass('public.horse_offer_store_categories'))),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN(to_regclass('public.horse_offer_store_categories')))),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('public.horse_offer_store_categories'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('public.horse_offer_store_categories'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege))),
  'object_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',c.relkind,'name',n.nspname||'.'||c.relname) ORDER BY c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='horse_offer_store_categories'),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_horse_offer_store_categories_v1','public.get_public_profile_marketplace_v2','public.set_my_horse_offer_store_categories_v1']::text[]))),'service_categories',jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM service_category_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM service_category_relations),
  'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.confrelid IN(to_regclass('public.service_store_categories'))),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN(to_regclass('public.service_store_categories'))),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN(to_regclass('public.service_store_categories')))),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('public.service_store_categories'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('public.service_store_categories'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege))),
  'object_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',c.relkind,'name',n.nspname||'.'||c.relname) ORDER BY n.nspname,c.relname,c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
    AND c.relname=ANY(ARRAY['service_store_categories','service_store_categories_pkey','service_store_categories_category_idx'])),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_service_store_categories_v1','public.get_public_profile_services_v2','public.get_public_profile_store_categories_v2','public.set_my_service_store_categories_v1']::text[]))),'api_roles',jsonb_build_object('roles',(SELECT jsonb_agg(jsonb_build_object('name',rolname,'super',rolsuper,
  'createrole',rolcreaterole,'createdb',rolcreatedb,'replication',rolreplication,'bypassrls',rolbypassrls) ORDER BY rolname)
  FROM pg_roles WHERE rolname IN('anon','authenticated')),
  'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(roleid),
   'member',pg_get_userbyid(member),'grantor',pg_get_userbyid(grantor),'admin',admin_option,
   'inherit',inherit_option,'set',set_option) ORDER BY roleid::regrole::text,member::regrole::text,grantor::regrole::text),'[]')
   FROM pg_auth_members WHERE member IN(to_regrole('anon'),to_regrole('authenticated'))))))::text,'UTF8')),'hex') existing_authority,
 encode(sha256(convert_to((jsonb_build_object('retained',r.result->'invariants'->>'immutable_structure','categories',(SELECT coalesce(jsonb_agg(structure ORDER BY name),'[]') FROM store_relations),'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.conrelid IS DISTINCT FROM to_regclass('public.service_store_categories') AND q.conrelid IS DISTINCT FROM to_regclass('public.horse_offer_store_categories') AND q.confrelid IN('public.store_categories'::regclass,'public.listing_store_categories'::regclass)),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN('public.store_categories'::regclass,'public.listing_store_categories'::regclass)),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN('public.store_categories'::regclass,'public.listing_store_categories'::regclass))),'service_effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.conrelid IS DISTINCT FROM to_regclass('service_publication_private.activity') AND q.conrelid IS DISTINCT FROM to_regclass('public.service_store_categories') AND q.conrelid IS DISTINCT FROM to_regclass('public.horse_offer_store_categories') AND q.confrelid IN('public.services'::regclass,'public.service_images'::regclass)),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN('public.services'::regclass,'public.service_images'::regclass)),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND NOT (t.tgrelid='public.services'::regclass AND t.tgname='service_activity_start') AND t.tgrelid IN('public.services'::regclass,'public.service_images'::regclass))),'horse',jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM horse_category_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM horse_category_relations),
  'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.confrelid IN(to_regclass('public.horse_offer_store_categories'))),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN(to_regclass('public.horse_offer_store_categories'))),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN(to_regclass('public.horse_offer_store_categories')))),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('public.horse_offer_store_categories'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('public.horse_offer_store_categories'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege))),
  'object_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',c.relkind,'name',n.nspname||'.'||c.relname) ORDER BY c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='horse_offer_store_categories'),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_horse_offer_store_categories_v1','public.get_public_profile_marketplace_v2','public.set_my_horse_offer_store_categories_v1']::text[]))),'service_categories',jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM service_category_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM service_category_relations),
  'effects',jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.confrelid IN(to_regclass('public.service_store_categories'))),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN(to_regclass('public.service_store_categories'))),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN(to_regclass('public.service_store_categories')))),'effective',jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('public.service_store_categories'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('public.service_store_categories'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege))),
  'object_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',c.relkind,'name',n.nspname||'.'||c.relname) ORDER BY n.nspname,c.relname,c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
    AND c.relname=ANY(ARRAY['service_store_categories','service_store_categories_pkey','service_store_categories_category_idx'])),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(ARRAY['public.get_my_service_store_categories_v1','public.get_public_profile_services_v2','public.get_public_profile_store_categories_v2','public.set_my_service_store_categories_v1']::text[])))))::text,'UTF8')),'hex') immutable_structure
 FROM retained r), checks AS MATERIALIZED (
 SELECT *,jsonb_build_object(
 'installer',coalesce((retained->'guards'->>'installer')::boolean,false),
 'actor_roles',coalesce((retained->'guards'->>'actor_roles')::boolean,false),
 'hosted_context_ready',coalesce((retained->'guards'->>'hosted_context_ready')::boolean,false),
 'retained_release',coalesce(retained->>'state'='applied' AND (retained->>'recognized')::boolean
  AND (retained->>'dependencies_ok')::boolean AND NOT EXISTS(SELECT 1 FROM jsonb_each(retained->'guards') g WHERE g.value<>'true'::jsonb)
  AND retained->'fingerprints'->>'dependencies'='9dd1c4ef3f97785a8f164bb5409f9e4788835fd7a280d8b5db326c36c1be2572'
  AND retained->'fingerprints'->>'capability'='7ac89799f70adb757c5f4eb2edb072e774141f315e6be8a3fb117b30c184ad9b',false),
 'category_functions',functions='e35a9612959d89d4638ca5b3f735616f16cc3363082c6c98302e07120f5f93f7' AND (SELECT count(*) FROM reader_facts)=3 AND (SELECT count(*) FROM profile_functions)=3
   AND (SELECT count(*) FROM category_functions)=9
   AND (SELECT count(*) FROM capability_functions)=1,
 'category_structure',structure='ab43784d467e7a72f2e8e79af3ab6ea47cc48142d2650ba97bcd0ff878bf3c5c' AND (SELECT count(*) FROM store_relations)=2,
 'category_delete_effects',effects='f98cc99812d85d67edc3e525e30e6c80d1c9b5b03b95e99a62f9bdba93aeabe2','service_delete_effects',service_effects='ed0a2afef1ac255765cd192495450ce1b835e7489b5811d4a1103cef97d66336',
 'retained_category_authority',category_authority='1db12d28099908a0d9e7cecedbf242d3fa95eb92c0183c606536769c8ea9cf71',
 'retained_link_authority',legacy_authority='d03a0054400a33d579e75d323531cde60a36ebef17c7e0478fcf89bd9d7e1983',
 'retained_horse_categories',horse_capability='66505e3f48da375c7d929f2732bc6f41a99a6caf468847b9fe911fe327c9e937',
 'retained_service_categories',service_categories='2a7d340ea0b8090a976e67c0042a8dbd946acc0df103b678c989f57e94edde06',
 'api_roles_and_entrypoints',safe_api_roles AND api_roles='a6b12ec9f31ef3e66313f5237759bd8eba9d59e906b4995dac67bbb73d0de1b5',
 'service_dates',(transition_summary->>'invalid_date_count')::bigint=0) guards,
 capability='7d41cdbb327fc60516e89116fd67f54e96fd7650f9a4c654b9482ce1e9c7fece' capability_absent,capability='1626569c5e4407df7c40bb70261350c2e1e95a1ab490aff065da49d198a2f632' capability_present FROM measured),
 assessed AS MATERIALIZED (SELECT *,NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value<>'true'::jsonb) dependencies_ok FROM checks)
 SELECT jsonb_build_object('schema_version',1,'kind','service-activity-v1',
 'state',CASE WHEN dependencies_ok AND capability_absent AND NOT capability_present THEN 'absent'
 WHEN dependencies_ok AND capability_present AND NOT capability_absent THEN 'applied' ELSE 'unknown' END,
 'recognized',dependencies_ok AND (capability_absent<>capability_present),
 'ready_to_apply',dependencies_ok AND capability_absent AND NOT capability_present,
 'dependencies_ok',dependencies_ok,'capability_absent',capability_absent,'capability_present',capability_present,
 'guards',guards,'hosted_context',retained->'hosted_context','transition_summary',transition_summary,
 'fingerprints',jsonb_build_object('dependencies',encode(sha256(convert_to((jsonb_build_object('retained',retained->'fingerprints','functions',functions,'structure',structure,'effects',effects,'service_effects',service_effects,'category_authority',category_authority,'ordinary_links',legacy_authority,'horse',horse_capability,'service_categories',service_categories,'api_roles',api_roles))::text,'UTF8')),'hex'),'capability',capability),
 'invariants',jsonb_build_object('existing_functions',existing_functions,'existing_authority',existing_authority,'immutable_structure',immutable_structure)) result FROM assessed),control_functions AS (SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind IN('f','p') AND (n.nspname='provider_controls_private' OR n.nspname||'.'||p.proname=ANY(ARRAY['public.get_marketplace_listings','public.get_marketplace_listings_nearby','public.get_my_provider_control_v1','public.get_store_by_slug','public.hidden_provider_ids_for_viewer_v1','public.list_my_provider_controls_v1','public.listing_images','public.listing_translations','public.search_public_listings_v1','public.search_public_listings_v2','public.search_public_marketplace_v1','public.search_public_services_v1','public.set_my_provider_control_v1']::text[]))), control_relations AS (SELECT n.nspname||'.'||c.relname name,
 jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'persistence',c.relpersistence,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
  'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(ad.adbin,ad.adrelid),
  'collation',CASE WHEN a.attcollation=0 THEN NULL ELSE a.attcollation::regcollation::text END) ORDER BY a.attnum),'[]')
  FROM pg_attribute a LEFT JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'definition',pg_get_constraintdef(q.oid),
  'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred,'local',q.conislocal,'inheritance',q.coninhcount,
  'no_inherit',q.connoinherit) ORDER BY q.conname),'[]') FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'nonstandard_not_null',(SELECT count(*) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype='n'
  AND (NOT q.convalidated OR NOT q.conislocal OR q.coninhcount<>0 OR q.connoinherit)),
 'inheritance',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY i.inhseqno),'[]') FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',ic.relname,'definition',pg_get_indexdef(i.indexrelid),
  'valid',i.indisvalid,'ready',i.indisready) ORDER BY ic.relname),'[]') FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid))
  ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND (n.nspname||'.'||c.relname=ANY(ARRAY['service_publication_private.events','service_publication_private.heads','service_publication_private.commands','service_publication_private.closed_requests','service_publication_private.gallery','service_publication_private.contact_receipts','service_publication_private.thread_context','service_publication_private.message_cards','public.services','public.service_images','horse_publication_private.thread_context']::text[]) OR NOT (t.tgrelid::regclass::text,t.tgname) IN (VALUES ('public.services','service_revision'),('public.service_images','service_gallery_authority'),('listing_publication_private.multipart_sessions','guard_service_multipart_key'),('listing_publication_private.web_images','guard_service_web_key'),('public.messages','service_message_context'),('horse_publication_private.thread_context','horse_select_context'),('service_publication_private.thread_context','service_select_context'),('service_publication_private.events','service_event_immutable'),('service_publication_private.commands','service_command_immutable'))))) structure,
 jsonb_build_object('acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'column_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('column',a.attname,'grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY a.attname,x.grantee::regrole::text,x.privilege_type),'[]') FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'permissive',q.polpermissive,'command',q.polcmd,
  'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(q.polroles) r),
  'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]')
  FROM pg_policy q WHERE q.polrelid=c.oid)) authority
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p') AND n.nspname='provider_controls_private'), measured AS MATERIALIZED (
 SELECT r.result retained,encode(sha256(convert_to((jsonb_build_object(
 'functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM control_functions),
 'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM control_relations),
 'effective',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('provider_controls_private.hidden_providers'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('provider_controls_private.hidden_providers'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege)),
 'reverse_block_index',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,
 'owner',pg_get_userbyid(c.relowner),'definition',CASE WHEN ix.indexrelid IS NOT NULL THEN pg_get_indexdef(ix.indexrelid) END,
 'valid',ix.indisvalid,'ready',ix.indisready,'unique',ix.indisunique,'options',c.reloptions) ORDER BY c.relname),'[]')
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_index ix ON ix.indexrelid=c.oid
 WHERE n.nspname='public' AND c.relname='user_blocks_blocked_blocker_idx_v1'),
 'view',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,
 'owner',pg_get_userbyid(c.relowner),'options',c.reloptions,'definition',CASE WHEN c.relkind='v' THEN pg_get_viewdef(c.oid,true) END,
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY x.grantee::regrole::text,x.privilege_type) FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'acl',a.attacl::text)
 ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped)) ORDER BY c.relname),'[]')
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='discovery_listings_v1'),
 'schema',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY x.grantee::regrole::text,x.privilege_type)
 FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)) ORDER BY n.nspname),'[]') FROM pg_namespace n WHERE n.nspname='provider_controls_private'),
 'objects',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner)) ORDER BY c.relname,c.relkind),'[]')
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='provider_controls_private'),
 'types',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.typname,'kind',t.typtype,'owner',pg_get_userbyid(t.typowner)) ORDER BY t.typname),'[]')
 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='provider_controls_private'),
 'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname||'.'||p.proname,'kind',p.prokind,
 'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='provider_controls_private' OR n.nspname||'.'||p.proname=ANY(ARRAY['public.get_marketplace_listings','public.get_marketplace_listings_nearby','public.get_my_provider_control_v1','public.get_store_by_slug','public.hidden_provider_ids_for_viewer_v1','public.list_my_provider_controls_v1','public.listing_images','public.listing_translations','public.search_public_listings_v1','public.search_public_listings_v2','public.search_public_marketplace_v1','public.search_public_services_v1','public.set_my_provider_control_v1']::text[])),
 'incoming',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'source',q.conrelid::regclass::text,'definition',pg_get_constraintdef(q.oid)) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
 FROM pg_constraint q WHERE q.contype='f' AND q.confrelid=to_regclass('provider_controls_private.hidden_providers')),
 'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rulename,'definition',pg_get_ruledef(r.oid)) ORDER BY r.rulename),'[]')
 FROM pg_rewrite r WHERE r.ev_class=to_regclass('provider_controls_private.hidden_providers')),
 'defaults',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(d.defaclrole),'kind',d.defaclobjtype,
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY x.grantee::regrole::text,x.privilege_type) FROM aclexplode(d.defaclacl) x))
 ORDER BY d.defaclrole::regrole::text,d.defaclobjtype),'[]') FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname='provider_controls_private')))::text,'UTF8')),'hex') capability,encode(sha256(convert_to(((SELECT jsonb_build_object('owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,
 'pair_index_ready',EXISTS(SELECT 1 FROM pg_index ix
 WHERE ix.indrelid=c.oid AND ix.indisunique AND ix.indisvalid AND ix.indisready AND ix.indnkeyatts=2 AND ix.indpred IS NULL AND ix.indexprs IS NULL
 AND strpos(pg_get_indexdef(ix.indexrelid),' USING btree ')>0
 AND (SELECT array_agg(a.attname::text ORDER BY key.ord) FROM unnest(ix.indkey) WITH ORDINALITY key(attnum,ord)
 JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=key.attnum WHERE key.ord<=ix.indnkeyatts)=ARRAY['blocker_id','blocked_id']::text[]),
 'primary_id_ready',EXISTS(SELECT 1 FROM pg_index ix WHERE ix.indrelid=c.oid AND ix.indisprimary AND ix.indisvalid AND ix.indisready AND ix.indnkeyatts=1
 AND (SELECT array_agg(a.attname::text) FROM unnest(ix.indkey) key(attnum) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=key.attnum)=ARRAY['id']::text[]),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'permissive',q.polpermissive,'command',q.polcmd,
 'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(q.polroles) r),
 'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]') FROM pg_policy q WHERE q.polrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]')
 FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal),
 'rules',(SELECT coalesce(jsonb_agg(pg_get_ruledef(r.oid) ORDER BY r.rulename),'[]') FROM pg_rewrite r WHERE r.ev_class=c.oid),
 'incoming',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,'definition',pg_get_constraintdef(q.oid)) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
 FROM pg_constraint q WHERE q.contype='f' AND q.confrelid=c.oid)) FROM pg_class c WHERE c.oid='public.user_blocks'::regclass))::text,'UTF8')),'hex') block_authority FROM retained r), checks AS MATERIALIZED (
 SELECT *,retained->'guards'||jsonb_build_object('retained_activity',coalesce(retained->>'state'='applied'
 AND (retained->>'recognized')::boolean AND (retained->>'dependencies_ok')::boolean
 AND retained->'fingerprints'='{"capability":"1626569c5e4407df7c40bb70261350c2e1e95a1ab490aff065da49d198a2f632","dependencies":"2efa9618fa872ff8cdfdca6fd1100fed477e464d8e7ef5f453af20cb63374578"}'::jsonb,false),
 'account_block_authority',block_authority='a7533e3bf5a49fa6d3ccbbd793746bdf4cf1565c4a6d7d024c29fdd9db8a4264') guards,
 capability='f62e31856c664d3d5ac92506b1d652cd30f499a9ce661ed5a26b5b729aaed281' capability_absent,capability='d3c84d6f27b060190000dcf0463582c269534e8eda399c22a7c25c89386ec65e' capability_present FROM measured),
 assessed AS MATERIALIZED(SELECT *,NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value<>'true'::jsonb) dependencies_ok FROM checks)
 SELECT jsonb_build_object('schema_version',1,'kind','provider-controls-v1',
 'state',CASE WHEN dependencies_ok AND capability_absent AND NOT capability_present THEN 'absent'
 WHEN dependencies_ok AND capability_present AND NOT capability_absent THEN 'applied' ELSE 'unknown' END,
 'recognized',dependencies_ok AND (capability_absent<>capability_present),'ready_to_apply',dependencies_ok AND capability_absent AND NOT capability_present,
 'dependencies_ok',dependencies_ok,'capability_absent',capability_absent,'capability_present',capability_present,
 'fingerprints',jsonb_build_object('dependencies',encode(sha256(convert_to((jsonb_build_object('retained',retained->'fingerprints','account_blocks',block_authority))::text,'UTF8')),'hex'),'capability',capability),
 'invariants',retained->'invariants','hosted_context',retained->'hosted_context','guards',guards) result FROM assessed;
 DO $after$ DECLARE before_report jsonb;after_report jsonb; BEGIN
 SELECT result INTO STRICT before_report FROM pg_temp.provider_controls_before;
 SELECT result INTO STRICT after_report FROM pg_temp.provider_controls_after;
 IF (after_report->>'state'='applied' AND (after_report->>'recognized')::boolean AND (after_report->>'dependencies_ok')::boolean
 AND after_report->'invariants'=before_report->'invariants'
 AND after_report->'fingerprints'->>'dependencies'=before_report->'fingerprints'->>'dependencies'
 AND after_report->'hosted_context'=before_report->'hosted_context') IS NOT TRUE THEN
 RAISE EXCEPTION 'PROVIDER_CONTROLS_INSTALLED_STATE_NOT_VERIFIED' USING ERRCODE='55000';END IF;
 EXCEPTION WHEN no_data_found OR too_many_rows THEN
 RAISE EXCEPTION 'PROVIDER_CONTROLS_INSTALLED_STATE_NOT_VERIFIED' USING ERRCODE='55000';END $after$;
 NOTIFY pgrst,'reload schema';SELECT result FROM provider_controls_after;COMMIT;
