'use strict';
const assert = require('node:assert/strict');
const {loader, deferred, root} = require('../helpers/jobs-public-loader.cjs');
const I = '11111111-1111-4111-8111-111111111111', OTHER = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333', H = '44444444-4444-4444-8444-444444444444';
const request = (extra = {}) => ({sellerSlug: 'readable-seller', storeCategoryId: null, limit: 24, offset: 0, ...extra});
const categoryRequest = (extra = {}) => ({identityId: I, sellerSlug: 'readable-seller', scope: 'marketplace', limit: 100, offset: 0, ...extra});
const category = (index, extra = {}) => ({id: 'a1000000-0000-4000-8000-' + String(index + 1).padStart(12, '0'),
  identity_id: I, name: 'Section ' + index, sort_order: index, parent_id: null, ...extra});
const card = (extra = {}) => ({content_type: 'listing', content_id: '9007199254740993', offer_type: null,
  title: 'Readable listing', description_preview: 'A public description.',
  price: {version: 1, kind: 'fixed', amount: '90071992547409.13', currency: 'EUR', legacy_text: null, legacy_amount: null},
  category: null, subcategory: null, detail_category: null, condition: 'used', country: 'Estonia', city: 'Paide',
  image_url: null, seller_name: 'Readable seller', seller_slug: 'readable-seller', seller_avatar_url: null,
  seller_type: 'private', created_at: '2026-11-24T08:00:00Z', ...extra});
const horse = (extra = {}) => card({content_type: 'horse_offer', content_id: H, offer_type: 'sale', title: 'Readable horse',
  price: {kind: 'fixed', amount: '9500.25', currency: 'EUR', period: null}, category: 'horses', subcategory: 'sale',
  condition: null, country: 'EE', image_url: '/api/v2/horse-media/' + H + '/0', ...extra});
function pagination(items, req, total = items.length) {
  const hasMore = BigInt(total) > BigInt(req.offset + req.limit), capped = hasMore && req.offset + req.limit > 100000;
  return {items, total_count: String(total), result_limit: req.limit, result_offset: req.offset,
    has_more: hasMore, next_offset: hasMore && !capped ? req.offset + req.limit : null, window_limit_reached: capped};
}
function marketplace(req = request(), {version = 2, available = true, items = [], total = items.length} = {}) {
  return {schema_version: version, content_scope: 'public_profile_marketplace', seller_slug: req.sellerSlug,
    profile_available: available, store_category_id: req.storeCategoryId, sort: 'newest', ...pagination(items, req, total)};
}
function categories(req = categoryRequest(), {available = true, items = [], total = items.length} = {}) {
  return {schema_version: 2, content_scope: 'public_profile_store_categories', filter_scope: req.scope,
    seller_slug: req.sellerSlug, identity_id: available ? req.identityId : null, profile_available: available,
    ...pagination(items, req, total)};
}
function fixture(reply, remember, overrides = {}) {
  const calls = [], denied = name => {calls.push({name}); throw new Error('Unexpected private or fallback read: ' + name);};
  const client = {from: name => denied('from.' + name), auth: new Proxy({}, {get(_object, name) {return () => denied('auth.' + String(name));}}),
    rpc(name, args) {return {abortSignal(signal) {
      assert.ok(signal instanceof AbortSignal); const call = {name, args, signal}; calls.push(call);
      return Promise.resolve().then(() => reply(call, calls.length));
    }}}};
  const load = loader({'src/shared/supabase/browserClient.ts': {supabaseBrowserClient: client}, ...overrides});
  return {calls, load, async marketplace(req = request(), signal = new AbortController().signal) {
    try {return await load('src/entities/listing/api/getPublicProfileMarketplace.ts').getPublicProfileMarketplace(req, signal);}
    finally {remember(load);}
  }, async categories(req = categoryRequest(), signal = new AbortController().signal) {
    try {return await load('src/entities/store-category/api/getPublicProfileStoreCategories.ts').getPublicProfileStoreCategories(req, signal);}
    finally {remember(load);}
  }};
}
const clone = value => JSON.parse(JSON.stringify(value));
const marketplaceArgs = req => ({p_seller_slug: req.sellerSlug, p_store_category_id: req.storeCategoryId,
  p_result_limit: req.limit, p_result_offset: req.offset});
const categoryArgs = req => ({p_seller_slug: req.sellerSlug, p_content_scope: req.scope,
  p_result_limit: req.limit, p_result_offset: req.offset});
const tick = () => new Promise(resolve => setImmediate(resolve));
module.exports = {loader, deferred, root, I, OTHER, C, H, request, categoryRequest, category, card, horse,
  marketplace, categories, fixture, clone, marketplaceArgs, categoryArgs, tick};
