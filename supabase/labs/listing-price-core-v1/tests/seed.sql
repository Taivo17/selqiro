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
