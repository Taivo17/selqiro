INSERT INTO auth.users(id) SELECT id FROM public.profiles;
-- Trusted synthetic mutations; never a new application writer.
UPDATE public.listings SET created_at='2026-01-01T00:00:00Z',
  image='https://example.invalid/owner-primary.jpg',category='vehicles',subcategory='cars',condition='used';
UPDATE public.listings SET title='Owner original',price_kind='fixed',price_amount=10,currency='EUR',active_until=now()+interval '90 days' WHERE id=1001;
INSERT INTO public.listings(id,user_id,identity_id,title,description,price,price_amount,status,created_at,active_until,category,subcategory,city,location,details,ai_raw) VALUES
 (1005,'11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Free ordinary','desc',NULL,NULL,'active','2026-01-01',now()+interval '1 day','vehicles','cars','Paide','Paide','{}','{"token":"OWNER_RAW_AI_SECRET"}'),
 (1006,'11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Negotiable ordinary','desc',NULL,NULL,'active','2026-01-01',now()+interval '1 day','vehicles','cars','Paide','Paide','{}',NULL),
 (1007,'11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Unspecified ordinary','desc',NULL,NULL,'active','2026-01-01',now()+interval '1 day','vehicles','cars','Paide','Paide','{}',NULL),
 (1008,'11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Legacy ordinary','desc','130.',130,'active','2026-01-01',now()+interval '1 day','vehicles','cars','Paide','Paide','{}',NULL),
 (1009,'11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Zero ordinary','desc',NULL,NULL,'active','2026-01-01',now()+interval '1 day','vehicles','cars','Paide','Paide','{}',NULL),
 (1010,'11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Expired ordinary','desc','7',7,'active','2026-01-01',now()-interval '1 day','vehicles','cars','Paide','Paide','{}',NULL),
 (1011,'11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Paused ordinary','desc','8',8,'paused','2026-01-01',now()+interval '1 day','vehicles','cars','Paide','Paide','{}',NULL),
 (1012,'11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Sold ordinary','desc','9',9,'sold','2026-01-01',NULL,'vehicles','cars','Paide','Paide','{}',NULL),
 (1013,'11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Null deadline ordinary','desc','10',10,'active','2026-01-01',NULL,'vehicles','cars','Paide','Paide','{}',NULL),
 (1014,'11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',repeat('X',513),repeat('Y',514),'11',11,'active','2026-01-01',NULL,'vehicles','cars','Paide','Paide','{"secret":"RAW_DETAILS_SECRET"}',NULL),
 (1015,'11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',NULL,NULL,NULL,NULL,NULL,'2026-01-01',NULL,NULL,NULL,NULL,NULL,'{}',NULL),
 (9007199254740993,'11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Large ID','desc','12',12,'active','2026-01-01',NULL,'vehicles','cars','Paide','Paide','{}',NULL),
 (1017,'11111111-1111-4111-8111-111111111111','dddddddd-dddd-4ddd-8ddd-dddddddddddd','Other identity same account','desc','12',12,'active','2026-01-01',NULL,'vehicles','cars','Paide','Paide','{}',NULL);
UPDATE public.listings SET price_kind='free' WHERE id=1005;
UPDATE public.listings SET price_kind='negotiable' WHERE id=1006;
UPDATE public.listings SET price_kind='unspecified' WHERE id=1007;
UPDATE public.listings SET price_kind='fixed',price_amount=0,currency='EUR' WHERE id=1009;
INSERT INTO public.store_categories(id,user_id,identity_id,name,parent_id) VALUES
 ('a0000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Root',NULL),
 ('a0000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Child','a0000000-0000-4000-8000-000000000001'),
 ('a0000000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Other',NULL),
 ('b0000000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Foreign',NULL);
INSERT INTO public.listing_store_categories(listing_id,store_category_id) VALUES
 (1001,'a0000000-0000-4000-8000-000000000001'),(1001,'a0000000-0000-4000-8000-000000000002'),
 (1005,'a0000000-0000-4000-8000-000000000002'),(1006,'a0000000-0000-4000-8000-000000000003'),
 (1002,'b0000000-0000-4000-8000-000000000001');
INSERT INTO public.horse_offers(id,identity_id,created_by_user_id,offer_type,status,title,description,price_amount,price_type,currency,
 city,region,location_text,horse_lat,horse_lng,horse_name,health_notes,behavior_notes,image_url,details,created_at,updated_at)
SELECT ('f0000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 CASE WHEN n=9 THEN 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid WHEN n=10 THEN 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid ELSE 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid END,
 '11111111-1111-4111-8111-111111111111'::uuid,
 CASE WHEN n IN(2,6,7,8,18) THEN 'wanted' WHEN n=3 THEN 'free_transfer' WHEN n=4 THEN 'lease' WHEN n=5 THEN 'co_rider' ELSE 'sale' END,
 'draft','Horse '||n,'Horse description',CASE WHEN n IN(1,4,18) THEN 1234.56 ELSE NULL END,
 CASE WHEN n=3 THEN 'free' WHEN n IN(1,18) THEN 'fixed' WHEN n=4 THEN 'from' ELSE 'contact' END,'EUR',
 'SELLER_CITY_NOT_WANTED','SELLER_REGION_NOT_WANTED','EXACT_HORSE_LOCATION_SECRET',58.123,25.456,'ownerhorse',
 'HEALTH_INTERNAL_SEARCH_ONLY','BEHAVIOR_INTERNAL_SEARCH_ONLY','https://example.invalid/horse.jpg','{}'::jsonb,
 '2026-01-02T00:00:00Z'::timestamptz,'2026-02-01T00:00:00Z'::timestamptz
FROM generate_series(1,18) n;
UPDATE public.horse_offers SET details='{"schema_version":1,"branch":"wanted","wanted":{"budget":{"mode":"maximum","amount":5000.50,"currency":"EUR"},"search_area":{"country_code":"EE","city_or_municipality":"Rapla","region":"Rapla maakond"},"private":"WANTED_SECRET"}}' WHERE id IN('f0000000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000018');
UPDATE public.horse_offers SET details='{"schema_version":1,"branch":"wanted","wanted":{"budget":{"mode":"contact","amount":null,"currency":"EUR"},"search_area":{"country_code":"EE","city_or_municipality":null,"region":null}}}' WHERE id='f0000000-0000-4000-8000-000000000006';
UPDATE public.horse_offers SET details='{"schema_version":1,"branch":"wanted","wanted":{"budget":{"mode":"maximum","amount":"INVALID","currency":"EUR"},"search_area":{"country_code":"EE","city_or_municipality":"Paide","region":null}}}' WHERE id='f0000000-0000-4000-8000-000000000007';
UPDATE public.horse_offers SET details='{"schema_version":1,"branch":"wanted","wanted":{"budget":{"mode":"maximum","amount":0,"currency":"EUR"},"search_area":{"country_code":"FI","city_or_municipality":"Helsinki","region":null}}}' WHERE id='f0000000-0000-4000-8000-000000000008';
UPDATE public.horse_offers SET status=CASE right(id::text,2) WHEN '11' THEN 'published' WHEN '12' THEN 'held_for_review' WHEN '13' THEN 'paused' WHEN '14' THEN 'closed' WHEN '15' THEN 'rejected' WHEN '16' THEN 'archived' ELSE 'published' END,
 current_publication_event_id='99000000-0000-4000-8000-000000000001',published_at=now()-interval '10 days',held_at=now()-interval '10 days',closed_at=now()-interval '9 days',rejected_at=now()-interval '9 days',archived_at=now()-interval '9 days',
 active_until=CASE WHEN right(id::text,2)='17' THEN now()-interval '1 day' ELSE now()+interval '90 days' END
WHERE id::text >= 'f0000000-0000-4000-8000-000000000011' AND id::text <= 'f0000000-0000-4000-8000-000000000017';
