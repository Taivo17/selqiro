import {useSyncExternalStore} from 'react';
import {createStoreFixture, actor, key, ids} from '../managed-store-category-fixture.mjs';

export const fixture = createStoreFixture();
const listeners = new Set(), params = new URLSearchParams(location.search);
let revision = 0;
export const subscribe = listener => {listeners.add(listener);return () => listeners.delete(listener);};
export const snapshot = () => revision;
export function navigate(url) {history.pushState({}, '', url);revision++;listeners.forEach(listener => listener());}
fixture.language = params.get('lang') === 'et' ? 'et' : 'en';
fixture.actor = actor;fixture.ids = ids;fixture.basicReads = [];fixture.basicWrites = [];
fixture.publicReads = [];fixture.ownerRefreshes = 0;
fixture.route = () => location.pathname;
fixture.owner = {
  actor, receipt: {state: 'published', attempt_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', request_key: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', files_remaining: 0},
  loading: false, busy: false, error: null, gallery: null, images: [], preloadingImage: null,
  imageError: null, imageMessage: null, primaryBusyOrdinal: null, removalBusyOrdinal: null,
  retiredCleanup: null, retiredCleanupLoading: false, retiredCleanupError: null,
  refresh() {fixture.ownerRefreshes++;},
  cleanup() {throw Error('Photo cleanup is outside this category test');},
  remove() {throw Error('Listing deletion is outside this category test');},
  setPrimary() {throw Error('Photo edits are outside this category test');},
  removeImage() {throw Error('Photo edits are outside this category test');},
  runPhotoAddition() {throw Error('Photo uploads are outside this category test');},
};
export function useOwner() {useSyncExternalStore(subscribe, snapshot, snapshot);return fixture.owner;}
fixture.blockOwner = blocked => {fixture.owner.loading = blocked;revision++;listeners.forEach(listener => listener());};
fixture.basicApi = {
  async read(input, signal) {
    fixture.basicReads.push({key: input, signal});
    return {schema_version: 1, content_type: 'listing', listing_id: input.listingId, identity_id: input.identityId,
      basics: {title: 'Stored ordinary listing', description: 'Stored description', condition: 'used'},
      price: {version: 1, revision: '7', kind: 'fixed', amount: '29.5', currency: 'EUR', legacy_text: null}};
  },
  async save(input) {fixture.basicWrites.push(input);throw Error('Category save must not save listing details');},
};
fixture.profile = {identityId: ids.identity, identityType: 'private', legacyUserId: null, displayName: 'Synthetic shop', slug: 'synthetic-shop',
  bio: null, avatarUrl: null, bannerUrl: null, bannerDominantColor: null, country: 'Estonia', city: 'Paide', locationLabel: 'Paide'};
function publicItem(id) {
  return {content_type: 'listing', content_id: id, offer_type: null, title: id === '1001' ? 'Stored ordinary listing' : 'Other ordinary listing',
    description_preview: 'Synthetic public read', price: {version: 1, kind: 'fixed', amount: '29.5', currency: 'EUR', legacy_text: null, legacy_amount: null},
    category: 'vehicles', subcategory: null, detail_category: null, condition: 'used', country: 'Estonia', city: 'Paide', image_url: null,
    seller_name: 'Synthetic shop', seller_slug: 'synthetic-shop', seller_avatar_url: null, seller_type: 'private', created_at: '2026-11-10T10:00:00.000Z'};
}
function publicPage(args) {
  const branch = new Set();
  if (fixture.state.categories.some(row => row.id === args.p_store_category_id && row.identity_id === ids.identity)) {
    branch.add(args.p_store_category_id);
    for (const row of fixture.state.categories) if (branch.has(row.parent_id) && row.identity_id === ids.identity) branch.add(row.id);
  }
  const all = ['1001', '1002'].filter(id => args.p_store_category_id === null || (fixture.state.assignments.get(id) ?? []).some(value => branch.has(value)));
  return {schema_version: 2, content_scope: 'public_profile_marketplace', seller_slug: args.p_seller_slug, profile_available: true,
    store_category_id: args.p_store_category_id, sort: 'newest', items: all.slice(args.p_result_offset, args.p_result_offset + args.p_result_limit).map(publicItem),
    total_count: String(all.length), result_limit: args.p_result_limit, result_offset: args.p_result_offset, has_more: false, next_offset: null, window_limit_reached: false};
}
const transport = fixture.client;
fixture.client = {...transport,
  // The shared Supabase browser client supplies its session token to legacy public reads.
  from: name => transport.from(name).setHeader('Authorization', 'Bearer synthetic-token-A'),
  rpc(name, args) {
    if (name !== 'get_public_profile_marketplace_v2') return transport.rpc(name, args);
    return {abortSignal(signal) {fixture.publicReads.push({name, args, aborted: signal.aborted});return Promise.resolve({data: publicPage(args), error: null});}};
  },
};
fixture.loseNextAcknowledgement = () => fixture.intercept('set_my_listing_store_categories_v2', (_call, run) => {run();throw Error('Synthetic lost acknowledgement');});
fixture.rejectNextRead = () => fixture.intercept('store_categories', () => ({data: null, error: {code: 'NETWORK'}, count: null}));
if (params.get('scenario') === 'empty') fixture.state.categories = fixture.state.categories.filter(row => row.identity_id !== ids.identity);
if (params.get('scenario') === 'read-error') fixture.rejectNextRead();
fixture.navigate = navigate;fixture.editUrl = '/v2/my-area/listings/' + key.listingId + '/edit';
