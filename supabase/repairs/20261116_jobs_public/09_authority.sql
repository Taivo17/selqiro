-- New schema only; do not change Auth, roles, old function grants or defaults.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA jobs_private FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION jobs_private.contact_snapshot(uuid),jobs_private.select_context(),jobs_private.capture_message_card()
 TO selqiro_listing_contact_writer_v1;
GRANT CREATE ON SCHEMA public TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.contact_my_job_provider_v1(uuid,uuid,uuid,uuid) OWNER TO selqiro_listing_contact_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_contact_writer_v1;
REVOKE ALL ON FUNCTION public.get_jobs_capabilities_v1(),public.get_job_categories_v1(),public.get_public_job_v1(uuid),
 public.search_public_jobs_v1(text,text,text,text,text,text,text,integer,jsonb),public.get_public_profile_jobs_v1(text,integer,jsonb),
 public.get_my_jobs_v1(uuid,uuid,integer,jsonb),public.get_my_job_v1(uuid,uuid,uuid),public.get_my_job_policies_v1(uuid,uuid),
 public.get_my_job_request_v1(uuid,uuid,uuid),public.save_my_job_v1(uuid,uuid,uuid,uuid,text,jsonb,jsonb),
 public.publish_my_job_v1(uuid,uuid,uuid,uuid,text,jsonb),public.set_my_job_status_v1(uuid,uuid,uuid,uuid,text,text,text),
 public.renew_my_job_activity_v1(uuid,uuid,uuid,uuid,text,timestamptz),public.contact_my_job_provider_v1(uuid,uuid,uuid,uuid),
 public.get_my_marketplace_message_thread_v2(uuid,uuid,text,text,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_jobs_capabilities_v1(),public.get_job_categories_v1(),public.get_public_job_v1(uuid),
 public.search_public_jobs_v1(text,text,text,text,text,text,text,integer,jsonb),public.get_public_profile_jobs_v1(text,integer,jsonb)
 TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_jobs_v1(uuid,uuid,integer,jsonb),public.get_my_job_v1(uuid,uuid,uuid),
 public.get_my_job_policies_v1(uuid,uuid),public.get_my_job_request_v1(uuid,uuid,uuid),
 public.save_my_job_v1(uuid,uuid,uuid,uuid,text,jsonb,jsonb),public.publish_my_job_v1(uuid,uuid,uuid,uuid,text,jsonb),
 public.set_my_job_status_v1(uuid,uuid,uuid,uuid,text,text,text),public.renew_my_job_activity_v1(uuid,uuid,uuid,uuid,text,timestamptz),
 public.contact_my_job_provider_v1(uuid,uuid,uuid,uuid),public.get_my_marketplace_message_thread_v2(uuid,uuid,text,text,text)
 TO authenticated;
