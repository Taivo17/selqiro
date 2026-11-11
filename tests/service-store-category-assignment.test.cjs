'use strict';
// Actual React hooks, API/parsers and editor composition; synthetic scoped transport.
const {test, before, after} = require('node:test'), assert = require('node:assert/strict'), React = require('react');
const fs = require('node:fs'), path = require('node:path');
const {runtime, inputs, root, sha, recordInput, act} = require('./horse-store-category-runtime.cjs');
let createServiceCategoryFixture, actor, ids, contentKey, profile, ownerRow, serviceRow, emptyId, deferred;
const results = [], startedAt = new Date().toISOString();
before(async () => {
  ({createServiceCategoryFixture, actor, ids, contentKey, profile, ownerRow, serviceRow, emptyId, deferred} = await import('./service-store-category-fixture.mjs'));
  for (const name of ['service-store-category-assignment.test.cjs', 'service-store-category-fixture.mjs', 'horse-store-category-runtime.cjs', 'horse-store-category-fixture.mjs']) recordInput(path.join(root, 'tests', name));
});
const run = (name, body) => test(name, async () => {try {await body();results.push({name, status: 'PASS'});} catch (error) {results.push({name, status: 'FAIL', error: error.stack});throw error;}});
const options = () => ({hookPath: 'src/features/service-editor/model/useServiceStoreCategories.ts', hookName: 'useServiceStoreCategories',
  apiPath: 'src/entities/service/api/serviceStoreCategoriesClient.ts', apiName: 'serviceStoreCategoryApi', url: 'https://fixture.invalid/v2/my-area/services/' + ids.offer + '/edit'});
const props = () => ({actor, serviceId: ids.offer});
const problem = code => error => error?.code === code;
const saves = h => h.fixture.state.calls.filter(call => call.name === 'set_my_service_store_categories_v1');
async function using(body, extra = {}) {const h = runtime(createServiceCategoryFixture(), {...options(), ...extra});try {await body(h);} finally {await h.close();}}

run('service UUID uses its own read/set RPCs; owner tree includes empty sections; no listing/photo/publication writes', () => using(async h => {
  const snapshot = await h.api.read(contentKey);assert.ok(snapshot.categories.some(row => row.id === emptyId));assert.deepEqual(snapshot.categoryIds, [ids.child]);
  await h.api.save(contentKey, [ids.other, ids.root]);await h.api.save(contentKey, []);
  assert.deepEqual(saves(h).map(call => call.params), [[ids.root, ids.other], []].map(p_category_ids => ({p_service_id: ids.offer, p_expected_identity_id: ids.identity, p_category_ids})));
  for (const call of h.fixture.state.calls.filter(call => call.kind !== 'auth')) {
    assert.ok(['profiles', 'store_categories', 'current_user_has_identity_access', 'get_my_service_store_categories_v1', 'set_my_service_store_categories_v1'].includes(call.name));
    assert.equal(call.headers.Authorization, 'Bearer synthetic-token-A');assert.ok(call.signal instanceof AbortSignal);
  }
  const count = saves(h).length;
  for (const bad of [['123'], [ids.child, ids.child]]) assert.throws(() => h.api.save(contentKey, bad), problem('invalid'));
  assert.throws(() => h.api.read({...contentKey, contentId: '202'}), problem('invalid'));assert.equal(saves(h).length, count);
}));
run('mismatched service receipt becomes unknown; explicit recovery preserves selection without replay', () => using(async h => {
  await h.render(props());await h.action(() => h.state.toggleCategory(ids.other));
  h.fixture.intercept('set_my_service_store_categories_v1', (_call, reply) => {const result = reply();result.data.service_id = ids.secondOffer;return result;});
  await h.action(() => h.state.saveSelection());assert.equal(h.state.reviewRequired, true);assert.equal(h.state.canSave, false);
  const selection = h.state.selectedCategoryIds;
  await h.action(() => {h.state.resetSelection();void h.state.saveSelection();});assert.deepEqual(h.state.selectedCategoryIds, selection);
  h.fixture.intercept('get_my_service_store_categories_v1', () => ({data: null, error: {code: 'NETWORK'}}));
  await h.action(() => h.state.refresh());assert.equal(h.state.reviewRequired, true);assert.equal(h.state.canSave, false);
  await h.action(() => h.state.refresh());assert.equal(h.state.message, 'storeSelectionVerified');assert.equal(h.state.dirty, false);assert.equal(saves(h).length, 1);
}));
run('same-tick save lock and readiness preserve drafts; unknown without commit requires deliberate save after readback', () => using(async h => {
  await h.render(props());await h.action(() => h.state.toggleCategory(ids.other));
  await h.render({...props(), blocked: true});await h.action(() => h.state.clearSelection());assert.ok(h.state.selectedCategoryIds.includes(ids.other));
  await h.render(props());h.fixture.intercept('set_my_service_store_categories_v1', () => ({data: null, error: {code: 'NETWORK'}}));
  await h.action(() => Promise.all([h.state.saveSelection(), h.state.saveSelection()]));assert.equal(saves(h).length, 1);
  await h.action(() => h.state.refresh());assert.equal(h.state.message, 'storeSelectionDiffers');assert.equal(h.state.canSave, true);
  await h.action(() => h.state.saveSelection());assert.equal(saves(h).length, 2);assert.equal(h.state.dirty, false);
  h.fixture.state.categories = h.fixture.state.categories.filter(row => row.id !== ids.other);
  await h.action(() => h.state.refresh());assert.equal(h.state.missingCategoryCount, 1);assert.equal(h.state.canSave, false);
}));
run('identity switch after dispatch invalidates local draft and late replies; postflight failure remains unknown', () => using(async h => {
  h.fixture.intercept('set_my_service_store_categories_v1', (_call, reply) => {const result = reply();h.fixture.state.activeIdentity = ids.secondIdentity;return result;});
  await assert.rejects(() => h.api.save(contentKey, [ids.other]), problem('unknown'));
  h.fixture.state.activeIdentity = ids.identity;
  await h.render(props());await h.action(() => h.state.toggleCategory(ids.child));const gate = h.fixture.holdNext('set_my_service_store_categories_v1');let pending;
  await h.action(() => {pending = h.state.saveSelection();});await gate.entered;
  await h.action(() => {h.identity.beginIdentityChange(ids.user);void h.state.saveSelection();});assert.equal(h.state.loaded, false);assert.deepEqual(h.state.selectedCategoryIds, []);
  gate.release();await act(async () => {await pending;});await h.flush();assert.equal(h.state.message, null);assert.equal(saves(h).length, 2);
}));
run('service pages exceed 80 in total, filter on the server, preserve canonical UUIDs and reject incompatible envelopes', () => using(async h => {
  const api = h.load('src/entities/service/api/getPublicProfileServices.ts').getPublicProfileServices;
  const model = h.load('src/entities/service/model/publicProfileServicesV2.ts');
  const request = {identityId: ids.identity, sellerSlug: profile.slug, storeCategoryId: null, offset: 72, limit: 24};
  const page = await api(request, new AbortController().signal);assert.equal(page.totalCount, '85');assert.equal(page.items.length, 13);assert.equal(page.nextOffset, null);
  const filtered = await api({...request, offset: 0, storeCategoryId: ids.child}, new AbortController().signal);
  assert.equal(filtered.totalCount, '84');assert.equal(filtered.items.length, 24);assert.equal(filtered.nextOffset, 24);
  const call = h.fixture.publicCalls.at(-1);assert.deepEqual(call.args, {p_seller_slug: profile.slug, p_store_category_id: ids.child, p_result_limit: 24, p_result_offset: 0});
  const envelope = h.fixture.publicReply(call.name, call.args), correct = {...request, offset: 0, storeCategoryId: ids.child};
  for (const alter of [row => {row.identity_id = ids.secondIdentity;}, row => {row.schema_version = 1;}, row => {row.store_category_id = ids.other;},
    row => {row.items[0].id = '202';}, row => {row.items[1] = row.items[0];}, row => {row.total_count = '1';}, row => {row.has_more = false;}, row => {row.extra = true;}]) {
    const bad = structuredClone(envelope);alter(bad);assert.throws(() => model.parsePublicProfileServicesV2(bad, correct));
  }
  const absent = await api({...request, sellerSlug: 'missing', storeCategoryId: ids.root}, new AbortController().signal);
  assert.equal(absent.profileAvailable, false);assert.equal(absent.totalCount, '0');
}));
run('public category tree omits empty owner sections, includes linked ancestors and validates full pages before rendering', () => using(async h => {
  const api = h.load('src/entities/store-category/api/getPublicProfileStoreCategories.ts').getPublicProfileStoreCategories;
  const request = {identityId: ids.identity, sellerSlug: profile.slug, scope: 'services'};
  const rows = await api(request, new AbortController().signal);assert.deepEqual(rows.map(row => row.id), [ids.root, ids.child, ids.other]);
  assert.ok(!rows.some(row => row.id === emptyId));
  h.fixture.onPublicRead = (call, reply) => {const result = reply();if (call.name === 'get_public_profile_store_categories_v2') result.data.filter_scope = 'marketplace';return result;};
  await assert.rejects(() => api(request, new AbortController().signal));
  h.fixture.onPublicRead = (call, reply) => {const result = reply();if (call.name === 'get_public_profile_store_categories_v2') result.data.items[0].parent_id = ids.child;return result;};
  await assert.rejects(() => api(request, new AbortController().signal));
}));
run('exact profile category/page/branch restoration occurs before read; changed profile cannot display old page', () => using(async h => {
  h.window.history.replaceState({__NA: true}, '', '/v2/profile/' + profile.slug);
  const context = h.load('src/features/service-navigation/model/serviceReturnContext.ts');
  const serviceId = h.fixture.services[50].id;
  context.saveServiceReturnContext({source: 'public-profile', serviceId, cardViewportTop: 120,
    profile: {expanded: true, selectedCategoryId: ids.child, expandedRootId: ids.root, resultOffset: 48, horizontalScrollLeft: 0}});
  const useView = h.load('src/features/public-profile/model/usePublicProfileServiceView.ts').usePublicProfileServiceView;
  let view, expanded;
  function Page({profile: current}) {const [open, setOpen] = React.useState(false);expanded = open;view = useView(current, open, setOpen);return React.createElement('p', {}, view.services.map(item => item.id).join(','));}
  h.window.scrollTo = () => {};
  await h.render({profile}, Page);assert.equal(expanded, true);assert.equal(view.selectedCategoryId, ids.child);assert.equal(view.expandedRootId, ids.root);assert.equal(view.resultOffset, 48);
  assert.equal(view.services.length, 24);assert.ok(view.services.some(item => item.id === serviceId));
  const calls = h.fixture.publicCalls.filter(call => call.name === 'get_public_profile_services_v2');assert.ok(calls.length > 0);assert.ok(calls.every(call => call.args.p_store_category_id === ids.child && call.args.p_result_offset === 48));
  await h.action(() => view.selectRoot(ids.root, true));assert.equal(view.resultOffset, 0);assert.equal(view.selectedCategoryId, ids.root);
  const gate = deferred();h.fixture.onPublicRead = async (call, reply) => {if (call.name === 'get_public_profile_services_v2') await gate.promise;return reply();};
  h.window.history.replaceState({}, '', '/v2/profile/missing');await h.render({profile: {...profile, slug: 'missing'}}, Page);
  assert.equal(view.services.length, 0);assert.equal(view.loading, true);gate.resolve();await h.flush();assert.equal(view.results.page.totalCount, '0');
}));
run('removed restored category resets to all services and first page without a manual scroll jump', () => using(async h => {
  h.window.history.replaceState({}, '', '/v2/profile/' + profile.slug);let jumps = 0;h.window.scrollTo = () => {jumps++;};
  const context = h.load('src/features/service-navigation/model/serviceReturnContext.ts');
  context.saveServiceReturnContext({source: 'public-profile', serviceId: ids.offer, cardViewportTop: 50,
    profile: {expanded: true, selectedCategoryId: emptyId, expandedRootId: emptyId, resultOffset: 72, horizontalScrollLeft: 0}});
  const hook = h.load('src/features/public-profile/model/usePublicProfileServiceView.ts').usePublicProfileServiceView;let view;
  function Page() {const [open, setOpen] = React.useState(false);view = hook(profile, open, setOpen);return null;}
  await h.render({}, Page);assert.equal(view.selectedCategoryId, null);assert.equal(view.resultOffset, 0);assert.equal(view.categoryRemoved, true);
  assert.equal(view.results.page.totalCount, '85');assert.equal(jumps, 0);
}));
run('shrunk service list restores its last valid page and does not scroll to a removed history target', () => using(async h => {
  h.fixture.services = h.fixture.services.slice(0, 27);
  h.window.history.replaceState({}, '', '/v2/profile/' + profile.slug);let jumps = 0;h.window.scrollTo = () => {jumps++;};
  h.load('src/features/service-navigation/model/serviceReturnContext.ts').saveServiceReturnContext({source: 'public-profile', serviceId: ids.offer, cardViewportTop: 50,
    profile: {expanded: true, selectedCategoryId: null, expandedRootId: null, resultOffset: 72, horizontalScrollLeft: 0}});
  const hook = h.load('src/features/public-profile/model/usePublicProfileServiceView.ts').usePublicProfileServiceView;let view;
  function Page() {const [open, setOpen] = React.useState(false);view = hook(profile, open, setOpen);return null;}
  await h.render({}, Page);assert.equal(view.resultOffset, 24);assert.equal(view.pageChanged, true);assert.equal(view.services.length, 3);assert.equal(jumps, 0);
  assert.deepEqual(h.fixture.publicCalls.filter(call => call.name === 'get_public_profile_services_v2').map(call => call.args.p_result_offset), [72, 24]);
}));
run('few services still expose an expansion and retry after contextual category read fails', () => using(async h => {
  h.fixture.services = h.fixture.services.slice(0, 2);h.window.history.replaceState({}, '', '/v2/profile/' + profile.slug);
  h.fixture.onPublicRead = (call, reply) => call.name === 'get_public_profile_store_categories_v2' ? {data: null, error: {code: 'NETWORK'}} : reply();
  const Section = h.load('src/features/public-profile/components/PublicProfileServicesSection.tsx').default;
  function Page() {const [open, setOpen] = React.useState(false);return React.createElement(Section, {profile, expanded: open, onExpandedChange: setOpen});}
  await h.render({}, Page);const expand = Array.from(h.container.querySelectorAll('button')).find(button => button.textContent === 'View all (2)');assert.ok(expand);
  await h.action(() => expand.click());assert.ok(h.container.querySelector('[role=alert]'));
  const retry = Array.from(h.container.querySelectorAll('button')).find(button => button.textContent === 'Try again');assert.ok(retry);
  h.fixture.onPublicRead = null;await h.action(() => retry.click());assert.ok(h.container.querySelector('[data-profile-category-filter=services]'));
}, {modules: {'src/entities/service-category/api/getServiceCategories.ts': {getServiceCategories: async () => []}}}));
run('legacy profile without canonical identity hides the services section without dispatching public reads', () => using(async h => {
  h.window.history.replaceState({}, '', '/v2/profile/legacy');
  const Section = h.load('src/features/public-profile/components/PublicProfileServicesSection.tsx').default;
  function Page() {const [open, setOpen] = React.useState(false);return React.createElement(Section, {profile: {...profile, slug: 'legacy', identityId: null}, expanded: open, onExpandedChange: setOpen});}
  await h.render({}, Page);assert.equal(h.container.querySelector('[data-profile-services]'), null);assert.equal(h.fixture.publicCalls.length, 0);
}, {modules: {'src/entities/service-category/api/getServiceCategories.ts': {getServiceCategories: async () => []}}}));
run('actual service editor keeps title/photo drafts after category save and category-only edits warn on leaving', async () => {
  const fixture = createServiceCategoryFixture(), main = {fields: null, gallery: null, submits: 0, reloads: 0, adopts: 0}, context = {actor, active: true, ready: true, snapshot: null, canAct: () => true, adopt(){main.adopts++;}, reload(){main.reloads++;}, retry(){}};
  const modules = {
    'src/features/service-editor/model/useServiceOwnerContext.ts': {useServiceOwnerContext: () => context},
    'src/features/service-editor/model/useServicePublication.ts': {useServicePublication: () => ({session: {inspect: async () => {}, start: () => {main.submits++;}}, view: {phase: 'editing', message: '', confirmed: null, result: null, intent: null}})},
    'src/features/service-editor/model/useServicePolicy.ts': {useServicePolicy: () => ({snapshot: [], refresh(){}})},
    'src/features/service-editor/components/ServiceFields.tsx': {__esModule: true, default: props => {main.fields = props;return React.createElement('p', {'data-test-title': true}, props.form.title);}},
    'src/features/service-editor/components/ServiceGalleryEditor.tsx': {__esModule: true, default: props => {main.gallery = props;return React.createElement('p', {'data-test-photos': true}, String(props.photos.length));}, serviceEditorPhotos: () => [], serviceGalleryDirty: (_saved, photos) => photos.length > 0},
    'src/features/service-editor/components/ServicePolicyGate.tsx': {__esModule: true, default: () => null},
    'src/features/service-editor/components/ServicePublicationActions.tsx': {__esModule: true, default: () => null},
  };
  const h = runtime(fixture, {...options(), modules});
  try {
    context.snapshot = h.load('src/entities/service/model/servicePublication.ts').bindServiceOwnerSnapshot(ownerRow(), actor, ids.offer);
    const Editor = h.load('src/features/service-editor/components/ServiceEditor.tsx').default;
    await h.render({userId: ids.user, serviceId: ids.offer}, Editor);
    const input = Array.from(h.container.querySelectorAll('[data-service-store-categories] button')).find(element => element.textContent.includes('Tools'));
    assert.ok(input);await h.action(() => input.click());
    const card = h.container.querySelector('[data-service-store-categories]');
    context.active = false;context.ready = false;context.error = 'loadError';await h.render({userId: ids.user, serviceId: ids.offer}, Editor);
    assert.equal(h.container.querySelector('[data-service-store-categories]'), card);assert.equal(card.parentElement.hidden, true);
    context.active = true;context.ready = true;context.error = '';await h.render({userId: ids.user, serviceId: ids.offer}, Editor);
    assert.equal(card.parentElement.hidden, false);assert.equal(Array.from(card.querySelectorAll('button')).find(button => button.textContent.includes('Tools')).getAttribute('aria-pressed'), 'true');
    const event = new h.window.Event('beforeunload', {cancelable: true});h.window.dispatchEvent(event);assert.equal(event.defaultPrevented, true);
    const changed = {...main.fields.form, title: 'Unsaved main title'};await h.action(() => main.fields.onChange(changed));
    const photos = [{file: {name: 'local-photo.png'}, isPrimary: true}];await h.action(() => main.gallery.onChange(photos));
    const save = Array.from(h.container.querySelectorAll('button')).find(button => button.textContent === 'Save sections');assert.ok(save);await h.action(() => save.click());
    assert.equal(main.fields.form.title, 'Unsaved main title');assert.equal(main.gallery.photos, photos);
    assert.equal(main.submits, 0);assert.equal(main.reloads, 0);assert.equal(main.adopts, 0);assert.equal(saves(h).length, 1);
    assert.match(h.container.textContent, /Saved 2 store sections for this service/);
    const empty = Array.from(card.querySelectorAll('button')).find(button => button.textContent.includes('Empty section'));
    await h.action(() => empty.click());h.fixture.intercept('set_my_service_store_categories_v1', (_call, reply) => {reply();throw Error('Lost acknowledgement');});
    await h.action(() => save.click());assert.match(card.textContent, /could not be confirmed/);
    context.active = false;context.ready = false;context.error = 'loadError';await h.render({userId: ids.user, serviceId: ids.offer}, Editor);
    assert.equal(h.container.querySelector('[data-service-store-categories]'), card);
    context.active = true;context.ready = true;context.error = '';await h.render({userId: ids.user, serviceId: ids.offer}, Editor);
    assert.match(card.textContent, /could not be confirmed/);assert.equal(save.disabled, true);
    assert.equal(main.fields.form.title, 'Unsaved main title');assert.equal(main.gallery.photos, photos);
    const check = Array.from(card.querySelectorAll('button')).find(button => button.textContent === 'Check saved selection');assert.ok(check);
    await h.action(() => check.click());assert.match(card.textContent, /saved sections match your selection/);assert.equal(saves(h).length, 2);
  } finally {await h.close();}
});
after(() => {
  const drift = [...inputs].filter(([name, digest]) => sha(fs.readFileSync(path.join(root, name))) !== digest).map(([name]) => name);
  const report = {schemaVersion: 1, status: results.every(item => item.status === 'PASS') && !drift.length ? 'PASS' : 'FAIL', startedAt, finishedAt: new Date().toISOString(),
    boundary: 'Actual React DOM hooks/editor composition, canonical service API/strict parser, public category/page API/parser and history state. Synthetic Auth/PostgREST only; no live authorization, production or real browser layout claimed.',
    cases: results, inputDrift: drift, inputs: [...inputs].map(([name, sha256]) => ({path: name, sha256}))};
  const output = process.env.SELQIRO_SERVICE_CATEGORY_RUNTIME_OUTPUT;
  if (output) {fs.mkdirSync(output, {recursive: true});fs.writeFileSync(path.join(output, 'runtime-result.json'), JSON.stringify(report, null, 2) + '\n');}
  assert.deepEqual(drift, []);
});
