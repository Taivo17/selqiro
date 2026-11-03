// Real cache and horse session modules; synthetic actor/RPC promises, no browser/network/database.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS },
}).outputText, filename);
const { ListingCreateDrafts } = require('../src/features/listing-create/model/listingCreateDrafts.ts');
const { buildHorseOfferDraftSaveInput } = require('../src/features/listing-create/model/horseOfferDraftSave.ts');
const USER = '71000000-0000-4000-8000-000000000001';
const A = '72000000-0000-4000-8000-000000000001', B = '72000000-0000-4000-8000-000000000002';
const HORSE = '73000000-0000-4000-8000-000000000001';
const REQUEST = '74000000-0000-4000-8000-000000000001';
const DATE = '2026-11-03T12:00:00Z';
const actor = identityId => ({ userId: USER, identityId });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function fixture() {
  const state = { identity: A, creates: [], updates: [], createGate: null, actorGate: null };
  const api = {
    actor: async () => state.actorGate ? state.actorGate.promise : actor(state.identity),
    create: async input => {
      state.creates.push(input);
      if (state.createGate) await state.createGate.promise;
      return { offerId: HORSE, identityId: A, createdByUserId: USER, offerType: input.offerType, status: 'draft',
        title: input.title, description: input.description, createdAt: DATE, updatedAt: DATE, editRevision: '1' };
    },
    update: async input => { state.updates.push(input); return { offerId: input.offerId, editRevision: String(BigInt(input.editRevision) + 1n), updatedAt: DATE }; },
  };
  return { state, cache: new ListingCreateDrafts(USER, api) };
}
function set(entry, key, value) { entry.change(entry.getSnapshot().generation, key, value); }
function horseInput(entry) {
  const d = entry.getSnapshot().value;
  return buildHorseOfferDraftSaveInput({ offerType: 'sale', title: d.title.value, description: d.description.value,
    basicFields: d.horseOfferFields, useFields: d.horseOfferUseFields, disclosureFields: d.horseOfferDisclosureFields,
    priceFields: d.horseOfferPriceFields, locationFields: d.horseOfferLocationFields });
}
test('A → B → A retains separate text, files, ordinary values and complete horse fields', () => {
  const { cache } = fixture(), a = cache.forActor(actor(A)), b = cache.forActor(actor(B));
  const photoA = new Blob(['A photo']), photoB = new Blob(['B photo']);
  set(a, 'title', { value: 'A title', source: 'user' }); set(a, 'files', [photoA]);
  set(a, 'horseOfferType', 'wanted'); set(a, 'horseOfferUseFields', current => ({ ...current, wanted: { ...current.wanted, preferredUse: 'A use' } }));
  set(b, 'title', { value: 'B title', source: 'user' }); set(b, 'files', [photoB]);
  set(b, 'ordinaryFields', current => ({ ...current, city: 'B city' }));
  assert.equal(cache.forActor(actor(A)), a); assert.equal(a.getSnapshot().value.title.value, 'A title');
  assert.equal(a.getSnapshot().value.files[0], photoA); assert.equal(b.getSnapshot().value.files[0], photoB);
  assert.equal(a.getSnapshot().value.horseOfferType, 'wanted'); assert.equal(b.getSnapshot().value.horseOfferType, null);
  assert.notEqual(a.getSnapshot().value.ordinaryFields, b.getSnapshot().value.ordinaryFields);
  assert.notEqual(a.getSnapshot().value.horseOfferFields, b.getSnapshot().value.horseOfferFields);
  assert.equal(b.getSnapshot().value.ordinaryFields.city, 'B city');
});
test('another account cannot obtain an entry from this page cache', () => {
  const { cache } = fixture();
  assert.throws(() => cache.forActor({ userId: B, identityId: A }), /context_changed/);
});
test('restored terminal from an older or another-tab journal cannot clear unsent local draft', () => {
  const { cache } = fixture(), a = cache.forActor(actor(A));
  set(a, 'title', { value: 'Unsent new text', source: 'user' });
  assert.equal(a.finishOrdinary(REQUEST), false);
  assert.equal(a.getSnapshot().value.title.value, 'Unsent new text');
});
test('completed request clears only exactly captured ordinary text/photos and retains horse session', () => {
  const { cache } = fixture(), a = cache.forActor(actor(A)), b = cache.forActor(actor(B));
  set(a, 'title', { value: 'Published', source: 'user' }); set(a, 'files', [new Blob(['private'])]);
  set(b, 'title', { value: 'B remains', source: 'user' });
  const session = a.horseSession, generation = a.getSnapshot().generation;
  a.captureSubmission()(REQUEST);
  assert.equal(a.finishOrdinary(REQUEST), true); assert.equal(a.getSnapshot().value.title.value, '');
  assert.equal(a.getSnapshot().value.files.length, 0); assert.equal(b.getSnapshot().value.title.value, 'B remains');
  assert.equal(a.horseSession, session);
  a.change(generation, 'title', { value: 'stale callback', source: 'user' });
  assert.equal(a.getSnapshot().value.title.value, '');
});
test('changes during policy preparation survive completion even if journal was created later', () => {
  const { cache } = fixture(), a = cache.forActor(actor(A));
  set(a, 'title', { value: 'Sent text', source: 'user' });
  const captured = a.captureSubmission();
  set(a, 'title', { value: 'Newer unsent text', source: 'user' }); captured(REQUEST);
  assert.equal(a.finishOrdinary(REQUEST), true); assert.equal(a.getSnapshot().value.title.value, 'Newer unsent text');
});
test('changes after dispatch and wrong completed key do not erase a newer draft', () => {
  const { cache } = fixture(), a = cache.forActor(actor(A));
  a.captureSubmission()(REQUEST); set(a, 'description', { value: 'New note', source: 'user' });
  assert.equal(a.finishOrdinary(B), false); assert.equal(a.getSnapshot().submittedRequestKey, REQUEST);
  a.finishOrdinary(REQUEST); assert.equal(a.getSnapshot().value.description.value, 'New note');
});
test('ordinary terminal does not clear unrelated horse-mode text', () => {
  const { cache } = fixture(), a = cache.forActor(actor(A));
  a.captureSubmission()(REQUEST); set(a, 'contentType', 'horse_offer');
  set(a, 'title', { value: 'Horse draft', source: 'user' });
  a.finishOrdinary(REQUEST); assert.equal(a.getSnapshot().value.title.value, 'Horse draft');
  assert.equal(a.getSnapshot().value.contentType, 'horse_offer');
});
test('saved horse session ID, exact revision and type lock survive A → B → A; next save updates', async () => {
  const { cache, state } = fixture(), a = cache.forActor(actor(A));
  set(a, 'title', { value: 'Horse A', source: 'user' });
  const session = a.horseSession; session.activate(); await session.refreshContext(); await session.save(horseInput(a));
  cache.suspend(); session.deactivate(); state.identity = B;
  const b = cache.forActor(actor(B)); b.horseSession.activate(); await b.horseSession.refreshContext();
  assert.equal(b.horseSession.getSnapshot().draft, null);
  state.identity = A; const restored = cache.forActor(actor(A)).horseSession;
  assert.equal(restored, session); restored.activate(); await restored.refreshContext();
  assert.equal(restored.getSnapshot().draft.offerId, HORSE); assert.equal(restored.getSnapshot().draft.editRevision, '1');
  assert.equal(restored.getSnapshot().lockedType, 'sale');
  set(a, 'title', { value: 'Updated horse', source: 'user' }); await restored.save(horseInput(a));
  assert.equal(state.creates.length, 1); assert.equal(state.updates.length, 1);
  assert.equal(state.updates[0].offerId, HORSE); assert.equal(state.updates[0].editRevision, '1');
  assert.equal(restored.getSnapshot().draft.editRevision, '2');
});
test('late horse create acknowledgment is retained by original identity while B is open', async () => {
  const { cache, state } = fixture(), a = cache.forActor(actor(A));
  const s = a.horseSession; s.activate(); await s.refreshContext();
  state.createGate = deferred(); const pending = s.save(horseInput(a)); await new Promise(setImmediate);
  assert.equal(state.creates.length, 1); cache.suspend(); s.deactivate(); state.identity = B;
  const b = cache.forActor(actor(B)); b.horseSession.activate(); await b.horseSession.refreshContext();
  state.createGate.resolve(); await pending;
  assert.equal(b.horseSession.getSnapshot().draft, null); assert.equal(s.getSnapshot().draft.offerId, HORSE);
  state.identity = A; s.activate(); await s.refreshContext(); await s.save(horseInput(a));
  assert.equal(state.creates.length, 1); assert.equal(s.getSnapshot().lockedType, 'sale');
});
test('CHANGING suspension retires a horse actor read before create dispatch', async () => {
  const { cache, state } = fixture(), a = cache.forActor(actor(A)), s = a.horseSession;
  s.activate(); await s.refreshContext(); state.actorGate = deferred();
  const pending = s.save(horseInput(a)); cache.suspend(); state.actorGate.resolve(actor(A)); await pending;
  assert.equal(state.creates.length, 0); assert.equal(s.canSave(), false);
});
test('entry is pre-bound to its verified identity; a late first read cannot bind it to B', async () => {
  const { cache, state } = fixture(), a = cache.forActor(actor(A)); state.identity = B;
  a.horseSession.activate(); await a.horseSession.refreshContext(); await a.horseSession.save(horseInput(a));
  assert.equal(a.horseSession.getSnapshot().context, 'blocked'); assert.equal(state.creates.length, 0);
});
test('account close invalidates all horse sessions and late local setters', async () => {
  const { cache } = fixture(), a = cache.forActor(actor(A));
  a.horseSession.activate(); await a.horseSession.refreshContext(); cache.close();
  const before = a.getSnapshot(); set(a, 'title', { value: 'late', source: 'user' });
  assert.equal(a.getSnapshot(), before); assert.equal(a.horseSession.canSave(), false);
  assert.throws(() => cache.forActor(actor(A)), /context_changed/);
});
