// Synthetic boundary only. Production My Area, actor confirmation and management stay real.
import {createManagementFixture, actor, ids, deferred} from '../store-category-management-fixture.mjs';
import {beginIdentityChange, finishIdentityChange} from '../../src/features/v2-shell/model/identityEvents';
export {actor, ids};

export const fixture = createManagementFixture();
const params = new URLSearchParams(location.search), transport = fixture.client;
fixture.language = (params.get('language') ?? params.get('lang')) === 'et' ? 'et' : 'en';
fixture.actor = actor; fixture.ids = ids;
const authorization = () => `Bearer ${fixture.state.session?.access_token ?? ''}`;
fixture.client = {
  ...transport,
  // Supabase normally attaches its session token. Explicit per-operation headers still override this default.
  from: name => transport.from(name).setHeader('Authorization', authorization()),
  rpc: (name, args) => transport.rpc(name, args).setHeader('Authorization', authorization()),
  auth: {...transport.auth, getUser: token => transport.auth.getUser(token ?? fixture.state.session?.access_token)},
};
fixture.state.listings = fixture.state.listings.map(row => ({...row, title: `Stored listing ${row.id}`,
  description: 'Keep the original listing description.', images: [`synthetic-photo-${row.id}`]}));
if (params.get('empty') === '1') {
  const removed = new Set(fixture.state.categories.filter(row => row.identity_id === ids.identity).map(row => row.id));
  fixture.state.categories = fixture.state.categories.filter(row => !removed.has(row.id));
  for (const id of removed) fixture.state.creators.delete(id);
  for (const [listingId, links] of fixture.state.assignments) fixture.state.assignments.set(listingId, links.filter(id => !removed.has(id)));
}
let nextIdentityGate = null;
fixture.getIdentity = () => {
  if (!fixture.state.session?.user) return null;
  const second = fixture.state.activeIdentity === ids.secondIdentity;
  const value = {id: fixture.state.activeIdentity, type: 'private', displayName: second ? 'Second shop' : 'Test shop',
    avatarUrl: null, slug: second ? 'second-shop' : 'test-shop'};
  const gate = nextIdentityGate; nextIdentityGate = null;
  if (!gate) return value;
  gate.entered.resolve(); return gate.released.promise.then(() => value);
};
// Gives the focus case a bounded, explicit pause inside its identity presentation boundary.
fixture.holdIdentity = () => {
  const gate = {entered: deferred(), released: deferred()}; nextIdentityGate = gate;
  return {entered: gate.entered.promise, release: gate.released.resolve};
};
fixture.loseNextReply = () => fixture.mutateNext((_call, run) => {run(); throw Error('Synthetic lost acknowledgement after commit');});
fixture.rejectNextRead = () => fixture.intercept('store_categories', () => ({data: null, error: {code: 'NETWORK'}, count: null}));
fixture.switchIdentity = (identityId = ids.secondIdentity) => {
  const change = beginIdentityChange(fixture.state.session.user.id);
  fixture.state.activeIdentity = identityId;
  return finishIdentityChange(change);
};
fixture.inspect = () => JSON.parse(JSON.stringify({
  categories: fixture.state.categories, assignments: Object.fromEntries(fixture.state.assignments), listings: fixture.state.listings,
  writes: fixture.state.managementWrites, commands: fixture.state.managementCommands.map(({name, params}) => ({name, params})),
}));
window.managementFixture = fixture;
