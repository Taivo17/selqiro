'use strict';
// Real installed Supabase/PostgREST request construction with synthetic auth and
// an in-memory fetch transport. No live sessions, accounts or mutations.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');
const A = '71000000-0000-0000-0000-000000000001';
const B = '71000000-0000-0000-0000-000000000002';
const SHARED = '72000000-0000-0000-0000-000000000002';
const token = owner => 'synthetic.account.' + owner;

function loadApi(client) {
  const filename = path.resolve(__dirname, '../src/entities/identity/api/setActiveIdentity.ts');
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS } }).outputText;
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  compiled.require = name => name.endsWith('/shared/supabase/browserClient')
    ? { supabaseBrowserClient: client } : Module.prototype.require.call(compiled, name);
  compiled._compile(source, filename);
  return compiled.exports.setActiveIdentity;
}

function fixture(options = {}) {
  let liveOwner = A;
  const calls = [], requests = [];
  const realClient = createClient('https://abcdefghijklmnopqrst.supabase.co', 'synthetic-public-key', {
    accessToken: async () => { calls.push(['late-token', liveOwner]); return token(liveOwner); },
    global: { fetch: async (url, init) => {
      requests.push({ url: String(url), authorization: new Headers(init.headers).get('authorization'), body: JSON.parse(init.body) });
      return new Response(JSON.stringify([{ identity_id: options.returnedIdentity ?? SHARED, identity_type: 'business',
        display_name: 'Ühine proovipood', avatar_url: null, slug: 'synthetic', changed: true }]),
      { status: 200, headers: { 'content-type': 'application/json' } });
    } },
  });
  const client = {
    auth: {
      async getSession() {
        calls.push(['session']);
        return { error: null, data: { session: options.noSession ? null
          : { user: { id: options.snapshotOwner ?? A }, access_token: token(options.snapshotOwner ?? A) } } };
      },
      async getUser(capturedToken) {
        calls.push(['verify', capturedToken]);
        if (options.verificationWait) await options.verificationWait;
        // The account changes before the real SDK's late token lookup. The
        // shared identity is legitimately accessible to both synthetic users.
        liveOwner = B;
        return { error: options.verificationError ? { message: 'synthetic expired token' } : null,
          data: { user: { id: options.verifiedOwner ?? A } } };
      },
    },
    rpc: realClient.rpc.bind(realClient),
  };
  return { setActiveIdentity: loadApi(client), realClient, requests, calls };
}

test('identity mutation keeps its verified expected account through the SDK late session lookup', async () => {
  const f = fixture();
  const result = await f.setActiveIdentity({ identityId: SHARED, expectedUserId: A });
  assert.equal(result.identity.id, SHARED);
  assert.equal(result.changed, true);
  assert.ok(f.calls.some(call => call[0] === 'late-token' && call[1] === B));
  assert.deepEqual(f.calls.find(call => call[0] === 'verify'), ['verify', token(A)]);
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].authorization, 'Bearer ' + token(A));
  assert.deepEqual(f.requests[0].body, { p_identity_id: SHARED });
  assert.ok(f.requests[0].url.endsWith('/rest/v1/rpc/set_my_active_identity_v2'));
  // The override belongs to this request; it must not contaminate the client.
  await f.realClient.rpc('synthetic_other_request', {});
  assert.equal(f.requests[1].authorization, 'Bearer ' + token(B));
});

test('expected account mismatch rejects before token verification or any mutation request', async () => {
  const f = fixture({ snapshotOwner: B });
  await assert.rejects(f.setActiveIdentity({ identityId: SHARED, expectedUserId: A }), /konto muutus/);
  assert.equal(f.requests.length, 0);
  assert.equal(f.calls.some(call => call[0] === 'verify'), false);
});

test('the captured token must verify as the expected account before mutation', async () => {
  for (const options of [{ verifiedOwner: B }, { verificationError: true }, { noSession: true }]) {
    const f = fixture(options);
    await assert.rejects(f.setActiveIdentity({ identityId: SHARED, expectedUserId: A }));
    assert.equal(f.requests.length, 0);
  }
});

test('an account change during delayed verification still cannot retarget the mutation', async () => {
  let release;
  const verificationWait = new Promise(resolve => { release = resolve; });
  const f = fixture({ verificationWait });
  const pending = f.setActiveIdentity({ identityId: SHARED, expectedUserId: A });
  await Promise.resolve();
  assert.equal(f.requests.length, 0);
  release();
  await pending;
  assert.equal(f.requests[0].authorization, 'Bearer ' + token(A));
});

test('existing identityId-only callers remain compatible and pin their captured session', async () => {
  const f = fixture();
  await f.setActiveIdentity({ identityId: SHARED });
  assert.equal(f.requests[0].authorization, 'Bearer ' + token(A));
});

test('malformed expected account and mismatched identity receipts remain rejected', async () => {
  const f = fixture();
  await assert.rejects(f.setActiveIdentity({ identityId: SHARED, expectedUserId: 'invalid' }));
  assert.equal(f.calls.filter(call => call[0] !== 'late-token').length, 0);
  assert.equal(f.requests.length, 0);
  const wrong = fixture({ returnedIdentity: '72000000-0000-0000-0000-000000000009' });
  await assert.rejects(wrong.setActiveIdentity({ identityId: SHARED, expectedUserId: A }), /ootamatu identiteedi/);
});
