INSERT INTO public.identities(id,type,user_id,business_account_id,display_name,status) VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','private','11111111-1111-4111-8111-111111111111',NULL,'A','active'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','private','22222222-2222-4222-8222-222222222222',NULL,'B','active'),
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','business',NULL,'99999999-9999-4999-8999-999999999999','Business','active'),('dddddddd-dddd-4ddd-8ddd-dddddddddddd','private','11111111-1111-4111-8111-111111111111',NULL,'Alt A','active'),
('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','private','11111111-1111-4111-8111-111111111111',NULL,'Inactive','inactive');
INSERT INTO public.profiles(id,active_identity_id) VALUES ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),('33333333-3333-4333-8333-333333333333','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
INSERT INTO public.business_members(business_account_id,user_id,role,status) VALUES ('99999999-9999-4999-8999-999999999999','33333333-3333-4333-8333-333333333333','member','active');
INSERT INTO public.listings(id,user_id,identity_id,title,description,price,price_amount,active_until,details,image) VALUES
(1001,'11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Original A','Description','5578',5578,'2026-01-01 00:00:00+00','{"model":"A"}','synthetic-image'),
(1002,'22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Original B','B','2',2,NULL,'{}',NULL),
(1003,'11111111-1111-4111-8111-111111111111','cccccccc-cccc-4ccc-8ccc-cccccccccccc','Business listing','Biz','3',3,NULL,'{}',NULL),
(1004,'11111111-1111-4111-8111-111111111111',NULL,'Unassigned','Legacy','4',4,NULL,'{}',NULL);

-- NEW synthetic extension. No real records or credentials are copied.
INSERT INTO public.profiles(id,active_identity_id) VALUES ('44444444-4444-4444-8444-444444444444','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
INSERT INTO public.business_members(business_account_id,user_id,role,status) VALUES ('99999999-9999-4999-8999-999999999999','44444444-4444-4444-8444-444444444444','member','active');
INSERT INTO auth.users(id) SELECT id FROM public.profiles;
INSERT INTO public.identity_profiles(identity_id,display_name,slug) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Synthetic A','release-a'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Synthetic B','release-b'),('cccccccc-cccc-4ccc-8ccc-cccccccccccc','Synthetic Business','release-business');
UPDATE public.listings SET active_until=now()+interval '1 day',created_at='2026-01-01 00:00:00+00',
 category='vehicles',subcategory='trucks_commercial',country='Estonia',city='Paide',location='Paide',
 details='{"detailCategory":"trucks","brand":"Gaz","model":"53"}',
 image='https://example.invalid/original.jpg' WHERE id<>1004;
INSERT INTO public.listings(id,user_id,identity_id,title,description,price,price_amount,active_until)
 VALUES (1005,'11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Second listing','Description','5',5,now()+interval '1 day');
INSERT INTO public.listing_images(id,listing_id,user_id,original_url,medium_url,thumb_url,sort_order,is_primary)
 VALUES ('10000000-0000-4000-8000-000000000001',1001,'11111111-1111-4111-8111-111111111111','https://example.invalid/one.jpg','https://example.invalid/one-m.jpg','https://example.invalid/one-t.jpg',0,true);
INSERT INTO public.store_categories(id,user_id,identity_id,name,parent_id) VALUES
 ('a0000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Root',NULL),('a0000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Child','a0000000-0000-4000-8000-000000000001');
INSERT INTO public.horse_offers(id,identity_id,created_by_user_id,offer_type,title,description,price_type,currency,details)
 VALUES ('f0000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','wanted','Wanted horse','Synthetic wanted','contact','EUR',
 '{"schema_version":1,"branch":"wanted","wanted":{"budget":{"mode":"maximum","amount":5000.50,"currency":"EUR"},"search_area":{"country_code":"EE","city_or_municipality":"Rapla","region":"Rapla maakond"}}}');
