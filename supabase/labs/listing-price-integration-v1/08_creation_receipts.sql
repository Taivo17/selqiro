-- CLOSED LOCAL CANDIDATE. One small receipt per COMMITTED creation, no content copy.
-- No listing FK by design: physical removal must not release a successful request key.
-- Retention has no automatic TTL in this lab. Account erasure/retention is a launch gate.
CREATE TABLE public.listing_creation_receipts_v1 (
 actor_user_id uuid NOT NULL,
 request_key uuid NOT NULL CHECK (request_key <> '00000000-0000-0000-0000-000000000000'::uuid),
 identity_id uuid NOT NULL,
 payload_sha256 bytea NOT NULL CHECK (octet_length(payload_sha256)=32),
 listing_id bigint NOT NULL UNIQUE CHECK (listing_id>0),
 created_at timestamptz NOT NULL,
 PRIMARY KEY(actor_user_id,request_key)
);
ALTER TABLE public.listing_creation_receipts_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.listing_creation_receipts_v1 FROM PUBLIC,anon,authenticated,service_role;

-- Lock only this account's profile EXCLUSIVELY: serializes its creation requests.
-- No global lock, advisory-key collision, placeholder row or background queue.
CREATE FUNCTION public.lock_listing_creation_actor_v1(p_expected_identity_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,public,auth,pg_temp
AS $fn$
DECLARE actor uuid:=auth.uid(); active_id uuid; identity_row public.identities%ROWTYPE;
BEGIN
 IF actor IS NULL OR p_expected_identity_id IS NULL THEN
  RAISE EXCEPTION 'listing_price_identity_required' USING ERRCODE='42501';
 END IF;
 SELECT p.active_identity_id INTO active_id FROM public.profiles p WHERE p.id=actor FOR UPDATE;
 IF active_id IS NULL OR active_id IS DISTINCT FROM p_expected_identity_id THEN
  RAISE EXCEPTION 'listing_price_identity_changed' USING ERRCODE='42501';
 END IF;
 SELECT i.* INTO identity_row FROM public.identities i WHERE i.id=active_id AND i.status='active' FOR SHARE;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
 END IF;
 IF identity_row.type='business' THEN
  PERFORM 1 FROM public.business_members m WHERE m.business_account_id=identity_row.business_account_id
    AND m.user_id=actor AND m.status='active' FOR SHARE;
  IF NOT FOUND THEN
   RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
  END IF;
 END IF;
 IF public.current_user_has_identity_access(active_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
 END IF;
 RETURN active_id;
END $fn$;
REVOKE ALL ON FUNCTION public.lock_listing_creation_actor_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;
