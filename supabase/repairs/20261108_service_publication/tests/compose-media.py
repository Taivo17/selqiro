from pathlib import Path
import re
root=Path(__file__).resolve().parents[4]
out=Path(__file__).resolve().parents[1]
h=root/'supabase/repairs/20261108_horse_publication'
def fn(s,name):
    m=re.search(r'CREATE (?:OR REPLACE )?FUNCTION '+re.escape(name)+r'\(',s,re.I)
    assert m,name
    start=m.start(); x=s[start:]; tag=re.search(r'AS (\$\w*\$)',x,re.I); assert tag,name
    end=x.index(tag[1],tag.end())+len(tag[1]); return x[:x.index(';',end)+1]
def adapt(s):
    return s.replace('public.horse_offer_publication_events','service_publication_private.events').replace('public.horse_offer_images','public.service_images').replace('public.horse_offers','public.services').replace('horse_publication_private','service_publication_private').replace('horse_offer_id','service_id').replace('horse_offer','service').replace('horse_publication','service_publication').replace('horse_media','service_media').replace('/horse-media/','/service-media/').replace('p_offer','p_service')
s=(h/'04_media_bridge.sql').read_text(); parts=['-- Service binary adapter; retained listing/horse branches are preserved.']
parts.append(adapt(fn((h/'03_finality.sql').read_text(),'horse_publication_private.require_ready_image')))
for name in ['public.get_my_horse_publication_image_binding_v1','horse_publication_private.media_binding','public.get_public_horse_media_binding_v1','public.get_my_horse_media_binding_v1','horse_publication_private.retired_web_deleted','horse_publication_private.lock_cleanup_context','horse_publication_private.cleanup_object_eligible','public.claim_horse_publication_cleanup_v1','public.record_horse_publication_cleanup_v1','horse_publication_private.guard_image_request_key']:
    parts.append(adapt(fn(s,name)))
parts.append('''CREATE TRIGGER guard_service_multipart_key BEFORE INSERT ON listing_publication_private.multipart_sessions
 FOR EACH ROW EXECUTE FUNCTION service_publication_private.guard_image_request_key();
CREATE TRIGGER guard_service_web_key BEFORE INSERT ON listing_publication_private.web_images
 FOR EACH ROW EXECUTE FUNCTION service_publication_private.guard_image_request_key();''')
x=fn(s,'listing_publication_private.assert_non_horse_attempt_v1').replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION')
x=x.replace('BEGIN\n','''BEGIN
 IF EXISTS(SELECT 1 FROM service_publication_private.commands WHERE attempt_id=p_attempt) THEN
  RAISE EXCEPTION 'service_publication_requires_service_command' USING ERRCODE='55000';END IF;
''',1);parts.append(x)
x=fn(s,'listing_publication_private.require_attempt_policies_v1').replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION')
x=x.replace('BEGIN\n','''BEGIN
 IF EXISTS(SELECT 1 FROM service_publication_private.commands c JOIN listing_publication_private.attempts a ON a.id=c.attempt_id
 WHERE c.attempt_id=p_attempt AND a.actor_user_id=c.actor_user_id AND a.identity_id=c.identity_id
 AND a.request_key=c.request_key AND c.state='prepared') THEN RETURN service_publication_private.require_policies();END IF;
''',1);parts.append(x)
x=fn(s,'listing_publication_private.protect_attempt')
marker=' IF current_user=\'selqiro_listing_final_writer_v1\' AND OLD.state=\'open\' AND NEW.state=\'published\''
start=x.index(marker);end=x.index('END IF;',start)+len('END IF;')
branch=x[start:end].replace('horse_publication_private.attempt_publication_matches','service_publication_private.attempt_publication_matches')
x=x[:start]+branch+'\n'+x[start:];parts.append(x)
x=fn(s,'listing_publication_private.multipart_object_fully_deleted').replace('SELECT horse_publication_private.retired_web_deleted(p_id) OR','SELECT service_publication_private.retired_web_deleted(p_id) OR horse_publication_private.retired_web_deleted(p_id) OR');parts.append(x)
cap=(root/'supabase/repairs/20261108_upload_capacity/01_capacity.sql').read_text()
x=fn(cap,'listing_publication_private.upload_object_is_published_web_v1').replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION')
x=x.replace('WHERE o.id=p_object),false);','''WHERE o.id=p_object),false) OR EXISTS(
 SELECT 1 FROM service_publication_private.gallery g
 JOIN public.service_images i ON i.id=g.image_id AND i.service_id=g.service_id
 JOIN public.services svc ON svc.id=i.service_id AND svc.identity_id=i.identity_id
 JOIN service_publication_private.commands c ON c.attempt_id=g.attempt_id AND c.service_id=svc.id
 JOIN service_publication_private.events e ON e.id=c.publication_event_id AND e.service_id=svc.id
 JOIN listing_publication_private.attempts a ON a.id=c.attempt_id
 JOIN listing_publication_private.slots s ON s.id=g.slot_id AND s.attempt_id=a.id
 JOIN listing_publication_private.objects o ON o.id=g.object_id AND o.slot_id=s.id AND o.attempt_id=a.id
 JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.attempt_id=a.id
 WHERE o.id=p_object AND o.kind='web' AND o.dispatch_key IS NULL AND a.state='published' AND a.closed_at IS NOT NULL
 AND c.state='published' AND c.actor_user_id=a.actor_user_id AND c.identity_id=a.identity_id AND c.request_key=a.request_key
 AND e.actor_user_id=a.actor_user_id AND e.identity_id=a.identity_id AND e.submission_key=a.id AND e.decision='published'
 AND svc.identity_id=a.identity_id AND g.ready_id=w.ready_id AND w.state='ready' AND w.ready_at IS NOT NULL
 AND encode(g.web_sha256,'hex')=w.intent->>'web_sha256' AND g.web_bytes::text=w.intent->>'web_bytes'
 AND w.intent->>'source_sha256'=encode(s.expected_source_sha256,'hex') AND w.intent->>'source_bytes'=s.expected_source_bytes::text
 AND o.bucket_id='listing-publication-private' AND o.object_path='v1/'||a.id::text||'/'||s.id::text||'/web-v1.webp'
 AND i.original_url='/api/v2/service-media/'||a.id::text||'/'||s.ordinal::text
 AND i.medium_url=i.original_url AND i.thumb_url=i.original_url AND i.storage_path=o.object_path
 AND NOT EXISTS(SELECT 1 FROM listing_publication_private.cleanup q WHERE q.object_id=o.id));''');parts.append(x)
x=fn((root/'supabase/repairs/20261108_upload_capacity/02_account_source_cleanup.sql').read_text(),'listing_publication_private.lock_account_source_cleanup_context_v1').replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION').replace('horse_id uuid;','horse_id uuid;target_service uuid;')
marker=' SELECT c.horse_offer_id INTO horse_id'
x=x.replace(marker,''' SELECT c.service_id INTO target_service FROM service_publication_private.commands c WHERE c.attempt_id=origin_id;
 IF FOUND THEN
  PERFORM 1 FROM listing_publication_private.attempts a WHERE a.id=origin_id AND a.actor_user_id=p_user AND a.identity_id=target_identity FOR SHARE;
  PERFORM 1 FROM public.services s WHERE s.id=target_service AND s.identity_id=target_identity FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'publication_account_source_unavailable' USING ERRCODE='42501';END IF;
  PERFORM 1 FROM public.service_images i WHERE i.service_id=target_service ORDER BY i.id FOR SHARE;
  RETURN;
 END IF;
'''+marker);parts.append(x)
(out/'05_media_bridge.sql').write_text('\n\n'.join(parts)+'\n')
print('composed',len(parts),'functions/blocks')
