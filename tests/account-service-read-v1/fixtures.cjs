'use strict';
// Sample public wire records and a controlled transport; eligibility stays in SQL.
const assert = require('node:assert/strict');
const {loader, deferred, root, config, jwt, jsonResponse} = require('../helpers/jobs-public-loader.cjs');
const I = '11111111-1111-4111-8111-111111111111', OTHER = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333', S = '44444444-4444-4444-8444-444444444444';
const P = '55555555-5555-4555-8555-555555555555', IMAGE = '66666666-6666-4666-8666-666666666666';
const stamp = '2026-11-24T08:00:00.000001+00:00', media = '/api/v2/service-media/' + P + '/0';
const request = (extra = {}) => ({identityId: I, sellerSlug: 'readable-seller', storeCategoryId: null, limit: 24, offset: 0, ...extra});
const searchInput = (extra = {}) => ({query: 'repair', category: null, subcategory: null, country: null, city: null, ...extra});
const service = (extra = {}) => ({schema_version: 1, content_type: 'service', content_id: S, identity_id: I,
  title: 'Readable repair service', description: 'A public service description.', category: 'vehicle_machinery', subcategory: null,
  price_type: 'hourly', price_amount: '25.50', currency: 'EUR', country: 'Estonia', city: 'Paide', location_label: 'Paide area',
  images: [{id: IMAGE, url: media}], seller_name: 'Readable seller', seller_slug: 'readable-seller', seller_type: 'private',
  published_at: stamp, updated_at: stamp, ...extra});
const profileItem = (extra = {}) => ({id: S, identity_id: I, title: 'Readable repair service', description: 'A public service description.',
  category: 'vehicle_machinery', subcategory: null, image_url: media, price_amount: '25.50', currency: 'EUR', price_type: 'hourly',
  country: 'Estonia', city: 'Paide', location: 'Paide area', status: 'published', sort_order: 0,
  published_at: stamp, created_at: stamp, updated_at: stamp, images: [{id: IMAGE, identity_id: I, service_id: S,
    original_url: media, medium_url: null, thumb_url: null, sort_order: 0, is_primary: true, created_at: stamp}], ...extra});
function searchPage(items = [], {offset = 0, limit = 24, total = items.length} = {}) {
  const more = BigInt(total) > BigInt(offset + items.length);
  return {schema_version: 1, items, total_count: String(total), result_limit: limit, result_offset: offset,
    has_more: more, next_offset: more ? offset + items.length : null};
}
function profileWire(req = request(), {version = 2, available = true, items = [], total = items.length} = {}) {
  const base = {schema_version: version, content_scope: 'public_profile_services', seller_slug: req.sellerSlug,
    identity_id: available ? req.identityId : null, profile_available: available, result_limit: req.limit, read_at: stamp, items};
  if (version === 1) return base;
  const more = BigInt(total) > BigInt(req.offset + req.limit), capped = more && req.offset + req.limit > 100000;
  return {...base, store_category_id: req.storeCategoryId, sort: 'newest', total_count: String(total), result_offset: req.offset,
    has_more: more, next_offset: more && !capped ? req.offset + req.limit : null, window_limit_reached: capped};
}
const searchArgs = (input, offset = 0, limit = 24) => ({p_query: input.query.trim(), p_category: input.category || null,
  p_subcategory: input.subcategory || null, p_country: input.country || null, p_city: input.city?.trim() || null,
  p_result_limit: limit, p_result_offset: offset});
const profileArgs = req => ({p_seller_slug: req.sellerSlug, p_store_category_id: req.storeCategoryId,
  p_result_limit: req.limit, p_result_offset: req.offset});
function fixture(reply, remember, overrides = {}) {
  const calls = [], denied = name => {calls.push({name}); throw new Error('Unexpected private or fallback read: ' + name);};
  const client = {from: name => denied('from.' + name),
    auth: new Proxy({}, {get(_object, name) {return () => denied('auth.' + String(name));}}),
    rpc(name, args) {
      function perform(signal) {
        const call = {name, args, signal}; calls.push(call);
        return Promise.resolve().then(() => reply(call, calls.length));
      }
      return {abortSignal(signal) {assert.ok(signal instanceof AbortSignal); return perform(signal);},
        then(resolve, reject) {return perform(null).then(resolve, reject);}};
    }};
  const load = loader({'src/shared/supabase/browserClient.ts': {supabaseBrowserClient: client}, ...overrides});
  async function run(file, name, args) {try {return await load(file)[name](...args);} finally {remember(load);}}
  return {calls, load,
    detail: (id = S, signal = new AbortController().signal) => run('src/entities/service/api/getPublicService.ts', 'getPublicService', [id, signal]),
    search: (input = searchInput(), offset = 0, signal = new AbortController().signal, limit = 24) =>
      run('src/entities/service/api/getPublicService.ts', 'searchPublicServices', [input, offset, signal, limit]),
    profile: (req = request(), signal = new AbortController().signal) =>
      run('src/entities/service/api/getPublicProfileServices.ts', 'getPublicProfileServices', [req, signal]),
    legacyProfile: (req = request()) => run('src/entities/service/api/getPublicServices.ts', 'getPublicServices', [req]),
    categories: (req = request(), signal = new AbortController().signal) =>
      run('src/entities/store-category/api/getPublicProfileStoreCategories.ts', 'getPublicProfileStoreCategories', [req, signal]),
    window: (input, loadedOffset, targetOffset, signal, current) =>
      run('src/features/service-detail/model/readPublicServiceWindow.ts', 'readPublicServiceWindow', [input, loadedOffset, targetOffset, signal, current]),
  };
}
async function withLocalIntegration(run) {
  const names = ['NODE_ENV', 'NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION', 'NEXT_PUBLIC_SUPABASE_URL'];
  const prior = new Map(names.map(name => [name, process.env[name]]));
  process.env.NODE_ENV = 'test'; process.env.NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION = 'v1';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  try {return await run();} finally {for (const [name, value] of prior) {if (value === undefined) delete process.env[name]; else process.env[name] = value;}}
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const clone = value => JSON.parse(JSON.stringify(value));
const uniqueService = index => service({content_id: 'a1000000-0000-4000-8000-' + String(index + 1).padStart(12, '0')});
module.exports = {loader, deferred, root, config, jwt, jsonResponse, I, OTHER, C, S, P, IMAGE, stamp, media,
  request, searchInput, service, profileItem, searchPage, profileWire, searchArgs, profileArgs,
  fixture, withLocalIntegration, tick, clone, uniqueService};
