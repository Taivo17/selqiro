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

-- Synthetic public-reader rows. Original fixture rows stay expired or receive a unique name.
UPDATE public.listings SET title='reader-alpha',description='Public description',category='vehicles',
 subcategory='cars',details='{"detailCategory":"passenger_cars","model":"Modeltoken","vin":"SECRET_VIN","private_note":"SECRET_DETAILS"}',
 country='Eesti',city='Paide',location='SECRET_ADDRESS',listing_lat=59.1234567,listing_lng=25.9999999,
 ai_raw='{"secret":"SECRET_AI"}',image='https://example.invalid/fallback.jpg',
 created_at='2026-01-01T00:00:00Z',active_until='2099-01-01T00:00:00Z' WHERE id=1001;
UPDATE public.listings SET title='reader-beta',created_at='2025-01-01T00:00:00Z' WHERE id=1002;
UPDATE public.listings SET title='reader-business',created_at='2024-01-01T00:00:00Z' WHERE id=1003;
INSERT INTO public.identity_profiles(identity_id,display_name,slug,avatar_url,contact_email,address_text) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Seller A','seller-a','https://example.invalid/avatar.jpg','SECRET_EMAIL','SECRET_PROFILE_ADDRESS'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Seller B','seller-b',NULL,NULL,NULL),('cccccccc-cccc-4ccc-8ccc-cccccccccccc','Business','biz',NULL,NULL,NULL),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','Inactive','inactive',NULL,NULL,NULL);
INSERT INTO public.listing_images(id,listing_id,original_url,thumb_url,is_primary,sort_order) VALUES
 ('01000000-0000-4000-8000-000000000001',1001,'https://example.invalid/original.jpg','https://example.invalid/primary.jpg',true,0),
 ('01000000-0000-4000-8000-000000000002',1001,'https://example.invalid/second.jpg',NULL,false,1);
INSERT INTO public.listings(id,title,user_id,identity_id,status,active_until,created_at) VALUES
 (1101,'hidden-paused','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','paused',NULL,'2026-01-02T00:00:00Z'),
 (1102,'hidden-sold','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','sold',NULL,'2026-01-02T00:00:00Z'),
 (1103,'hidden-expired','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','active','2000-01-01T00:00:00Z','2026-01-02T00:00:00Z'),
 (1104,'hidden-identity','11111111-1111-4111-8111-111111111111','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','active',NULL,'2026-01-02T00:00:00Z'),
 (1105,'hidden-no-profile','11111111-1111-4111-8111-111111111111','dddddddd-dddd-4ddd-8ddd-dddddddddddd','active',NULL,'2026-01-02T00:00:00Z');
