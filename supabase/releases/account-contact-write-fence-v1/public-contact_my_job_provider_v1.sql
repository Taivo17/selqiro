CREATE OR REPLACE FUNCTION public.contact_my_job_provider_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,p_job_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE old jobs_private.contact_receipts%ROWTYPE;s jsonb;card jsonb;owner_user uuid;owner_identity uuid;
 cid bigint;candidate bigint;first_u uuid;first_i uuid;second_u uuid;second_i uuid;t timestamptz;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM listing_contact_private.require_key(p_request_key);
 IF p_job_id IS NULL THEN RAISE EXCEPTION 'job_contact_input' USING ERRCODE='22023';END IF;
 SELECT * INTO old FROM jobs_private.contact_receipts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND THEN
  IF old.identity_id<>p_expected_identity_id OR old.job_id<>p_job_id THEN
   RAISE EXCEPTION 'job_contact_request_conflict' USING ERRCODE='22023';END IF;
  PERFORM listing_contact_private.require_member(old.conversation_id,p_expected_user_id,p_expected_identity_id);
  RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'request_key',p_request_key,'job_id',p_job_id,'conversation_id',old.conversation_id::text,'replayed',true);
 END IF;
 s:=jobs_private.contact_snapshot(p_job_id);card:=s->'card';
 owner_user:=(s->>'user_id')::uuid;owner_identity:=(s->>'identity_id')::uuid;
 IF owner_user=p_expected_user_id OR owner_identity=p_expected_identity_id THEN
 RAISE EXCEPTION 'job_contact_self' USING ERRCODE='42501';END IF;
 PERFORM listing_contact_private.require_peer(owner_user,owner_identity);
 PERFORM listing_contact_private.require_available_accounts_v1(p_expected_user_id,owner_user);
 PERFORM listing_contact_private.require_unblocked(p_expected_user_id,owner_user);
 IF p_expected_user_id<owner_user THEN first_u:=p_expected_user_id;first_i:=p_expected_identity_id;second_u:=owner_user;second_i:=owner_identity;
 ELSE first_u:=owner_user;first_i:=owner_identity;second_u:=p_expected_user_id;second_i:=p_expected_identity_id;END IF;
 candidate:=nextval('public.conversations_id_seq');
 INSERT INTO listing_contact_private.channels(conversation_id,first_user_id,first_identity_id,second_user_id,second_identity_id)
 VALUES(candidate,first_u,first_i,second_u,second_i) ON CONFLICT(first_user_id,first_identity_id,second_user_id,second_identity_id) DO NOTHING
 RETURNING conversation_id INTO cid;
 t:=clock_timestamp();
 IF cid IS NOT NULL THEN
  INSERT INTO public.conversations(id,listing_id,listing_title_snapshot,listing_image_snapshot,listing_price_snapshot,
  created_by,created_at,updated_at,buyer_id,seller_id,buyer_identity_id,seller_identity_id) OVERRIDING SYSTEM VALUE
  VALUES(cid,NULL,card->>'title',NULL,NULL,p_expected_user_id,t,t,p_expected_user_id,owner_user,p_expected_identity_id,owner_identity);
  INSERT INTO public.conversation_participants(conversation_id,user_id,identity_id,last_read_at)
  VALUES(cid,p_expected_user_id,p_expected_identity_id,t),(cid,owner_user,owner_identity,NULL);
 ELSE
  SELECT conversation_id INTO cid FROM listing_contact_private.channels WHERE first_user_id=first_u AND first_identity_id=first_i
  AND second_user_id=second_u AND second_identity_id=second_i;
  PERFORM 1 FROM public.conversations WHERE id=cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_contact_unavailable' USING ERRCODE='42501';END IF;
  PERFORM listing_contact_private.require_member(cid,p_expected_user_id,p_expected_identity_id);
  UPDATE public.conversations SET listing_id=NULL,listing_title_snapshot=card->>'title',listing_image_snapshot=NULL,
  listing_price_snapshot=NULL,updated_at=t,archived_at=NULL WHERE id=cid;
  UPDATE public.conversation_participants SET deleted_at=NULL
  WHERE conversation_id=cid AND user_id=p_expected_user_id AND identity_id=p_expected_identity_id;
 END IF;
 INSERT INTO jobs_private.thread_context(conversation_id,job_id,card) VALUES(cid,p_job_id,card)
 ON CONFLICT(conversation_id) DO UPDATE SET job_id=excluded.job_id,card=excluded.card;
 INSERT INTO jobs_private.contact_receipts(actor_user_id,request_key,identity_id,job_id,conversation_id)
 VALUES(p_expected_user_id,p_request_key,p_expected_identity_id,p_job_id,cid);
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
 'request_key',p_request_key,'job_id',p_job_id,'conversation_id',cid::text,'replayed',false);
END $f$;
