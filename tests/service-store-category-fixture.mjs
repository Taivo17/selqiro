// Bounded relation/transport fixture. Eligibility and SQL authorization are proved separately.
import {createServiceStoreFixture, ids, actor, deferred} from './horse-store-category-fixture.mjs';
export {ids, actor, deferred};
export const stamp = '2026-11-11T10:00:00.000000+00:00';
export const emptyId = '99999999-9999-4999-8999-999999999999';
export const contentKey = Object.freeze({...actor, contentId: ids.offer});
export const profile = {identityId: ids.identity, identityType: 'private', legacyUserId: null, displayName: 'Synthetic shop', slug: 'synthetic-shop',
  bio: null, avatarUrl: null, bannerUrl: null, bannerDominantColor: null, country: 'Estonia', city: 'Paide', locationLabel: 'Paide'};
export function serviceRow(id, number = 1) {
  return {id, identity_id: ids.identity, title: 'Repair service ' + String(number).padStart(3, '0'), description: 'Saved service description ' + number,
    category: 'vehicle_machinery', subcategory: null, image_url: null, price_amount: null, currency: 'EUR', price_type: 'contact',
    country: 'Estonia', city: 'Paide', location: null, status: 'published', sort_order: 0, published_at: stamp,
    created_at: stamp, updated_at: stamp, images: []};
}
export function ownerRow() {
  return {schema_version: 1, content_type: 'service', actor_user_id: ids.user, identity_id: ids.identity, service_id: ids.offer,
    edit_revision: '7', status: 'published', content: {serviceId: ids.offer, title: 'Repair service 001', description: 'Saved service description 1',
      category: 'vehicle_machinery', subcategory: null, priceType: 'contact', priceAmount: null, currency: 'EUR', country: 'Estonia', city: 'Paide', location: null},
    images: [], policy_snapshot: [], created_at: stamp, updated_at: stamp, published_at: stamp, sort_order: 0};
}
export function createServiceCategoryFixture({totalServices = 85} = {}) {
  const fixture = createServiceStoreFixture();
  fixture.state.categories.push({id: emptyId, identity_id: ids.identity, name: 'Empty section', parent_id: null, sort_order: 3});
  fixture.services = Array.from({length: totalServices}, (_, index) => serviceRow(index === 0 ? ids.offer : index === 1 ? ids.secondOffer
    : 'c0000000-0000-4000-8000-' + String(index + 1).padStart(12, '0'), index + 1));
  fixture.profile = profile; fixture.publicCalls = []; fixture.onPublicRead = null;
  fixture.state.assignments.set(ids.offer, [ids.child]);
  for (const row of fixture.services.slice(2)) fixture.state.assignments.set(row.id, [ids.child]);
  function pagination(args, all) {
    const offset = args.p_result_offset, limit = args.p_result_limit, has_more = all.length > offset + limit;
    const window_limit_reached = has_more && offset + limit > 100000;
    return {items: all.slice(offset, offset + limit), total_count: String(all.length), result_limit: limit, result_offset: offset,
      has_more, next_offset: has_more && !window_limit_reached ? offset + limit : null, window_limit_reached};
  }
  function branch(categoryId) {
    const result = new Set(categoryId ? [categoryId] : []);
    for (let prior = -1; prior !== result.size;) {prior = result.size;for (const row of fixture.state.categories)
      if (row.identity_id === ids.identity && result.has(row.parent_id)) result.add(row.id);}
    return result;
  }
  fixture.publicReply = (name, args) => {
    const available = args.p_seller_slug === profile.slug;
    if (name === 'get_public_profile_services_v2') {
      const scope = branch(args.p_store_category_id);
      const all = available ? fixture.services.filter(row => row.status === 'published' && (args.p_store_category_id === null
        || (fixture.state.assignments.get(row.id) ?? []).some(id => scope.has(id)))) : [];
      return {schema_version: 2, content_scope: 'public_profile_services', seller_slug: args.p_seller_slug,
        identity_id: available ? ids.identity : null, profile_available: available, store_category_id: args.p_store_category_id,
        sort: 'newest', read_at: stamp, ...pagination(args, all)};
    }
    const linked = new Set(available ? fixture.services.filter(row => row.status === 'published').flatMap(row => fixture.state.assignments.get(row.id) ?? []) : []);
    for (let prior = -1; prior !== linked.size;) {prior = linked.size;for (const row of fixture.state.categories)
      if (row.identity_id === ids.identity && linked.has(row.id) && row.parent_id) linked.add(row.parent_id);}
    const all = fixture.state.categories.filter(row => row.identity_id === ids.identity && linked.has(row.id)).sort((a, b) => a.id.localeCompare(b.id));
    return {schema_version: 2, content_scope: 'public_profile_store_categories', filter_scope: args.p_content_scope,
      seller_slug: args.p_seller_slug, identity_id: available ? ids.identity : null, profile_available: available, ...pagination(args, all)};
  };
  const original = fixture.client.rpc;
  fixture.client.rpc = (name, args) => {
    if (!['get_public_profile_services_v2', 'get_public_profile_store_categories_v2'].includes(name)) return original(name, args);
    return {abortSignal(signal) {
      const call = {name, args: structuredClone(args), signal};fixture.publicCalls.push(call);
      const reply = () => ({data: structuredClone(fixture.publicReply(name, args)), error: null});
      return Promise.resolve().then(() => fixture.onPublicRead ? fixture.onPublicRead(call, reply) : reply());
    }};
  };
  return fixture;
}
