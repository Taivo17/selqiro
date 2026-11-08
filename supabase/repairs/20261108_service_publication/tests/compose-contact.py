from pathlib import Path
import re
root=Path(__file__).resolve().parents[4];out=Path(__file__).resolve().parents[1]
s=(root/'supabase/repairs/20261108_horse_publication/06_contact.sql').read_text()
def fn(s,name):
 m=re.search(r'CREATE (?:OR REPLACE )?FUNCTION '+re.escape(name)+r'\(',s,re.I);assert m,name
 x=s[m.start():];tag=re.search(r'AS (\$\w*\$)',x,re.I);end=x.index(tag[1],tag.end())+len(tag[1]);return x[:x.index(';',end)+1]
def adapt(s):
 return s.replace('horse_publication_private','service_publication_private').replace('horse_offer_id','service_id').replace("'horse_offer'","'service'").replace('horse_contact','service_contact').replace('contact_my_horse_seller_v1','contact_my_service_provider_v1').replace('p_offer_id','p_service_id')
start=s.index('CREATE TABLE horse_publication_private.contact_receipts');end=s.index('-- Definer reads')
parts=[adapt(s[start:end])]
parts.append('''CREATE FUNCTION service_publication_private.contact_snapshot(p_service_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE s public.services%ROWTYPE;identity public.identities%ROWTYPE;owner_user uuid;
BEGIN
 SELECT * INTO s FROM public.services WHERE id=p_service_id FOR SHARE;
 IF NOT FOUND OR NOT service_publication_private.is_public(s.id) THEN
  RAISE EXCEPTION 'service_contact_unavailable' USING ERRCODE='42501';END IF;
 SELECT * INTO identity FROM public.identities WHERE id=s.identity_id AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_contact_unavailable' USING ERRCODE='42501';END IF;
 IF identity.type='private' THEN owner_user:=identity.user_id;
 ELSE SELECT owner_user_id INTO owner_user FROM public.business_accounts WHERE id=identity.business_account_id FOR SHARE;
 END IF;
 IF owner_user IS NULL THEN RAISE EXCEPTION 'service_contact_unavailable' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('user_id',owner_user,'identity_id',s.identity_id,
 'card',jsonb_build_object('content_type','service','id',s.id,'title',left(s.title,200),
 'image',coalesce(s.image_url,(service_publication_private.image_projection(s.id,false)->0->>'url')),'price',NULL));
END $f$;''')
x=adapt(fn(s,'public.contact_my_horse_seller_v1'))
x=re.sub(r"\s*IF \(s->>'active_until'\)::timestamptz<=t THEN RAISE EXCEPTION 'service_contact_unavailable' USING ERRCODE='42501'; END IF;",'',x)
x=x.replace("IF NOT FOUND OR (s->>'active_until')::timestamptz<=clock_timestamp() THEN", "IF NOT FOUND THEN")
parts.append(x)
parts.append(adapt(fn(s,'horse_publication_private.capture_message_card')))
parts.append('''CREATE TRIGGER service_message_context AFTER INSERT ON public.messages FOR EACH ROW
 EXECUTE FUNCTION service_publication_private.capture_message_card();
-- Each shared channel has one current marketplace context. Only that pointer
-- is superseded; historical per-message cards are immutable and remain intact.
CREATE FUNCTION service_publication_private.select_current_context() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_user<>'selqiro_listing_contact_writer_v1' THEN RAISE EXCEPTION 'service_contact_writer_required' USING ERRCODE='42501';END IF;
 IF TG_TABLE_SCHEMA='service_publication_private' THEN
  DELETE FROM horse_publication_private.thread_context WHERE conversation_id=NEW.conversation_id;
 ELSE DELETE FROM service_publication_private.thread_context WHERE conversation_id=NEW.conversation_id;END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER service_select_context AFTER INSERT OR UPDATE ON service_publication_private.thread_context
 FOR EACH ROW EXECUTE FUNCTION service_publication_private.select_current_context();
CREATE TRIGGER horse_select_context AFTER INSERT OR UPDATE ON horse_publication_private.thread_context
 FOR EACH ROW EXECUTE FUNCTION service_publication_private.select_current_context();''')
x=fn(s,'public.get_my_marketplace_message_thread_v1').replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION')
x=x.replace(' IF context IS NOT NULL THEN r:=jsonb_set(r,\'{listing}\',context); END IF;', ''' IF context IS NULL THEN
  SELECT jsonb_build_object('id',s.service_id,'title',s.card->>'title','content_type','service') INTO context
  FROM service_publication_private.thread_context s JOIN public.conversations c ON c.id=s.conversation_id AND c.listing_id IS NULL
  WHERE s.conversation_id=cid;
 END IF;
 IF context IS NOT NULL THEN r:=jsonb_set(r,'{listing}',context); END IF;''')
x=x.replace("THEN jsonb_set(m.item,'{listing}',hc.card) ELSE m.item END ORDER BY m.ordinal)","THEN jsonb_set(m.item,'{listing}',hc.card) WHEN m.item->'listing'='null'::jsonb AND sc.card IS NOT NULL THEN jsonb_set(m.item,'{listing}',sc.card) ELSE m.item END ORDER BY m.ordinal)")
x=x.replace("LEFT JOIN horse_publication_private.message_cards hc ON hc.message_id=(m.item->>'id')::bigint AND hc.conversation_id=cid;","LEFT JOIN horse_publication_private.message_cards hc ON hc.message_id=(m.item->>'id')::bigint AND hc.conversation_id=cid\n LEFT JOIN service_publication_private.message_cards sc ON sc.message_id=(m.item->>'id')::bigint AND sc.conversation_id=cid;")
parts.append(x)
(out/'07_contact.sql').write_text('\n\n'.join(parts)+'\n')
