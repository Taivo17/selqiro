// Synthetic authenticated transport only. Real horse UUID API/parser/hook are loaded by each harness.
// This is not a database authorization proof; the additive SQL has its own relational tests.
export const ids = Object.freeze({
  user: '11111111-1111-4111-8111-111111111111', identity: '22222222-2222-4222-8222-222222222222',
  root: '33333333-3333-4333-8333-333333333333', child: '44444444-4444-4444-8444-444444444444',
  other: '55555555-5555-4555-8555-555555555555', foreign: '66666666-6666-4666-8666-666666666666',
  offer: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', secondOffer: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  secondUser: '77777777-7777-4777-8777-777777777777', secondIdentity: '88888888-8888-4888-8888-888888888888',
});
export const actor = Object.freeze({userId: ids.user, identityId: ids.identity});
export const key = Object.freeze({...actor, offerId: ids.offer});
const copy = value => JSON.parse(JSON.stringify(value));
export function deferred() {let resolve, reject; const promise = new Promise((yes, no) => {resolve = yes; reject = no;}); return {promise, resolve, reject};}
const category = (id, name, parent_id = null, identity_id = ids.identity, sort_order = 0) => ({id, identity_id, name, sort_order, parent_id});

export function createHorseStoreFixture() {return createCanonicalStoreFixture("horse");}
export function createServiceStoreFixture() {return createCanonicalStoreFixture("service");}
function createCanonicalStoreFixture(kind) {
  const readRpc = kind === "service" ? "get_my_service_store_categories_v1" : "get_my_horse_offer_store_categories_v1";
  const saveRpc = kind === "service" ? "set_my_service_store_categories_v1" : "set_my_horse_offer_store_categories_v1";
  const idParameter = kind === "service" ? "p_service_id" : "p_offer_id", idField = kind === "service" ? "service_id" : "offer_id";
  const listeners = new Set(), interceptors = [], held = new Set();
  const state = {
    session: {access_token: 'synthetic-token-A', user: {id: ids.user}}, activeIdentity: ids.identity,
    tokens: new Map([['synthetic-token-A', ids.user], ['synthetic-token-B', ids.secondUser], ['synthetic-token-A2', ids.user]]),
    categories: [category(ids.root, 'Parts'), category(ids.child, 'Engine parts', ids.root, ids.identity, 1),
      category(ids.other, 'Tools', null, ids.identity, 2), category(ids.foreign, 'Foreign section', null, ids.secondIdentity)],
    offers: [{id: ids.offer, identity_id: ids.identity}, {id: ids.secondOffer, identity_id: ids.identity}],
    assignments: new Map([[ids.offer, []], [ids.secondOffer, [ids.other]]]),
    calls: [], writes: [], accessAllowed: true,
  };
  const error = (code, message = 'Synthetic rejected request') => ({data: null, error: {code, message}, count: null});
  function authorize(call) {
    const header = call.headers.Authorization;
    return header?.startsWith('Bearer ') ? state.tokens.get(header.slice(7)) : null;
  }
  function select(row, columns) {
    const keys = columns.split(/,(?![^()]*\))/).map(value => value.trim().split('!')[0]);
    return Object.fromEntries(keys.map(name => [name, row[name]]));
  }
  function baseReply(call) {
    const user = authorize(call), params = call.params ?? {};
    if (call.kind === 'rpc') {
      if (call.name === 'current_user_has_identity_access') return {data: user === ids.user && state.accessAllowed && params.p_identity_id === state.activeIdentity, error: null};
      if ([readRpc, saveRpc].includes(call.name)) {
        if (!user || params.p_expected_identity_id !== state.activeIdentity) return error('42501', kind + '_store_category_context_changed');
        const offer = state.offers.find(row => row.id === params[idParameter]);
        if (user !== ids.user || !state.accessAllowed || !offer || offer.identity_id !== state.activeIdentity) return error('42501', kind + '_store_category_forbidden');
        let selected = state.assignments.get(params[idParameter]) ?? [];
        const writing = call.name === saveRpc;
        if (writing) {
          if (!params.p_category_ids.every(id => state.categories.some(row => row.id === id && row.identity_id === state.activeIdentity)))
            return error('22023', kind + '_store_category_invalid_selection');
          selected = [...new Set(params.p_category_ids)].sort();
          state.assignments.set(params[idParameter], selected);state.writes.push({offerId: params[idParameter], selected});
        }
        return {data: {[idField]: params[idParameter], identity_id: params.p_expected_identity_id, category_ids: selected,
          ...(writing ? {assigned_count: selected.length} : {})}, error: null};
      }
      throw Error('Unexpected fixture RPC: ' + call.name);
    }
    if (!user) return error('42501');
    let rows;
    if (call.name === 'profiles') rows = [{id: user, active_identity_id: state.activeIdentity}];
    else if (call.name === 'store_categories') rows = state.categories;
    else throw Error('Unexpected fixture table: ' + call.name);
    rows = rows.filter(row => call.filters.every(([name, value]) => {
      const actual = name.split('.').reduce((object, part) => object?.[part], row);return String(actual) === String(value);
    }));
    for (const [name, options] of [...call.orders].reverse()) rows = [...rows].sort((a, b) => String(a[name]).localeCompare(String(b[name])) * (options?.ascending === false ? -1 : 1));
    const count = rows.length;
    if (call.range) rows = rows.slice(call.range[0], call.range[1] + 1);
    rows = rows.map(row => select(row, call.columns));
    return {data: call.single ? rows[0] ?? null : rows, error: null, count: call.count === 'exact' ? count : null};
  }
  async function execute(call) {
    state.calls.push(call);
    const index = interceptors.findIndex(item => item.name === call.name);
    const run = () => copy(baseReply(call));
    if (index >= 0) return interceptors.splice(index, 1)[0].handle(call, run);
    return run();
  }
  function builder(kind, name, params) {
    const call = {kind, name, params, headers: {}, filters: [], orders: [], range: null, single: false, signal: null};
    let promise;
    const chain = {
      select(columns, options) {call.columns = columns;call.count = options?.count;return chain;},
      eq(name, value) {call.filters.push([name, value]);return chain;},
      order(name, options) {call.orders.push([name, options]);return chain;},
      range(first, last) {call.range = [first, last];return chain;},
      maybeSingle() {call.single = true;return chain;},
      setHeader(name, value) {call.headers[name] = value;return chain;},
      abortSignal(signal) {call.signal = signal;return chain;},
      then(resolve, reject) {promise ??= execute(call);return promise.then(resolve, reject);},
      insert() {throw Error('Direct table writes are forbidden in this fixture');},
      update() {throw Error('Direct table writes are forbidden in this fixture');},
      delete() {throw Error('Direct table writes are forbidden in this fixture');},
    };
    return chain;
  }
  const client = {
    from: name => builder('table', name), rpc: (name, params) => builder('rpc', name, params),
    auth: {
      async getSession() {state.calls.push({kind: 'auth', name: 'getSession'});return {data: {session: copy(state.session)}, error: null};},
      async getUser(token) {state.calls.push({kind: 'auth', name: 'getUser', token});const id = state.tokens.get(token);return {data: {user: id ? {id} : null}, error: id ? null : {code: '401'}};},
      onAuthStateChange(listener) {listeners.add(listener);return {data: {subscription: {unsubscribe: () => listeners.delete(listener)}}};},
    },
  };
  return {client, state,
    intercept(name, handle) {interceptors.push({name, handle});},
    holdNext(name) {
      const entered = deferred(), released = deferred(), item = {entered: entered.promise, release: released.resolve, reject: released.reject};held.add(item);
      interceptors.push({name, handle: async (call, run) => {const reply = run();entered.resolve({call, reply});await released.promise;held.delete(item);return reply;}});return item;
    },
    authEvent(event, session) {state.session = session;for (const listener of listeners) listener(event, session);},
    close() {for (const item of held) item.release();held.clear();listeners.clear();},
  };
}
