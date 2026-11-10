// Same synthetic Auth/PostgREST boundary, with the existing identity presenter
// reading through the real getActiveIdentity/getListingActivityActor modules.
import { createStoreFixture, ids } from './managed-store-category-fixture.mjs';

export function createStoreReviewFixture() {
  const fixture = createStoreFixture(), transport = fixture.client;
  const token = () => fixture.state.session?.access_token;
  fixture.client = {
    ...transport,
    from: name => transport.from(name).setHeader('Authorization', `Bearer ${token() ?? ''}`),
    rpc(name, params) {
      if (name === 'get_my_active_identity_profile' || name === 'get_my_identities') {
        fixture.state.calls.push({kind: 'rpc', name, params});
        const identity = fixture.state.activeIdentity;
        return Promise.resolve({data: identity ? [{id: identity, identity_id: identity,
          display_name: identity === ids.identity ? 'Synthetic shop' : 'Second shop',
          identity_type: 'private', slug: 'synthetic-shop'}] : [], error: null});
      }
      return transport.rpc(name, params);
    },
    auth: {...transport.auth, getUser: value => transport.auth.getUser(value ?? token())},
  };
  return fixture;
}
