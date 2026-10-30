-- Additive reader only. Existing v1 readers and the controlled sender remain
-- byte-identical. Message cards always use their own persisted snapshot.
CREATE FUNCTION public.get_my_listing_conversation_v2(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_conversation_id text,p_before_message_id text DEFAULT NULL,p_attachment_listing_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint; attachment_id bigint; base jsonb;
 ch listing_contact_private.channels%ROWTYPE; items jsonb;attachment jsonb;
BEGIN
 -- Reuse the installed v1 authorization, active identity, participant, peer
 -- readiness and pagination contract. It retains its conversation SHARE lock
 -- until this transaction ends. No separate broader authority is introduced.
 base:=public.get_my_listing_conversation_v1(p_expected_user_id,p_expected_identity_id,p_conversation_id,p_before_message_id);
 cid:=listing_contact_private.positive_id(base->>'conversation_id');
 IF p_attachment_listing_id IS NOT NULL THEN attachment_id:=listing_contact_private.positive_id(p_attachment_listing_id); END IF;
 ch:=listing_contact_private.require_member(cid,p_expected_user_id,p_expected_identity_id);

 -- No listing row lock follows the conversation lock. The writer and terminal
 -- deletion lock listing -> conversation; the preview is an ordinary MVCC read.
 -- The existing send RPC independently validates/locks the chosen listing.
 -- Only the at-most-50 message IDs already authorized by v1 are augmented.
 -- Preview and stored card fields use one statement/MVCC snapshot. The retained
 -- lock fences send/contact and current-header deletion. Historical attachments
 -- may be scrubbed independently; their actual current row supplies every field.
 WITH summary AS(SELECT coalesce(jsonb_agg(entry.value||jsonb_build_object('listing',
  CASE WHEN m.listing_id IS NULL THEN NULL ELSE jsonb_build_object('id',m.listing_id::text,
   'title',m.listing_title,'image',m.listing_image,'price',m.listing_price) END)
  ORDER BY entry.ordinality),'[]'::jsonb) AS messages
  FROM jsonb_array_elements(base->'messages') WITH ORDINALITY AS entry(value,ordinality)
  JOIN public.messages m ON m.id=(entry.value->>'id')::bigint AND m.conversation_id=cid)
 SELECT s.messages,(SELECT jsonb_build_object('id',l.id::text,'title',l.title,'image',l.image,'price',l.price)
  FROM public.listings l WHERE l.id=attachment_id AND l.status='active'
   AND l.active_until IS NOT NULL AND l.active_until>clock_timestamp()
   AND ((l.user_id=ch.first_user_id AND l.identity_id=ch.first_identity_id)
    OR (l.user_id=ch.second_user_id AND l.identity_id=ch.second_identity_id))
   AND EXISTS(SELECT 1 FROM listing_publication_private.publications p WHERE p.listing_id=l.id AND p.state='published'))
 INTO items,attachment FROM summary s;

 RETURN base||jsonb_build_object('schema_version',2,'messages',items,
  'attachment_listing_id',p_attachment_listing_id,'attachment_listing',attachment);
END $f$;
-- Hosted postgres is not a superuser. PostgreSQL requires the target owner
-- to have CREATE on the function's schema during ALTER OWNER. The production
-- installer runs this grant, owner transfer and revocation in one transaction.
GRANT CREATE ON SCHEMA public TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.get_my_listing_conversation_v2(uuid,uuid,text,text,text) OWNER TO selqiro_listing_contact_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_contact_writer_v1;
REVOKE ALL ON FUNCTION public.get_my_listing_conversation_v2(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_listing_conversation_v2(uuid,uuid,text,text,text) TO authenticated;
