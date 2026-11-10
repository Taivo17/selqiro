import {createHorseStoreFixture, actor, key, ids, deferred} from '../horse-store-category-fixture.mjs';
import {beginIdentityChange, finishIdentityChange} from '../../src/features/v2-shell/model/identityEvents';

export const fixture = createHorseStoreFixture();
const listeners = new Set(), params = new URLSearchParams(location.search);
let revision = 0, actorGate = null;
export const subscribe = listener => {listeners.add(listener);return () => listeners.delete(listener);};
export const snapshot = () => revision;
export function navigate(url) {history.pushState({}, '', url);revision++;listeners.forEach(listener => listener());}
fixture.language = params.get('lang') === 'et' ? 'et' : 'en';
fixture.actor = actor;fixture.ids = ids;fixture.ownerReads = [];fixture.actorReads = 0;fixture.publicReads = [];fixture.publicationWrites = [];
fixture.ownerRow = {
  content_type: 'horse_offer', content_id: ids.offer, offer_id: ids.offer, identity_id: ids.identity,
  offer_type: 'sale', status: 'published', market_country_code: 'EE', horse_location_country_code: 'EE',
  title: 'Stored horse listing', description: 'Stored horse description', price_amount: null, price_type: 'contact', currency: 'EUR',
  image_url: null, horse_name: null, birth_year: null, sex: null, breed: null, color: null, height_cm: null,
  discipline: null, training_level: null, suitability: null, health_notes: null, behavior_notes: null,
  city: 'Paide', region: null, location_text: null, horse_lat: null, horse_lng: null,
  details: {schema_version: 1, branch: 'specific'}, published_at: '2026-11-10T10:00:00Z',
  held_at: null, paused_at: null, closed_at: null, rejected_at: null, archived_at: null,
  active_until: '2027-02-08T10:00:00Z', created_at: '2026-11-10T10:00:00Z', updated_at: '2026-11-10T10:00:00Z',
  images: [], edit_revision: '7', saved_confirmation: null,
};
fixture.getActor = async expectedUserId => {
  fixture.actorReads++;
  if (actorGate) await actorGate.promise;
  if (expectedUserId !== fixture.state.session?.user.id) throw Error('Synthetic owner actor mismatch');
  return {userId: expectedUserId, identityId: fixture.state.activeIdentity};
};
fixture.ownerRequest = async (input, action, body, signal) => {
  if (action !== 'owner-read') {fixture.publicationWrites.push({input, action, body});throw Error('Category save cannot publish or update content');}
  fixture.ownerReads.push({input, body, aborted: signal.aborted});return structuredClone(fixture.ownerRow);
};
fixture.publication = {
  view: {phase: 'editing', message: '', result: null, confirmed: null, currentImage: null, intent: null},
  session: {start(...args) {fixture.publicationWrites.push(args);throw Error('Category save cannot start publication');}},
};
fixture.holdFocus = () => {actorGate = deferred();window.dispatchEvent(new Event('focus'));};
fixture.releaseFocus = () => {const gate = actorGate;actorGate = null;gate?.resolve();};
fixture.changeIdentity = () => {const change = beginIdentityChange(ids.user);fixture.state.activeIdentity = ids.secondIdentity;finishIdentityChange(change);};
fixture.loseNextAcknowledgement = () => fixture.intercept('set_my_horse_offer_store_categories_v1', (_call, run) => {run();throw Error('Synthetic lost acknowledgement');});
fixture.rejectNextRead = () => fixture.intercept('store_categories', () => ({data: null, error: {code: 'NETWORK'}, count: null}));
fixture.holdSave = () => {fixture.saveGate = fixture.holdNext('set_my_horse_offer_store_categories_v1');};
fixture.releaseSave = () => fixture.saveGate?.release();
fixture.profile = {identityId: ids.identity, identityType: 'private', legacyUserId: null, displayName: 'Synthetic shop', slug: 'synthetic-shop',
  bio: null, avatarUrl: null, bannerUrl: null, bannerDominantColor: null, country: 'Estonia', city: 'Paide', locationLabel: 'Paide'};
function publicItem(id) {
  return {content_type: 'horse_offer', content_id: id, offer_type: 'sale', title: id === ids.offer ? 'Stored horse listing' : 'Other horse listing',
    description_preview: 'Synthetic public horse', price: {kind: 'contact', amount: null, currency: 'EUR', period: null},
    category: 'horses', subcategory: 'sale', detail_category: null, condition: null, country: 'EE', city: 'Paide', image_url: null,
    seller_name: 'Synthetic shop', seller_slug: 'synthetic-shop', seller_avatar_url: null, seller_type: 'private', created_at: '2026-11-10T10:00:00.000Z'};
}
function publicPage(args) {
  const branch = new Set();
  if (fixture.state.categories.some(row => row.id === args.p_store_category_id && row.identity_id === ids.identity)) {
    branch.add(args.p_store_category_id);
    for (const row of fixture.state.categories) if (branch.has(row.parent_id) && row.identity_id === ids.identity) branch.add(row.id);
  }
  const all = [ids.offer, ids.secondOffer].filter(id => args.p_store_category_id === null || (fixture.state.assignments.get(id) ?? []).some(value => branch.has(value)));
  return {schema_version: 2, content_scope: 'public_profile_marketplace', seller_slug: args.p_seller_slug, profile_available: true,
    store_category_id: args.p_store_category_id, sort: 'newest', items: all.slice(args.p_result_offset, args.p_result_offset + args.p_result_limit).map(publicItem),
    total_count: String(all.length), result_limit: args.p_result_limit, result_offset: args.p_result_offset, has_more: false, next_offset: null, window_limit_reached: false};
}
const transport = fixture.client;
fixture.client = {...transport,
  from: name => transport.from(name).setHeader('Authorization', 'Bearer synthetic-token-A'),
  rpc(name, args) {
    if (name !== 'get_public_profile_marketplace_v2') return transport.rpc(name, args);
    return {abortSignal(signal) {fixture.publicReads.push({name, args, aborted: signal.aborted});return Promise.resolve({data: publicPage(args), error: null});}};
  },
};
if (params.get('scenario') === 'read-error') fixture.rejectNextRead();
fixture.navigate = navigate;fixture.editUrl = '/v2/my-area/horse-offers/' + key.offerId + '/edit';
