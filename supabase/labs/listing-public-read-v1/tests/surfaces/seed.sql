-- New synthetic surface data only. Prior reader seed retained unchanged as a dependency.
UPDATE public.listings SET details='{"detailCategory":"passenger_cars","brand":"Volvo","model":"Modeltoken","vin":"PUBLIC-AUTHORED-VIN","private_note":"SECRET_DETAILS","nested":{"secret":"SECRET_NESTED"}}',
 title='surface-alpha',description='Authored 72 in and 5 km stay unchanged.',price_kind='fixed',price_amount=999999999999999999.999,currency='KWD',
 manufacturer='Public manufacturer',part_number='9007199254740993',engine='V8' WHERE id=1001;
UPDATE public.listings SET active_until='2099-01-01T00:00:00Z' WHERE id IN (1002,1003);
INSERT INTO public.listings(id,title,description,user_id,identity_id,status,active_until,created_at,price_kind,price_amount,currency,category,subcategory,details) VALUES
 (1201,'surface-second','Second','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','active','2099-01-01T00:00:00Z','2026-01-01T00:00:00Z','free',NULL,NULL,'vehicles','cars','{"detailCategory":"passenger_cars"}'),
 (1202,'surface-third','Third','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','active','2099-01-01T00:00:00Z','2025-01-01T00:00:00Z','fixed',0,'EUR','vehicles','cars','{"detailCategory":"passenger_cars"}'),
 (1203,'surface-null-expiry','Null expiry','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','active',NULL,'2025-01-01T00:00:00Z','negotiable',NULL,NULL,'vehicles','cars','{"detailCategory":"passenger_cars"}');
INSERT INTO public.store_categories(id,user_id,identity_id,name,parent_id) VALUES
 ('20000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Root',NULL),
 ('20000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Child','20000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Grandchild','20000000-0000-4000-8000-000000000002'),
 ('20000000-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Other root',NULL),
 ('20000000-0000-4000-8000-000000000005','22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Foreign root',NULL);
INSERT INTO public.listing_store_categories(listing_id,store_category_id) VALUES
 (1001,'20000000-0000-4000-8000-000000000001'),(1001,'20000000-0000-4000-8000-000000000002'),
 (1201,'20000000-0000-4000-8000-000000000003'),(1202,'20000000-0000-4000-8000-000000000004'),
 (1002,'20000000-0000-4000-8000-000000000005'),(1101,'20000000-0000-4000-8000-000000000001');
