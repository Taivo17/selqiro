import {createServiceCategoryFixture, actor, ids, profile, ownerRow, deferred, stamp} from '../service-store-category-fixture.mjs';
import {beginIdentityChange, finishIdentityChange} from '../../src/features/v2-shell/model/identityEvents';

const params = new URLSearchParams(location.search);
export const fixture = createServiceCategoryFixture({totalServices: params.get('scenario') === 'few' ? 2 : 85});
fixture.language = params.get('lang') === 'et' ? 'et' : 'en';fixture.ids = ids;fixture.actor = actor;fixture.profile = profile;
fixture.ownerRow = ownerRow();fixture.ownerReads = [];fixture.actorReads = 0;fixture.publicationWrites = [];fixture.routeEvents = [];fixture.nextScroll = true;
let actorGate = null;
fixture.getActor = async () => {
  fixture.actorReads++;if (actorGate) await actorGate.promise;
  if (fixture.failActorReads > 0) {fixture.failActorReads--;throw Error('Synthetic transient actor failure');}
  if (fixture.state.session?.user.id !== ids.user) throw Error('Synthetic actor mismatch');
  return {userId: ids.user, identityId: fixture.state.activeIdentity};
};
fixture.privateHttp = async (_fetch, url, init, options) => {
  const body = JSON.parse(init.body);
  if (!url.endsWith('/api/v2/service-publication/owner-read')) {fixture.publicationWrites.push({url, body});throw Error('A category save cannot write service details');}
  fixture.ownerReads.push({body, aborted: options.signal.aborted});
  if (body.serviceId !== ids.offer || body.expectedIdentityId !== ids.identity || body.expectedUserId !== ids.user || options.signal.aborted)
    throw Error('Synthetic owner context mismatch');
  return {status: 200, json: structuredClone(fixture.ownerRow)};
};
fixture.publication = {view: {phase: 'editing', message: '', result: null, confirmed: null, currentImage: null, intent: null},
  session: {inspect: async () => {}, start(...args) {fixture.publicationWrites.push(args);throw Error('Category save cannot start publication');}}};
fixture.policy = {snapshot: [], refresh() {}};
fixture.readCategories = async () => [{code: 'vehicle_machinery', parentCode: null, labelEn: 'Vehicles and machinery', labelEt: 'Sõidukid ja masinad', sortOrder: 0}];
fixture.failNextFocus = () => {fixture.failActorReads = 1;window.dispatchEvent(new Event('focus'));};
fixture.holdFocus = () => {actorGate = deferred();window.dispatchEvent(new Event('focus'));};
fixture.releaseFocus = () => {const gate = actorGate;actorGate = null;gate?.resolve();};
fixture.changeIdentity = () => {const change = beginIdentityChange(ids.user);fixture.state.activeIdentity = ids.secondIdentity;finishIdentityChange(change);};
fixture.loseNextAcknowledgement = () => fixture.intercept('set_my_service_store_categories_v1', (_call, reply) => {reply();throw Error('Synthetic lost acknowledgement');});
fixture.rejectNextRead = () => fixture.intercept('store_categories', () => ({data: null, error: {code: 'NETWORK'}, count: null}));
fixture.holdSave = () => {fixture.saveGate = fixture.holdNext('set_my_service_store_categories_v1');};
fixture.releaseSave = () => fixture.saveGate?.release();
const originalRpc = fixture.client.rpc;
fixture.client.rpc = (name, args) => {
  if (name === 'get_public_service_v1') return {abortSignal(signal) {
    fixture.publicCalls.push({name, args, signal});const row = fixture.services.find(item => item.id === args.p_service_id && item.status === 'published');
    return Promise.resolve({data: row ? {schema_version: 1, content_type: 'service', content_id: row.id, identity_id: ids.identity,
      title: row.title, description: row.description, category: row.category, subcategory: row.subcategory,
      price_type: row.price_type, price_amount: row.price_amount, currency: row.currency, country: row.country, city: row.city,
      location_label: row.location, images: [], seller_name: 'Synthetic shop', seller_slug: profile.slug, seller_type: 'private',
      published_at: row.published_at, updated_at: row.updated_at} : null, error: null});
  }};
  if (name === 'get_public_profile_marketplace_v2') return {abortSignal(signal) {
    fixture.publicCalls.push({name, args, signal});const all = [ids.offer, ids.secondOffer].map((id, i) => ({content_type: 'horse_offer', content_id: id,
      offer_type: 'sale', title: 'Stored horse ' + (i + 1), description_preview: 'Canonical horse reference',
      price: {kind: 'contact', amount: null, currency: 'EUR', period: null}, category: 'horses', subcategory: 'sale', detail_category: null,
      condition: null, country: 'EE', city: 'Paide', image_url: null, seller_name: 'Synthetic shop', seller_slug: profile.slug,
      seller_avatar_url: null, seller_type: 'private', created_at: stamp}));
    return Promise.resolve({data: {schema_version: 2, content_scope: 'public_profile_marketplace', seller_slug: profile.slug, profile_available: true,
      store_category_id: args.p_store_category_id, sort: 'newest', items: all, total_count: '2', result_limit: args.p_result_limit,
      result_offset: args.p_result_offset, has_more: false, next_offset: null, window_limit_reached: false}, error: null});
  }};
  if (name === 'get_public_profile_store_categories_v2' && args.p_content_scope === 'marketplace') return {abortSignal(signal) {
    fixture.publicCalls.push({name, args, signal});const all = fixture.state.categories.filter(row => [ids.root, ids.child].includes(row.id));
    return Promise.resolve({data: {schema_version: 2, content_scope: 'public_profile_store_categories', filter_scope: 'marketplace', seller_slug: profile.slug,
      identity_id: ids.identity, profile_available: true, items: all, total_count: String(all.length), result_limit: args.p_result_limit,
      result_offset: args.p_result_offset, has_more: false, next_offset: null, window_limit_reached: false}, error: null});
  }};
  return originalRpc(name, args);
};
if (params.get('scenario') === 'read-error') fixture.rejectNextRead();
if (params.get('scenario') === 'few') fixture.onPublicRead = (call, reply) => call.name === 'get_public_profile_store_categories_v2' ? {data: null, error: {code: 'NETWORK'}} : reply();
fixture.editUrl = '/v2/my-area/services/' + ids.offer + '/edit';

// Models Link/router history calls only. The application's hook restores all filters and scroll.
const event = 'selqiro-service-category-route';
export const locationSnapshot = () => location.pathname + location.search + location.hash;
export const subscribeLocation = callback => {window.addEventListener(event, callback);return () => window.removeEventListener(event, callback);};
const rawPush = history.pushState.bind(history), rawReplace = history.replaceState.bind(history);
const notify = kind => {fixture.routeEvents.push({kind, url: locationSnapshot()});window.dispatchEvent(new Event(event));};
history.pushState = (...args) => {rawPush(...args);notify('push');};history.replaceState = (...args) => {rawReplace(...args);notify('replace');};
history.scrollRestoration = 'manual';window.addEventListener('popstate', () => {fixture.nextScroll = true;notify('popstate');});
export function navigate(url, options = {}, replace = false) {
  fixture.nextScroll = options.scroll !== false;
  if (replace) history.replaceState({...history.state, __NA: true}, '', url);else history.pushState({__NA: true}, '', url);
}
fixture.router = {push: navigate, replace: (url, options) => navigate(url, options, true), back: () => history.back()};
fixture.navigate = navigate;
