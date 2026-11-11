import {createServiceCategoryFixture, actor, ids, ownerRow, deferred} from '../service-store-category-fixture.mjs';
import {beginIdentityChange, finishIdentityChange} from '../../src/features/v2-shell/model/identityEvents';

// Auth and HTTP boundaries only. The real owner hooks, APIs, parsers and activity
// controller are bundled; this fixture does not claim SQL authorization proof.
export const fixture = createServiceCategoryFixture({totalServices: 2});
const params = new URLSearchParams(location.search);
fixture.language = params.get('lang') === 'et' ? 'et' : 'en';
fixture.ids = {...ids, third: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', draft: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'};
fixture.actor = actor; fixture.calls = []; fixture.renewals = []; fixture.publicationWrites = [];
fixture.now = '2026-11-11T10:00:00.654321+00:00';
fixture.next = '2027-11-11T10:00:00.654321+00:00';
fixture.old = '2026-11-10T10:00:00.123456+00:00';
fixture.rows = new Map([
  [ids.offer, {...ownerRow(), content: {...ownerRow().content, title: 'Expired repair service'}}],
  [ids.secondOffer, {...ownerRow(), service_id: ids.secondOffer, status: 'archived',
    content: {...ownerRow().content, serviceId: ids.secondOffer, title: 'Paused repair service'}}],
  [fixture.ids.third, {...ownerRow(), service_id: fixture.ids.third,
    content: {...ownerRow().content, serviceId: fixture.ids.third, title: 'Current repair service'}}],
  [fixture.ids.draft, {...ownerRow(), service_id: fixture.ids.draft, status: 'draft', published_at: null,
    content: {...ownerRow().content, serviceId: fixture.ids.draft, title: 'Unpublished service'}}],
]);
fixture.activities = new Map([...fixture.rows].map(([id, row]) => [id, {
  active_until: row.status === 'draft' ? null : id === fixture.ids.third ? fixture.next : fixture.old,
  origin: row.status === 'draft' ? null : 'transition', last_confirmed_at: null,
}]));
fixture.validity = id => {
  const saved = fixture.activities.get(id), row = fixture.rows.get(id);
  return {...saved, is_expired: saved.active_until !== null && new Date(saved.active_until) <= new Date(fixture.now),
    can_renew: row.status !== 'draft' && saved.active_until !== null, server_now: fixture.now};
};
fixture.snapshot = id => ({schema_version: 1, content_type: 'service', actor_user_id: ids.user, identity_id: ids.identity,
  service_id: id, status: fixture.rows.get(id).status, activity: fixture.validity(id)});
fixture.ownerV2 = id => ({...structuredClone(fixture.rows.get(id)), schema_version: 2, activity: fixture.validity(id)});
const originalFrom = fixture.client.from;
// Supabase's normal browser client adds the current session bearer implicitly.
fixture.client.from = (...args) => originalFrom(...args).setHeader('Authorization', 'Bearer ' + fixture.state.session?.access_token);
const originalGetUser = fixture.client.auth.getUser;
fixture.client.auth.getUser = token => originalGetUser(token ?? fixture.state.session?.access_token);
fixture.getActor = async () => {
  if (fixture.state.session?.user.id !== ids.user) throw Error('Synthetic actor mismatch');
  return {userId: ids.user, identityId: fixture.state.activeIdentity};
};
fixture.privateHttp = async (_fetch, url, init, options) => {
  const body = JSON.parse(init.body), action = url.split('/').pop();
  fixture.calls.push({action, body});
  if (body.expectedUserId !== ids.user || body.expectedIdentityId !== ids.identity
    || fixture.state.activeIdentity !== ids.identity || options.signal.aborted) throw Error('Synthetic owner context mismatch');
  if (action === 'owner-activity-list') {
    const all = [...fixture.rows.keys()], offset = body.resultOffset, limit = body.resultLimit;
    return {status: 200, json: {schema_version: 2, actor_user_id: ids.user, identity_id: ids.identity,
      items: all.slice(offset, offset + limit).map(fixture.ownerV2), total_count: String(all.length),
      result_limit: limit, result_offset: offset, has_more: offset + limit < all.length,
      next_offset: offset + limit < all.length ? offset + limit : null}};
  }
  if (!fixture.rows.has(body.serviceId)) throw Error('Synthetic service unavailable');
  if (action === 'owner-read') return {status: 200, json: structuredClone(fixture.rows.get(body.serviceId))};
  if (action === 'owner-activity-read') return {status: 200, json: fixture.ownerV2(body.serviceId)};
  if (action === 'activity-read') {
    if (fixture.failActivityRead) {fixture.failActivityRead = false;throw Error('Synthetic transient read failure');}
    return {status: 200, json: fixture.snapshot(body.serviceId)};
  }
  if (action === 'activity-renew') {
    const record = fixture.activities.get(body.serviceId), status = fixture.rows.get(body.serviceId).status;
    fixture.renewals.push(structuredClone(body));
    if (record.active_until !== body.expectedActiveUntil) return {status: 409, json: {error: 'conflict', code: '40001', message: 'service_activity_conflict'}};
    if (status === 'draft' || record.active_until === null) return {status: 409, json: {error: 'refused', code: '22023'}};
    const changed = new Date(record.active_until) < new Date(fixture.next);
    if (changed) {record.active_until = fixture.next;record.last_confirmed_at = fixture.now;}
    const result = {status: 200, json: {...fixture.snapshot(body.serviceId), changed}};
    if (fixture.holdRenewal) await fixture.holdRenewal.promise;
    if (fixture.loseRenewal) {fixture.loseRenewal = false;throw Error('Synthetic lost response after commit');}
    return result;
  }
  if (action === 'owner-set-status') {
    const row = fixture.rows.get(body.serviceId);
    if (row.edit_revision !== body.expectedRevision || row.status !== body.expectedStatus)
      return {status: 409, json: {error: 'conflict', code: '40001'}};
    row.status = body.status;row.edit_revision = String(BigInt(row.edit_revision) + 1n);
    return {status: 200, json: {schema_version: 1, content_type: 'service', actor_user_id: ids.user, identity_id: ids.identity,
      service_id: body.serviceId, status: row.status, edit_revision: row.edit_revision, changed: true}};
  }
  fixture.publicationWrites.push({action, body});throw Error('An activity operation cannot publish content');
};
fixture.publication = {view: {phase: 'editing', message: '', result: null, confirmed: null, currentImage: null, intent: null},
  session: {inspect: async () => {}, start(...args) {fixture.publicationWrites.push(args);throw Error('Renewal cannot start publication');}}};
fixture.policy = {snapshot: [], refresh() {}};
fixture.readCategories = async () => [{code: 'vehicle_machinery', parentCode: null, labelEn: 'Vehicles and machinery', labelEt: 'Sõidukid ja masinad', sortOrder: 0}];
fixture.loseNextAcknowledgement = () => {fixture.loseRenewal = true;};
fixture.rejectNextRead = () => {fixture.failActivityRead = true;};
fixture.holdNextRenewal = () => {fixture.holdRenewal = deferred();};
fixture.releaseRenewal = () => {fixture.holdRenewal?.resolve();fixture.holdRenewal = null;};
fixture.changeIdentity = () => {const change = beginIdentityChange(ids.user);fixture.state.activeIdentity = ids.secondIdentity;finishIdentityChange(change);};
fixture.editUrl = '/v2/my-area/services/' + ids.offer + '/edit';
if (params.get('scenario') === 'read-error') fixture.failActivityRead = true;

// Documented Link/router boundary; no internal Next navigation APIs.
const event = 'selqiro-service-activity-route';
export const locationSnapshot = () => location.pathname + location.search + location.hash;
export const subscribeLocation = callback => {window.addEventListener(event, callback);return () => window.removeEventListener(event, callback);};
const rawPush = history.pushState.bind(history), rawReplace = history.replaceState.bind(history);
history.pushState = (...args) => {rawPush(...args);window.dispatchEvent(new Event(event));};
history.replaceState = (...args) => {rawReplace(...args);window.dispatchEvent(new Event(event));};
window.addEventListener('popstate', () => window.dispatchEvent(new Event(event)));
export function navigate(url, _options = {}, replace = false) {
  if (replace) history.replaceState({}, '', url);else history.pushState({}, '', url);
}
fixture.router = {push: navigate, replace: (url, options) => navigate(url, options, true), back: () => history.back()};
