begin;
-- Separate extension after the committed title/description foundation.
-- The earlier migration is preserved byte-for-byte and is required first.
do $precondition$
begin
  if not exists (
    select 1 from pg_catalog.pg_proc p
    where p.oid = to_regprocedure('public.search_public_listings_v1(text,text,text,text,text,text,integer,integer)')
      and p.prosecdef and p.provolatile = 's'
      and p.proowner = (select oid from pg_catalog.pg_roles where rolname = 'postgres')
      and p.proconfig = array['search_path=pg_catalog, public, auth, pg_temp']
      and md5(p.prosrc) = 'f613f2401edb06eb3e35836284bfea35'
  ) then
    raise exception 'listing_search_exact_foundation_required';
  end if;
end;
$precondition$;

create function public.public_listing_search_document_v1(
  p_title text, p_description text, p_category text, p_subcategory text, p_details jsonb
)
returns tsvector
language plpgsql immutable parallel safe security invoker
set search_path = pg_catalog, pg_temp
as $document$
declare
  -- Frozen registry copied from the reviewed source allowlist. No table/HTTP/AI reads.
  -- A new registry version requires a new function/index or an explicit index rebuild.
  v_policy constant jsonb := $policy${"vehicles":{"cars":{"passenger_cars":["brand","model","year","generation","fuel","engine","power","gearbox","drivetrain","mileage","body_type","doors","seats","color","inspection_valid_until"],"suv_offroad":["brand","model","year","generation","fuel","engine","power","gearbox","drivetrain","mileage","body_type","doors","seats","color","inspection_valid_until"],"vans_minibuses":["brand","model","year","generation","fuel","engine","power","gearbox","drivetrain","mileage","body_type","doors","seats","color","inspection_valid_until"],"pickup_trucks":["brand","model","year","generation","fuel","engine","power","gearbox","drivetrain","mileage","body_type","doors","seats","color","inspection_valid_until"],"motorhomes_campers":["brand","model","year","generation","fuel","engine","power","gearbox","drivetrain","mileage","body_type","doors","seats","color","inspection_valid_until","sleeping_places","length","gross_weight","equipment"],"racing_vehicles":["brand","model","year","generation","fuel","engine","power","gearbox","drivetrain","mileage","body_type","doors","seats","color","inspection_valid_until","discipline","roll_cage","homologation","track_street_legal"]},"motorcycles":{"sport_bikes":["brand","model","year","engine_size","power","fuel","mileage","transmission","type","inspection_valid_until"],"cruisers":["brand","model","year","engine_size","power","fuel","mileage","transmission","type","inspection_valid_until"],"touring":["brand","model","year","engine_size","power","fuel","mileage","transmission","type","inspection_valid_until"],"enduro_mx":["brand","model","year","engine_size","power","fuel","mileage","transmission","type","inspection_valid_until"],"scooters":["brand","model","year","engine_size","power","fuel","mileage","transmission","type","inspection_valid_until"],"atv_utv":["brand","model","year","engine_size","power","fuel","mileage","transmission","type","inspection_valid_until","drivetrain","winch","road_legal"],"snowmobiles":["brand","model","year","engine_size","power","mileage","track_length","electric_start"]},"trucks_commercial":{"trucks":["brand","model","year","fuel","engine","power","gearbox","mileage","seats","axle_configuration","gross_weight","empty_weight","payload","load_space_length","load_space_width","load_space_height","tachograph","inspection_valid_until"],"semi_trucks":["brand","model","year","fuel","engine","power","gearbox","mileage","seats","axle_configuration","gross_weight","empty_weight","payload","load_space_length","load_space_width","load_space_height","tachograph","inspection_valid_until"],"buses":["brand","model","year","fuel","engine","power","gearbox","mileage","seats","axle_configuration","gross_weight","empty_weight","payload","load_space_length","load_space_width","load_space_height","tachograph","inspection_valid_until"],"commercial_trailers":["brand","model","year","trailer_type","length","width","height","gross_weight","empty_weight","payload","axles","brake_type","inspection_valid_until"]},"agricultural_heavy_machinery":{"tractors":["brand","model","year","machine_type","engine","power","working_hours","fuel","drivetrain_tracks","weight","attachment_type","hydraulics","seats"],"harvesters":["brand","model","year","machine_type","engine","power","working_hours","fuel","drivetrain_tracks","weight","attachment_type","hydraulics","header_width","crop_type"],"excavators":["brand","model","year","machine_type","engine","power","working_hours","fuel","drivetrain_tracks","weight","attachment_type","hydraulics","operating_weight","bucket_size","lift_capacity","reach"],"forestry_machinery":["brand","model","year","machine_type","engine","power","working_hours","fuel","drivetrain_tracks","weight","attachment_type","hydraulics","operating_weight","lift_capacity"],"construction_machinery":["brand","model","year","machine_type","engine","power","working_hours","fuel","drivetrain_tracks","weight","attachment_type","hydraulics","operating_weight","bucket_size","lift_capacity"],"agricultural_attachments_implements":["implement_type","brand","model","working_width","attachment_type","compatible_machine","pto_required","hydraulics_required","condition"],"agricultural_heavy_machinery_spare_parts":["part_name","manufacturer","part_number","compatible_machine","fits_brand","fits_model","condition"]},"marine":{"boats":["brand","model","year","type","length","width","material","engine_type","engine_power","fuel","engine_hours","cabins","trailer_included"],"yachts":["brand","model","year","type","length","width","material","engine_type","engine_power","fuel","engine_hours","cabins","trailer_included"],"jet_skis":["brand","model","year","type","length","width","material","engine_type","engine_power","fuel","engine_hours","cabins","trailer_included"],"boat_trailers":["brand","model","year","trailer_type","length","width","height","gross_weight","empty_weight","payload","axles","brake_type","inspection_valid_until"],"outboard_motors":["brand","model","year","power","fuel","shaft_length"]},"aviation":{"airplanes":["brand","model","year","aircraft_type","engine","power","flight_hours","seats","range","maintenance_status"],"helicopters":["brand","model","year","aircraft_type","engine","power","flight_hours","seats","range","maintenance_status"],"ultralights":["brand","model","year","aircraft_type","engine","flight_hours","seats"],"drones":["brand","model","camera","flight_time","range","battery_count","condition"],"aircraft_parts":["part_name","manufacturer","part_number","compatible_aircraft","condition"]},"trailers":{"light_trailers":["brand","model","year","trailer_type","length","width","height","gross_weight","empty_weight","payload","axles","brake_type","inspection_valid_until"],"car_trailers":["brand","model","year","trailer_type","length","width","height","gross_weight","empty_weight","payload","axles","brake_type","inspection_valid_until"],"cargo_trailers":["brand","model","year","trailer_type","length","width","height","gross_weight","empty_weight","payload","axles","brake_type","inspection_valid_until"],"caravans":["brand","model","year","trailer_type","length","width","height","gross_weight","empty_weight","payload","axles","brake_type","inspection_valid_until","sleeping_places","heating","kitchen","toilet_shower","awning"],"horse_livestock_trailers":["brand","model","year","trailer_type","length","width","height","gross_weight","empty_weight","payload","axles","brake_type","inspection_valid_until"]},"vehicle_parts":{"engines_engine_parts":["part_name","brand","engine_type","fits_brand","fits_model","part_number","condition"],"transmission_drivetrain":["part_name","gearbox_type","drivetrain_type","fits_brand","fits_model","part_number","condition"],"suspension_steering":["part_name","side_position","fits_brand","fits_model","part_number","condition"],"brakes":["brake_type","side_position","fits_brand","fits_model","part_number","condition"],"electrical_parts":["part_name","voltage","fits_brand","fits_model","part_number","condition"],"batteries":["battery_type","capacity","voltage","cca","brand","model","condition"],"starters_alternators":["part_type","voltage","power_rating","fits_brand","fits_model","part_number","condition"],"body_parts":["body_part_type","side_position","color","fits_brand","fits_model","condition"],"lights_lamps":["light_type","technology","side_position","fits_brand","fits_model","condition"],"interior_parts":["interior_part_type","material","color","fits_brand","fits_model","condition"],"exhaust_parts":["exhaust_part_type","material","fits_brand","fits_model","condition"],"cooling_heating":["part_type","coolant_type","fits_brand","fits_model","condition"],"fuel_system":["fuel_system_part","fuel_type","fits_brand","fits_model","part_number","condition"],"tires":["width","profile","diameter","season","brand","model","load_index","speed_index","tread_depth","quantity","dot_year"],"wheels_rims":["diameter","width","bolt_pattern","offset","center_bore","brand","model","material","quantity","condition"],"accessories":["accessory_type","brand","model","fits_brand","fits_model","part_number","condition"],"riding_racing_gear":["gear_type","brand","size","discipline","certification","material","condition"],"spare_parts":["part_name","manufacturer","part_number","oem_number","fits_brand","fits_model","fits_generation","fits_year_from","fits_year_to","fits_engine","fits_gearbox","side_position","condition"],"vehicle_for_parts":["brand","model","year","generation","fuel","engine","gearbox","drivetrain","mileage","condition","available_parts"]}},
"electronics":{"phones":{"":["brand","model","storage","ram","color","sim_type","battery_health","screen_condition","network_lock","included_accessories"]},"computers":{"":["brand","model","processor","ram","storage","graphics_card","screen_size","operating_system","battery_health","included_accessories"]},"tv_audio":{"":["brand","model","screen_size","display_type","resolution","smart_tv","audio_type","power_output","connections","remote_included"]},"cameras":{"":["brand","model","camera_type","lens_included","sensor_size","megapixels","shutter_count","video_resolution","battery_count","memory_card_included"]},"gaming":{"":["brand","model","platform","storage","controller_count","game_count","included_accessories"]},"smart_home":{"":["brand","model","device_type","compatibility","connection_type","power_type","app_support","included_accessories"]},"components":{"":["component_type","brand","model","socket_compatibility","capacity","speed","power_rating","condition"]},"electronics_accessories":{"":["accessory_type","brand","model","compatibility","connection_type","color","condition","quantity"]},"other_electronics":{"":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]}},
"real_estate":{"apartments":{"":["property_type","rooms","area","floor","total_floors","year_built","condition","heating_type","energy_class","balcony","furnished","parking","storage_room","bathroom_count"]},"houses":{"":["house_type","rooms","living_area","land_area","floors","year_built","condition","heating_type","energy_class","garage","sauna","terrace","water_supply","sewer_connection"]},"land":{"":["land_type","area","purpose","detailed_plan","electricity","water","sewer","road_access"]},"commercial_property":{"":["property_type","area","floor","purpose","parking","loading_access","heating","security"]},"garages":{"":["area","electricity","heating","security","water"]},"vacation_property":{"":["property_type","rooms","area","beds","sauna","pool","beach_access","seasonal_year_round"]}},
"clothing_fashion":{"men":{"":["category_type","brand","size","fit","color","material","condition","season","authenticity","included_accessories"]},"women":{"":["category_type","brand","size","fit","color","material","condition","season","authenticity","included_accessories"]},"kids":{"":["category_type","brand","size_age","gender","color","material","condition","season"]},"workwear":{"":["workwear_type","gender","size","industry","season","visibility_class","protection_class","condition"]},"shoes":{"":["gender","brand","model","size","color","material","condition","season","heel_height","authenticity","original_box_included"]},"watches":{"":["brand","model","movement_type","case_material","case_size","water_resistance","condition","box_papers_included","authenticity"]},"bags":{"":["brand","model","material","color","size","condition","authenticity","dust_bag_box_included"]},"jewelry":{"":["jewelry_type","brand","material","gemstone","size","weight","condition","authenticity","certificate_included"]},"other_clothing_fashion":{"":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]}},
"tools_industrial":{"power_tools":{"":["tool_type","brand","model","power_source","voltage","power_rating","battery_included","battery_count","charger_included","condition","included_accessories"]},"hand_tools":{"":["tool_type","brand","material","size","condition","set_single","included_accessories"]},"workshop_equipment":{"":["equipment_type","brand","model","power_source","voltage","capacity","dimensions","weight","condition","included_accessories"]},"industrial_equipment":{"":["equipment_type","brand","model","power_source","voltage","capacity","working_pressure","weight","dimensions","condition"]},"safety_equipment":{"":["equipment_type","brand","size","certification","condition","expiration_date","included_accessories"]},"other_tools_industrial":{"":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]}},
"home_garden":{"furniture":{"":["furniture_type","brand","material","color","dimensions","assembly_required","condition","included_accessories"]},"appliances":{"":["appliance_type","brand","model","energy_class","power_source","capacity","dimensions","condition","warranty_remaining","included_accessories"]},"garden_tools":{"":["tool_type","brand","model","power_source","voltage","battery_included","condition","included_accessories"]},"plants_seedlings":{"":["plant_type","variety","quantity","pot_size","growth_stage","organic"]},"seeds":{"":["seed_type","variety","quantity","package_weight","sowing_season","organic"]},"crops_produce":{"":["produce_type","variety","quantity","unit","harvest_date","organic"]},"farm_supplies":{"":["supply_type","brand","quantity","material","intended_use","condition"]},"animal_feed":{"":["feed_type","animal_type","quantity","package_weight","ingredients","expiry_date"]},"greenhouses":{"":["greenhouse_type","material","length","width","height","frame_material","condition"]},"decor":{"":["decor_type","material","color","style","dimensions","condition"]},"lighting":{"":["lighting_type","brand","power_source","bulb_type","color_temperature","smart_lighting_support","condition","included_accessories"]},"kitchenware":{"":["item_type","brand","material","color","size","dimensions","capacity","condition","quantity"]},"home_textiles":{"":["item_type","brand","material","color","size","dimensions","capacity","condition","quantity"]},"household_supplies":{"":["item_type","brand","material","color","size","dimensions","capacity","condition","quantity"]},"bathroom":{"":["item_type","brand","material","color","size","dimensions","capacity","condition","quantity"]},"heating_fuels":{"":["fuel_type","wood_type","quantity","unit","moisture_level","packaging","delivery_available"]},"heating_equipment":{"":["equipment_type","brand","model","fuel_type","power","dimensions","condition","included_accessories"]},"outdoor_furniture":{"":["item_type","brand","material","color","size","dimensions","capacity","condition","quantity"]},"other_home_garden":{"":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]}},
"sports_outdoor":{"gym_equipment":{"":["equipment_type","brand","model","weight_resistance","dimensions","foldable","condition","included_accessories"]},"bicycles":{"":["bike_type","brand","model","frame_size","wheel_size","material","gear_count","suspension","brake_type","condition","included_accessories"]},"winter_sports":{"":["equipment_type","brand","model","size","binding_included","boot_size","condition","included_accessories"]},"camping":{"":["equipment_type","brand","capacity","weight","dimensions","season_rating","condition","included_accessories"]},"fishing":{"":["equipment_type","brand","model","length","power_rating","reel_included","line_included","condition","included_accessories"]},"other_sports_outdoor":{"":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]},"equestrian_horse_supplies":{"saddles_accessories":["item_type","brand","model","discipline","horse_size","seat_size","material","color","condition","included_accessories"],"bridles_halters_tack":["item_type","brand","model","discipline","horse_size","seat_size","material","color","condition","included_accessories"],"rider_clothing_safety":["item_type","brand","size","gender","discipline","safety_standard","material","color","condition"],"horse_blankets_textiles":["item_type","brand","horse_size","blanket_weight","material","color","condition"],"horse_grooming_care":["item_type","brand","horse_size","material","quantity","condition","included_accessories"],"stable_paddock_equipment":["item_type","brand","material","dimensions","capacity","quantity","condition"],"driving_carriage_equipment":["item_type","brand","model","discipline","horse_size","seat_size","material","color","condition","included_accessories"],"other_equestrian_supplies":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]}},
"antiques_collectibles":{"art":{"":["art_type","artist","title","year_period","material","dimensions","signed","certificate_included","condition","frame_included"]},"vintage":{"":["item_type","brand_maker","year_era","material","origin_country","condition","restored"]},"coins":{"":["country","year","currency","material","denomination","mint_mark","condition_grading","certificate_included"]},"military":{"":["item_type","country","era","original_reproduction","material","condition","certificate_included"]},"memorabilia":{"":["item_type","related_person_event","year_era","signed","certificate_included","condition"]},"other_antiques_collectibles":{"":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]}},
"building_materials":{"lumber":{"":["material_type","wood_type","length","width","thickness","moisture_level","treatment_type","quantity","condition"]},"concrete":{"":["material_type","strength_class","weight","bag_size","quantity","condition"]},"insulation":{"":["insulation_type","material","thickness","coverage_area","fire_rating","quantity","condition"]},"roofing":{"":["roofing_type","material","color","dimensions","coverage_area","quantity","condition"]},"plumbing":{"":["plumbing_type","material","diameter","length","compatibility","pressure_rating","condition","quantity"]},"other_building_materials":{"":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]}},
"children_baby":{"strollers_prams":{"":["item_type","brand","model","age_range","safety_standard","material","color","dimensions","condition","included_accessories"]},"child_car_seats":{"":["item_type","brand","model","age_range","safety_standard","material","color","dimensions","condition","included_accessories"]},"nursery_furniture":{"":["item_type","brand","model","age_range","safety_standard","material","color","dimensions","condition","included_accessories"]},"baby_feeding_care":{"":["item_type","brand","model","age_range","safety_standard","material","color","dimensions","condition","included_accessories"]},"baby_safety_accessories":{"":["item_type","brand","model","age_range","safety_standard","material","color","dimensions","condition","included_accessories"]},"other_children_baby":{"":["item_type","brand","model","age_range","safety_standard","material","color","dimensions","condition","included_accessories"]}},
"pet_supplies":{"dog_supplies":{"":["item_type","animal_type","brand","size","material","capacity","condition","quantity","included_accessories"]},"cat_supplies":{"":["item_type","animal_type","brand","size","material","capacity","condition","quantity","included_accessories"]},"aquariums_terrariums":{"":["item_type","animal_type","brand","size","material","capacity","condition","quantity","included_accessories"]},"cages_housing":{"":["item_type","animal_type","brand","size","material","capacity","condition","quantity","included_accessories"]},"pet_transport_grooming":{"":["item_type","animal_type","brand","size","material","capacity","condition","quantity","included_accessories"]},"other_pet_supplies":{"":["item_type","animal_type","brand","size","material","capacity","condition","quantity","included_accessories"]}},
"books_music_media":{"books":{"":["media_type","title","creator","language","publication_year","format","genre","condition","quantity"]},"magazines_comics":{"":["media_type","title","creator","language","publication_year","format","genre","condition","quantity"]},"music_movies":{"":["media_type","title","creator","language","publication_year","format","genre","condition","quantity"]},"musical_instruments":{"":["instrument_type","brand","model","material","size","condition","included_accessories"]},"instrument_accessories":{"":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]},"other_books_media":{"":["media_type","title","creator","language","publication_year","format","genre","condition","quantity"]}},
"hobbies_toys_crafts":{"toys":{"":["hobby_type","brand","age_range","material","dimensions","skill_level","condition","quantity","included_accessories"]},"board_games_puzzles":{"":["hobby_type","brand","age_range","material","dimensions","skill_level","condition","quantity","included_accessories"]},"arts_crafts":{"":["hobby_type","brand","age_range","material","dimensions","skill_level","condition","quantity","included_accessories"]},"model_rc_hobbies":{"":["hobby_type","brand","age_range","material","dimensions","skill_level","condition","quantity","included_accessories"]},"sewing_knitting":{"":["hobby_type","brand","age_range","material","dimensions","skill_level","condition","quantity","included_accessories"]},"other_hobbies_toys":{"":["hobby_type","brand","age_range","material","dimensions","skill_level","condition","quantity","included_accessories"]}},
"office_business":{"office_equipment":{"":["equipment_type","brand","model","connection_type","power_source","dimensions","condition","included_accessories"]},"printers_scanners":{"":["equipment_type","brand","model","connection_type","power_source","dimensions","condition","included_accessories"]},"office_furniture":{"":["item_type","brand","material","color","size","dimensions","capacity","condition","quantity"]},"retail_warehouse_equipment":{"":["equipment_type","brand","model","connection_type","power_source","dimensions","condition","included_accessories"]},"presentation_equipment":{"":["equipment_type","brand","model","connection_type","power_source","dimensions","condition","included_accessories"]},"other_office_business":{"":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]}}}$policy$::jsonb;
  v_text text := left(coalesce(p_title, ''), 4096) || ' ' || left(coalesce(p_description, ''), 32768);
  v_detail text := '';
  v_keys jsonb;
  v_key text;
begin
  if jsonb_typeof(p_details) = 'object' then
    -- A malformed selector must not fall back to an unrelated field family.
    if p_details ? 'detailCategory' and p_details -> 'detailCategory' <> 'null'::jsonb then
      if jsonb_typeof(p_details -> 'detailCategory') <> 'string' then
        return to_tsvector('pg_catalog.simple'::regconfig, v_text);
      end if;
      v_detail := p_details ->> 'detailCategory';
    end if;
    v_keys := v_policy -> p_category -> p_subcategory -> v_detail;
    if jsonb_typeof(v_keys) = 'array' then
      for v_key in select jsonb_array_elements_text(v_keys) loop
        -- Only the value at the exact allowed top-level key is searchable.
        -- No recursive JSON, key names, arrays, objects, nulls or boolean guessing.
        if jsonb_typeof(p_details -> v_key) in ('string', 'number') then
          v_text := v_text || ' ' || left(p_details ->> v_key, 1024);
        end if;
      end loop;
    end if;
  end if;
  return to_tsvector('pg_catalog.simple'::regconfig, v_text);
end;
$document$;
alter function public.public_listing_search_document_v1(text,text,text,text,jsonb) owner to postgres;
comment on function public.public_listing_search_document_v1(text,text,text,text,jsonb) is
  'Pure frozen v1 keyword document: bounded public title/description and explicitly reviewed category-scoped scalar detail values. Reads no tables. No arbitrary JSON, private location, AI metadata or unique identifiers. Never replace its behavior without rebuilding the dependent index.';
revoke all on function public.public_listing_search_document_v1(text,text,text,text,jsonb)
  from public, anon, authenticated, service_role;
-- This pure helper transforms only caller-provided arguments, not stored data.
-- Explicit execution also supports expression-index maintenance by ordinary writers.
grant execute on function public.public_listing_search_document_v1(text,text,text,text,jsonb)
  to anon, authenticated, service_role;

-- Ordinary CREATE INDEX is transactional but can block writers during future rollout.
-- This package runs ONLY in a new isolated helper; production requires its own gate.
create index listings_public_keywords_v1_gin on public.listings using gin
  (public.public_listing_search_document_v1(title, description, category, subcategory, details))
  where status = 'active';
comment on index public.listings_public_keywords_v1_gin is
  'Keyword GIN for public_listing_search_document_v1; expiry, identity and block eligibility are still checked at query time. Partial predicate intentionally contains no clock-dependent condition.';

create or replace function public.search_public_listings_v1(
  p_search_query text default '',
  p_category text default null,
  p_subcategory text default null,
  p_detail_category text default null,
  p_condition text default null,
  p_location_query text default '',
  p_result_limit integer default 24,
  p_result_offset integer default 0
)
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public, auth, pg_temp
-- Optional predicates must be planned using this call's actual search inputs.
-- This setting is local to the function; it does not alter the caller/session default.
set plan_cache_mode = force_custom_plan
as $function$
declare
  v_query text := btrim(coalesce(p_search_query, ''));
  v_location text := btrim(coalesce(p_location_query, ''));
  v_category text := nullif(btrim(p_category), '');
  v_subcategory text := nullif(btrim(p_subcategory), '');
  v_detail text := nullif(btrim(p_detail_category), '');
  v_condition text := nullif(btrim(p_condition), '');
  v_actor uuid := auth.uid();
  v_tsquery tsquery;
  v_result jsonb;
begin
  if char_length(v_query) > 160 or char_length(v_location) > 160 then
    raise exception 'listing_search_text_too_long' using errcode = '22023';
  end if;
  if p_result_limit is null or p_result_limit < 1 or p_result_limit > 60
    or p_result_offset is null or p_result_offset < 0 or p_result_offset > 100000 then
    raise exception 'listing_search_pagination_invalid' using errcode = '22023';
  end if;
  if (v_category is not null and (char_length(v_category) > 120 or v_category !~ '^[a-z][a-z0-9_]*$'))
    or (v_subcategory is not null and (char_length(v_subcategory) > 160 or v_subcategory !~ '^[a-z][a-z0-9_]*$'))
    or (v_detail is not null and (char_length(v_detail) > 160 or v_detail !~ '^[a-z][a-z0-9_]*$'))
    or (v_subcategory is not null and v_category is null)
    or (v_detail is not null and v_subcategory is null) then
    raise exception 'listing_search_category_path_invalid' using errcode = '22023';
  end if;
  if v_condition is not null and v_condition not in ('new', 'used', 'damaged') then
    raise exception 'listing_search_condition_invalid' using errcode = '22023';
  end if;
  -- Plain words are ANDed. No user-controlled SQL, FTS syntax or implicit AI query.
  -- The old search_vector contains raw location and arbitrary details: do not use it.
  v_tsquery := plainto_tsquery('pg_catalog.simple'::regconfig, v_query);
  with matched as materialized (
    select l.id, l.created_at, l.title, left(l.description, 280) as description_preview,
      l.price, l.price_amount, l.category, l.subcategory, l.condition, l.country, l.city,
      case when jsonb_typeof(l.details -> 'detailCategory') = 'string'
        then l.details ->> 'detailCategory' else null end as detail_category,
      l.image as fallback_image, ip.display_name as seller_name, ip.slug as seller_slug,
      ip.avatar_url as seller_avatar_url, i.type as seller_type
    from public.listings l
    join public.identities i on i.id = l.identity_id and i.status = 'active'
    join public.identity_profiles ip on ip.identity_id = i.id
    where l.status = 'active'
      and (l.active_until is null or l.active_until > now())
      and (v_query = '' or
        public.public_listing_search_document_v1(l.title, l.description, l.category, l.subcategory, l.details) @@ v_tsquery)
      and (v_category is null or l.category = v_category)
      and (v_subcategory is null or l.subcategory = v_subcategory)
      and (v_detail is null or (jsonb_typeof(l.details -> 'detailCategory') = 'string'
        and l.details ->> 'detailCategory' = v_detail))
      and (v_condition is null or l.condition = v_condition)
      and (v_location = '' or strpos(lower(coalesce(l.city, '') || ' ' || coalesce(l.country, '')), lower(v_location)) > 0)
      -- Preserve the existing account-block meaning, now before count/pagination.
      -- This is not a new business/identity-level block policy.
      and not exists (
        select 1 from public.user_blocks b
        where v_actor is not null and (
          (b.blocker_id = v_actor and b.blocked_id = l.user_id)
          or (b.blocked_id = v_actor and b.blocker_id = l.user_id)
        )
      )
  ), page as (
    select m.* from matched m
    order by m.created_at desc, m.id desc
    limit p_result_limit offset p_result_offset
  ), cards as (
    select p.id, p.created_at, jsonb_build_object(
      'content_type', 'listing', 'content_id', p.id::text,
      'title', p.title, 'description_preview', p.description_preview,
      'price', p.price,
      'price_amount', case when p.price_amount >= 0 and p.price_amount::text not in ('NaN','Infinity','-Infinity')
        then p.price_amount::text else null end,
      -- Legacy listings have no canonical currency column. Never invent EUR.
      'currency', null,
      'category', p.category, 'subcategory', p.subcategory,
      'detail_category', p.detail_category, 'condition', p.condition,
      'country', p.country, 'city', p.city,
      'image_url', coalesce(img.thumb_url, img.medium_url, img.original_url, p.fallback_image),
      'seller_name', p.seller_name, 'seller_slug', p.seller_slug,
      'seller_avatar_url', p.seller_avatar_url, 'seller_type', p.seller_type,
      'created_at', p.created_at
    ) as card
    from page p
    left join lateral (
      select li.thumb_url, li.medium_url, li.original_url from public.listing_images li
      where li.listing_id = p.id
      order by li.is_primary desc nulls last, li.sort_order asc nulls last,
        li.created_at asc nulls last, li.id asc
      limit 1
    ) img on true
  ), totals as (select count(*) as n from matched)
  select jsonb_build_object(
    'schema_version', 1, 'content_scope', 'ordinary_listings', 'sort', 'newest',
    'items', coalesce((select jsonb_agg(c.card order by c.created_at desc, c.id desc) from cards c), '[]'::jsonb),
    'total_count', t.n::text, 'result_limit', p_result_limit, 'result_offset', p_result_offset,
    'has_more', t.n > p_result_offset::bigint + p_result_limit,
    'next_offset', case when t.n > p_result_offset::bigint + p_result_limit
      and p_result_offset + p_result_limit <= 100000 then p_result_offset + p_result_limit else null end,
    'window_limit_reached', t.n > p_result_offset::bigint + p_result_limit
      and p_result_offset + p_result_limit > 100000
  ) into v_result from totals t;
  return v_result;
end;
$function$;

alter function public.search_public_listings_v1(text,text,text,text,text,text,integer,integer) owner to postgres;
comment on function public.search_public_listings_v1(text,text,text,text,text,text,integer,integer) is
  'Public ordinary-listing keyword search v1 with frozen category-scoped public scalar details and GIN support. Same minimal cards, visibility, account blocks, filters, count and newest pagination. No arbitrary details, private coordinates, raw AI, unique identifiers, currency inference or mutations. Bounded document; no synonym or range interpretation.';
revoke all on function public.search_public_listings_v1(text,text,text,text,text,text,integer,integer)
  from public, anon, authenticated, service_role;
grant execute on function public.search_public_listings_v1(text,text,text,text,text,text,integer,integer)
  to anon, authenticated, service_role;

commit;
