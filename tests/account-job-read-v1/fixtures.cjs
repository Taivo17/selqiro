"use strict";
// Synthetic public wire replies; canonical account eligibility is checked by SQL tests.
const assert = require('node:assert/strict');
const {loader, root, config, jwt, jsonResponse, deferred, job, I, J, P, project, origin} = require('../helpers/jobs-public-loader.cjs');
const OTHER = '55555555-5555-4555-8555-555555555555';
const STAMP = '2026-11-24T08:00:00.000001+00:00';
const readAt = '2026-11-24T09:00:00.000001+00:00';
const publicJob = (extra = {}) => job({published_at: STAMP, employer: {...job().employer, identity_type: 'private'}, ...extra});
const searchInput = (extra = {}) => ({query: '', category: null, countryCode: null, city: null,
  workplaceType: null, employmentType: null, workingTime: null, ...extra});
const cursorFor = item => ({published_at: item.published_at, id: item.content_id});
function page(items = [], {limit = 24, more = false, read_at = readAt} = {}) {
  return {schema_version: 1, items, result_limit: limit, has_more: more,
    next_cursor: more ? cursorFor(items[items.length - 1]) : null, read_at};
}
function profilePage({slug = 'public-employer', identityId = I, items = [], limit = 24, more = false} = {}) {
  return {...page(items, {limit, more}), seller_slug: slug, identity_id: identityId};
}
const searchArgs = (input, cursor = null, limit = 24) => ({p_query: input.query, p_category: input.category,
  p_country_code: input.countryCode, p_city: input.city, p_workplace_type: input.workplaceType,
  p_employment_type: input.employmentType, p_working_time: input.workingTime, p_result_limit: limit, p_cursor: cursor});
function fixture(reply, remember = () => {}, overrides = {}) {
  const calls = [], denied = name => {calls.push({name}); throw new Error('Unexpected private or fallback read: ' + name);};
  const client = {from: name => denied('from.' + name),
    auth: new Proxy({}, {get(_object, name) {return () => denied('auth.' + String(name));}}),
    rpc(name, args) {return {abortSignal(signal) {
      assert.ok(signal instanceof AbortSignal); const call = {name, args, signal}; calls.push(call);
      return Promise.resolve().then(() => reply(call, calls.length));
    }};}};
  const load = loader({'src/shared/supabase/browserClient.ts': {supabaseBrowserClient: client}, ...overrides});
  const api = load('src/entities/job/api/jobClient.ts'); remember(load);
  async function run(name, args) {try {return await api[name](...args);} finally {remember(load);}}
  return {calls, load, api,
    detail: (id = J, signal = new AbortController().signal) => run('getPublicJob', [id, signal]),
    search: (input = searchInput(), cursor = null, signal = new AbortController().signal, limit = 24) => run('searchPublicJobs', [input, cursor, signal, limit]),
    profile: (slug = 'public-employer', identityId = I, cursor = null, signal = new AbortController().signal, limit = 24) => run('getProfileJobs', [slug, identityId, cursor, signal, limit])};
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const clone = value => JSON.parse(JSON.stringify(value));
module.exports = {loader, root, config, jwt, jsonResponse, deferred, I, J, P, OTHER, STAMP, readAt,
  project, origin, publicJob, searchInput, cursorFor, page, profilePage, searchArgs, fixture, tick, clone};
