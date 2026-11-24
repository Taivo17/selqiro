'use strict';
// Real unchanged public-job clients/parsers with synthetic replies; no hosted SQL or browser claim.
const {test, after} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), {createHash} = require('node:crypto');
const F = require('./fixtures.cjs');
const {fixture, publicJob, page, profilePage, searchInput, cursorFor, J, I, P, OTHER} = F;
const sources = new Map(), sha = value => createHash('sha256').update(value).digest('hex');
const started = process.hrtime.bigint(), originalFetch = global.fetch;
global.fetch = async () => assert.fail('Unexpected network access');
const proof = {format: 'selqiro-account-job-client-v1', started_at: new Date().toISOString(), cases: [],
  boundary: 'Actual unchanged TS public-job APIs/parsers and anonymous sharing; synthetic replies and explicit transport seams. No SQL eligibility, browser, Mac, deployment or account closure proved.'};
function remember(load) {for (const [name, hash] of load.inputs) {if (sources.has(name)) assert.equal(sources.get(name), hash); sources.set(name, hash);}}
function scenario(name, run) {test(name, async () => {
  const began = process.hrtime.bigint();
  try {await run(); proof.cases.push({name, status: 'PASS', duration_ms: Number(process.hrtime.bigint() - began) / 1e6});}
  catch (error) {proof.cases.push({name, status: 'FAIL', message: error.message}); throw error;}
});}
function oneCall(f, name, args) {assert.equal(f.calls.length, 1); assert.equal(f.calls[0].name, name);
  assert.deepEqual(f.calls[0].args, args); assert.ok(f.calls[0].signal instanceof AbortSignal);}
const parserLoader = F.loader(), parsers = parserLoader('src/entities/job/model/jobParsers.ts'); remember(parserLoader);
const parseProfile = (value, limit = 24, identityId = I, slug = 'public-employer', before = null) =>
  parsers.parseJobPage(value, limit, {kind: 'profile', slug, identityId}, before);
const parseSearch = (value, limit = 24, before = null) => parsers.parseJobPage(value, limit, {kind: 'search'}, before);

scenario('job detail keeps unavailable null distinct from an active private or business publisher', async () => {
  for (const data of [null, publicJob(), publicJob({employer: {...publicJob().employer, identity_type: 'business'}})]) {
    const f = fixture(() => ({data, error: null, status: 200}), remember), result = await f.detail();
    assert.deepEqual(result, data); if (result) {assert.ok(Object.isFrozen(result)); assert.ok(Object.isFrozen(result.content));}
    oneCall(f, 'get_public_job_v1', {p_job_id: J});
  }
});
scenario('job detail rejects query errors mismatched ids malformed fields and private response additions', async () => {
  const valid = publicJob();
  const invalid = [undefined, [], publicJob({content_id: OTHER}), publicJob({status: 'closed'}),
    publicJob({owner_email: 'private@example.invalid'}), publicJob({employer: {...valid.employer, account_status: 'closed'}}),
    publicJob({content: {...valid.content, salaryMin: '1.00', salaryCurrency: 'EUR', salaryPeriod: 'hour'}})];
  for (const data of invalid) {
    const f = fixture(() => ({data, error: null, status: 200}), remember);
    await assert.rejects(f.detail(), error => error.name === 'JobError' && error.kind === 'unknown');
    oneCall(f, 'get_public_job_v1', {p_job_id: J});
  }
  for (const [code, kind] of [['42501', 'forbidden'], ['55P03', 'unknown']]) {
    const f = fixture(() => ({data: null, error: {code, message: 'private database diagnostic'}, status: 500}), remember);
    await assert.rejects(f.detail(), error => error.kind === kind && !error.message.includes('private database diagnostic'));
    oneCall(f, 'get_public_job_v1', {p_job_id: J});
  }
});
scenario('job profile unavailable and available empty pages retain the original expected identity context', async () => {
  for (const identityId of [null, I]) {
    const data = profilePage({identityId}), f = fixture(() => ({data, error: null, status: 200}), remember);
    const result = await f.profile('public-employer', I);
    assert.equal(result.identity_id, identityId); assert.deepEqual(result.items, []);
    assert.equal(result.has_more, false); assert.equal(result.next_cursor, null);
    assert.equal(result.seller_slug, 'public-employer'); assert.equal(result.result_limit, 24);
    assert.equal(Object.hasOwn(result, 'profile_available'), false); assert.equal(Object.hasOwn(result, 'account_status'), false);
    oneCall(f, 'get_public_profile_jobs_v1', {p_seller_slug: 'public-employer', p_result_limit: 24, p_cursor: null});
  }
});
scenario('job profile rejects null identity leakage cross identity rows changed slug and hidden fields', () => {
  const absent = profilePage({identityId: null}), row = publicJob(), active = profilePage({items: [row]});
  assert.equal(parseProfile(active).items[0].identity_id, I);
  for (const data of [{...absent, items: [row]}, {...absent, has_more: true, next_cursor: cursorFor(row)},
    {...absent, next_cursor: cursorFor(row)}, {...absent, account_reason: 'suspended'},
    {...active, identity_id: OTHER}, {...active, items: [publicJob({identity_id: OTHER})]},
    {...active, seller_slug: 'another-profile'}, {...active, items: [publicJob({actor_user_id: OTHER})]}, null])
    assert.throws(() => parseProfile(data));
  assert.throws(() => parseProfile(active, 24, OTHER));
});
scenario('job search preserves every filter page limit and keyset cursor through one public read', async () => {
  const input = searchInput({query: 'repair local', category: 'engineering', countryCode: 'EE', city: 'Paide',
    workplaceType: 'hybrid', employmentType: 'contract', workingTime: 'part_time'});
  const first = publicJob({content_id: OTHER}), second = publicJob({content_id: P});
  const f = fixture(() => ({data: page([first, second], {limit: 2, more: true}), error: null, status: 200}), remember);
  const result = await f.search(input, null, new AbortController().signal, 2);
  assert.deepEqual(result.items.map(item => item.content_id), [OTHER, P]); assert.deepEqual(result.next_cursor, cursorFor(second));
  oneCall(f, 'search_public_jobs_v1', F.searchArgs(input, null, 2));
  const next = fixture(() => ({data: page([publicJob()], {limit: 2}), error: null, status: 200}), remember);
  const last = await next.search(input, result.next_cursor, new AbortController().signal, 2);
  assert.equal(last.items[0].content_id, J); assert.equal(last.has_more, false); assert.equal(last.next_cursor, null);
  oneCall(next, 'search_public_jobs_v1', F.searchArgs(input, result.next_cursor, 2));
});
scenario('job pages reject wrong limits expired rows duplicates reversed order and inconsistent cursors', () => {
  const first = publicJob({content_id: OTHER}), second = publicJob({content_id: P}), valid = page([first, second], {limit: 2, more: true});
  assert.equal(parseSearch(valid, 2).items.length, 2);
  for (const data of [{...valid, result_limit: 3}, {...valid, items: [first, first]}, {...valid, items: [second, first]},
    {...valid, next_cursor: cursorFor(first)}, {...valid, has_more: false}, {...valid, items: [first]},
    {...valid, account_status: 'active'}, {...valid, items: [first, {...second, active_until: F.readAt}]}])
    assert.throws(() => parseSearch(data, 2));
  assert.throws(() => parseSearch(page([second], {limit: 2}), 2, cursorFor(second)));
  const subsecond = publicJob({published_at: '2026-11-24T08:00:00.000002+00:00'});
  assert.throws(() => parseSearch(page([subsecond], {limit: 2}), 2, cursorFor(first)));
  assert.deepEqual(parseSearch(page(), 24).items, []);
});
scenario('job search and profile keep query or malformed envelope failures separate from successful empty pages', async () => {
  for (const method of ['search', 'profile']) for (const reply of [{data: null, error: null, status: 200},
    {data: null, error: {code: '42501', message: 'private diagnostic'}, status: 403},
    {data: {schema_version: 1, items: []}, error: null, status: 200}]) {
    const f = fixture(() => reply, remember);
    await assert.rejects(f[method](), error => error.name === 'JobError' && !error.message.includes('private diagnostic'));
    assert.equal(f.calls.length, 1); assert.equal(f.calls[0].name, method === 'search' ? 'search_public_jobs_v1' : 'get_public_profile_jobs_v1');
  }
});
scenario('job APIs reject invalid profile scopes cursors and pre aborted reads before transport', async () => {
  const f = fixture(() => assert.fail('Invalid or cancelled request reached transport'), remember);
  assert.equal(await f.detail('not-a-uuid'), null);
  await assert.rejects(f.profile('', I)); await assert.rejects(f.profile('public-employer', null));
  await assert.rejects(f.search(searchInput(), {created_at: F.STAMP, id: J}));
  await assert.rejects(f.profile('public-employer', I, {published_at: 'bad', id: J}));
  const abort = new AbortController(); abort.abort();
  await assert.rejects(f.detail(J, abort.signal), error => error.kind === 'forbidden');
  await assert.rejects(f.search(searchInput(), null, abort.signal), error => error.kind === 'forbidden');
  await assert.rejects(f.profile('public-employer', I, null, abort.signal), error => error.kind === 'forbidden');
  assert.deepEqual(f.calls, []);
});
scenario('job public reads propagate cancellation and reject a late successful reply without retry', async () => {
  for (const method of ['detail', 'search', 'profile']) {
    const pending = F.deferred(), abort = new AbortController(), f = fixture(() => pending.promise, remember);
    const reading = method === 'detail' ? f.detail(J, abort.signal) : method === 'search'
      ? f.search(searchInput(), null, abort.signal) : f.profile('public-employer', I, null, abort.signal);
    await F.tick(); abort.abort(); assert.equal(f.calls[0].signal.aborted, true);
    pending.resolve({data: method === 'detail' ? publicJob() : method === 'search' ? page([publicJob()]) : profilePage({items: [publicJob()]}), error: null, status: 200});
    await assert.rejects(reading, error => error.name === 'JobError'); assert.equal(f.calls.length, 1);
  }
});
scenario('anonymous job sharing reads public detail once with anonymous credentials and only public image URLs', async () => {
  const load = F.loader(), preview = load('src/server/sharing/anonymousOfferPreview.ts').readAnonymousOfferPreview;
  try {
    for (const publicKey of [F.config.publicKey, 'sb_publishable_' + 'a'.repeat(24)]) {
      const image = F.project + '/storage/v1/object/public/profile-images/demo.png', data = publicJob({employer: {...publicJob().employer, logo_url: image}}), calls = [];
      const result = await preview('job', J, {...F.config, publicKey}, async (url, init) => {calls.push({url, init}); return F.jsonResponse(data);});
      assert.deepEqual(result, {url: F.origin + '/v2/job/' + J, title: data.content.title, description: data.content.description, image});
      assert.equal(calls.length, 1); assert.equal(calls[0].url, F.project + '/rest/v1/rpc/get_public_job_v1');
      assert.deepEqual(JSON.parse(calls[0].init.body), {p_job_id: J}); assert.equal(calls[0].init.credentials, 'omit'); assert.equal(calls[0].init.cache, 'no-store');
      assert.equal(calls[0].init.headers.get('apikey'), publicKey); assert.equal(calls[0].init.headers.has('cookie'), false);
      assert.equal(calls[0].init.headers.get('authorization'), publicKey.startsWith('sb_publishable_') ? null : 'Bearer ' + publicKey);
    }
    const hiddenImage = publicJob({employer: {...publicJob().employer, logo_url: F.project + '/storage/v1/object/sign/profile-images/private.png?token=synthetic'}});
    const result = await preview('job', J, F.config, async () => F.jsonResponse(hiddenImage)); assert.equal(result.image, null);
  } finally {remember(load);}
});
scenario('anonymous job sharing omits unavailable errored expired or malformed replies without fallback', async () => {
  const load = F.loader(), preview = load('src/server/sharing/anonymousOfferPreview.ts').readAnonymousOfferPreview;
  try {
    for (const [data, status] of [[null, 200], [null, 500], [publicJob({content_id: OTHER}), 200],
      [publicJob({owner_email: 'private@example.invalid'}), 200], [publicJob({published_at: '2026-11-16T08:00:00Z', active_until: '2026-11-17T08:00:00Z'}), 200]]) {
      const calls = [], result = await preview('job', J, F.config, async (url, init) => {calls.push({url, init}); return F.jsonResponse(data, status);});
      assert.equal(result, null); assert.equal(calls.length, 1); assert.equal(calls[0].url, F.project + '/rest/v1/rpc/get_public_job_v1');
      assert.deepEqual(JSON.parse(calls[0].init.body), {p_job_id: J});
    }
  } finally {remember(load);}
});
scenario('anonymous job sharing refuses privileged user keys wrong project and invalid id before dispatch', async () => {
  const load = F.loader(), preview = load('src/server/sharing/anonymousOfferPreview.ts').readAnonymousOfferPreview;
  try {
    let calls = 0; const fetcher = async () => {calls++; return F.jsonResponse(publicJob());};
    for (const role of ['authenticated', 'service_role']) assert.equal(await preview('job', J, {...F.config, publicKey: F.jwt(role)}, fetcher), null);
    assert.equal(await preview('job', J, {...F.config, projectOrigin: 'https://another.supabase.co'}, fetcher), null);
    assert.equal(await preview('job', 'bad-id', F.config, fetcher), null); assert.equal(calls, 0);
  } finally {remember(load);}
});

after(() => {
  global.fetch = originalFetch;
  const drift = [...sources].filter(([name, hash]) => sha(fs.readFileSync(path.join(F.root, name))) !== hash).map(([name]) => name);
  assert.deepEqual(drift, []);
  for (const name of ['tests/helpers/jobs-public-loader.cjs', 'package.json', 'package-lock.json']) sources.set(name, sha(fs.readFileSync(path.join(F.root, name))));
  proof.finished_at = new Date().toISOString(); proof.elapsed_ms = Number(process.hrtime.bigint() - started) / 1e6;
  proof.status = proof.cases.every(item => item.status === 'PASS') && !drift.length ? 'PASS' : 'FAIL';
  proof.runtime = {node: process.version, typescript: require('typescript').version, react: require('react').version};
  proof.test_sha256 = Object.fromEntries(['job-read.test.cjs', 'fixtures.cjs'].map(name => ['tests/account-job-read-v1/' + name, sha(fs.readFileSync(path.join(__dirname, name)))]));
  proof.input_sha256 = Object.fromEntries([...sources].sort()); proof.source_drift = drift;
  if (process.env.SELQIRO_ACCOUNT_JOB_CLIENT_PROOF) fs.writeFileSync(process.env.SELQIRO_ACCOUNT_JOB_CLIENT_PROOF, JSON.stringify(proof, null, 2) + '\n');
});
