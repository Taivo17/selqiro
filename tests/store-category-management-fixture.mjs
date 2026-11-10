// Synthetic Auth/PostgREST and management RPC. Real production modules stay loaded.
import {createStoreFixture, ids, actor, deferred} from './managed-store-category-fixture.mjs';
export {ids, actor, deferred};
const copy = value => JSON.parse(JSON.stringify(value));
const reject = (code, message) => ({data: null, error: {code, message}});
export function createManagementFixture() {
  const base = createStoreFixture(), {state} = base, mutations = [], held = new Set();
  state.creators = new Map(state.categories.map(row => [row.id, row.identity_id === ids.identity ? ids.user : ids.secondUser]));
  state.managementCommands = []; state.managementWrites = [];
  function runMutation(call) {
    const p = call.params, user = state.tokens.get(call.headers.Authorization?.slice(7));
    if (!user || p.p_expected_user_id !== user || p.p_expected_identity_id !== state.activeIdentity)
      return reject('42501', 'store_category_context_changed');
    if (!state.accessAllowed) return reject('42501', 'store_category_forbidden');
    const creating = p.p_operation === 'create_root' || p.p_operation === 'create_child';
    const name = p.p_operation === 'delete' ? p.p_name : p.p_name.trim().replace(/\s+/g, ' ');
    const existing = state.categories.find(row => row.id === p.p_category_id);
    if (existing && existing.identity_id !== state.activeIdentity) return reject('42501', 'store_category_forbidden');
    let changed = true, removed = 0, row = existing;
    if (creating) {
      if (existing) {
        if (state.creators.get(existing.id) !== user) return reject('42501', 'store_category_forbidden');
        if (existing.name !== name || existing.parent_id !== p.p_parent_id) return reject('40001', 'store_category_stale');
        changed = false;
      } else {
        if (p.p_parent_id !== null && !state.categories.some(row => row.id === p.p_parent_id && row.identity_id === state.activeIdentity && row.parent_id === null))
          return reject('40001', 'store_category_stale');
        if (state.categories.some(row => row.identity_id === state.activeIdentity && row.parent_id === p.p_parent_id && row.name.toLowerCase() === name.toLowerCase()))
          return reject('23505', 'store_category_duplicate');
        row = {id: p.p_category_id, identity_id: state.activeIdentity, name, parent_id: p.p_parent_id,
          sort_order: 1 + Math.max(-1, ...state.categories.filter(row => row.identity_id === state.activeIdentity && row.parent_id === p.p_parent_id).map(row => row.sort_order ?? 0))};
        state.categories.push(row); state.creators.set(row.id, user);
      }
    } else {
      if (!existing || existing.name !== p.p_expected_name || existing.parent_id !== p.p_parent_id) return reject('40001', 'store_category_stale');
      if (p.p_operation === 'rename') {
        if (state.categories.some(row => row.id !== existing.id && row.identity_id === state.activeIdentity && row.parent_id === existing.parent_id && row.name.toLowerCase() === name.toLowerCase()))
          return reject('23505', 'store_category_duplicate');
        changed = existing.name !== name; existing.name = name;
      } else if (p.p_operation === 'delete') {
        if (state.categories.some(row => row.parent_id === existing.id)) return reject('23503', 'store_category_has_children');
        for (const [listingId, links] of state.assignments) {
          removed += links.filter(id => id === existing.id).length; state.assignments.set(listingId, links.filter(id => id !== existing.id));
        }
        state.categories = state.categories.filter(row => row.id !== existing.id); state.creators.delete(existing.id);
      } else return reject('22023', 'store_category_invalid_input');
    }
    const receipt = {schema_version: 1, operation: p.p_operation, actor_user_id: user, identity_id: state.activeIdentity,
      category_id: row.id, name: row.name, sort_order: row.sort_order ?? null, parent_id: row.parent_id, changed, removed_listing_links: removed};
    state.managementWrites.push(copy(receipt)); return {data: copy(receipt), error: null};
  }
  const rpc = base.client.rpc;
  base.client.rpc = (name, params) => {
    if (name !== 'manage_my_store_category_v1') return rpc(name, params);
    const call = {kind: 'rpc', name, params, headers: {}, signal: null}; let promise;
    const chain = {
      setHeader(name, value) {call.headers[name] = value; return chain;},
      abortSignal(signal) {call.signal = signal; return chain;},
      then(resolve, reject) {
        promise ??= Promise.resolve().then(() => {
          state.calls.push(call); state.managementCommands.push(call);
          const run = () => runMutation(call), handler = mutations.shift(); return handler ? handler(call, run) : run();
        });
        return promise.then(resolve, reject);
      },
    }; return chain;
  };
  return {...base,
    mutateNext(handler) {mutations.push(handler);},
    holdMutation({commitBeforeRelease = true} = {}) {
      const entered = deferred(), released = deferred(); const item = {entered: entered.promise, release: released.resolve, reject: released.reject}; held.add(item);
      mutations.push(async (call, run) => {const reply = commitBeforeRelease ? run() : null; entered.resolve({call, reply}); await released.promise; held.delete(item); return commitBeforeRelease ? reply : run();});
      return item;
    },
    close() {for (const item of held) item.release(); held.clear(); base.close();},
  };
}
