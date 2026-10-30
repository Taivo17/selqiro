'use strict';
// Synthetic transport/authority contracts; never contacts a real service.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename);
const C = require('../src/entities/conversation/model/messagingCommands.ts');
const P = require('../src/entities/conversation/model/messagingParsers.ts');
const V = require('../src/entities/conversation/model/messagingValidation.ts');
const { ListingContactError } = require('../src/entities/conversation/model/listingContact.ts');
const { createMessagingService } = require('../src/server/messaging/service.ts');
const { createMessagingHandler } = require('../src/server/messaging/handler.ts');
const { createMessagingClient } = require('../src/entities/conversation/api/messagingClient.ts');
const USER = '71000000-0000-0000-0000-000000000001', OWN = '72000000-0000-0000-0000-000000000002';
const PEER = '72000000-0000-0000-0000-000000000003', KEY = '73000000-0000-0000-0000-000000000004';
const PHOTO = '74000000-0000-0000-0000-000000000005', TOKEN = 'synthetic.user.token';
const API = 'https://abcdefghijklmnopqrst.supabase.co', APP = 'https://messaging-example.vercel.app';
const actor = { expectedUserId: USER, expectedIdentityId: OWN };
const bound = { schema_version: 2, actor_user_id: USER, identity_id: OWN };
const identity = id => ({ identity_id: id, name: id === OWN ? 'Saatja' : 'Partner', avatar_url: null });
const command = patch => ({ ...actor, conversationId: '38', beforeMessageId: null, attachmentListingId: null, ...patch });
const send = patch => ({ ...actor, conversationId: '38', requestKey: KEY, message: 'Tere', listingId: null, attachmentId: null, ...patch });
const card = id => ({ id, title: 'Selle sõnumi kuulutus', image: null, price: '4376 EUR' });
const message = (id, patch) => ({ id: String(id), mine: false, text: 'Sisu', text_truncated: false,
  created_at: '2026-10-30T10:00:00.000001+00:00', listing: null, image: null, ...patch });
const view = patch => ({ ...bound, actor: identity(OWN), peer: identity(PEER), conversation_id: '38',
  can_send: true, blocked_by_me: false, listing: { id: '198', title: 'Pealkiri' }, messages: [message(11)],
  next_before_message_id: null, attachment_listing_id: null, attachment_listing: null, ...patch });
const receipt = patch => ({ ...bound, conversation_id: '38', action: 'send', request_key: KEY, message_id: '12', replayed: false, ...patch });
const item = (id, stamp) => ({ conversation_id: id, peer: identity(PEER), listing_title: null, updated_at: stamp,
  preview: { text: 'Viimane sõnum', has_image: false }, unread: true, can_send: true });
const list = entries => ({ ...bound, actor: identity(OWN), conversations: entries, next_cursor: null });
const throws = action => assert.throws(action, e => e instanceof ListingContactError);

test('actual isolated PostgreSQL RPC envelopes satisfy the browser/server contract', () => {
  const wire = JSON.parse(fs.readFileSync(require('node:path').join(__dirname,
    '../supabase/repairs/20261030_messaging_restore/tests/messaging-wire.json'), 'utf8'));
  const allowed = new Set(['parseSendMessageReceipt', 'parseMessageThread', 'parseMessageThreadList',
    'parseMarkThreadReadReceipt', 'parseHideThreadReceipt', 'parseSetThreadBlockedReceipt']);
  assert.ok(wire.cases.length >= 10);
  for (const row of wire.cases) {
    assert.ok(allowed.has(row.parser), row.parser);
    assert.equal(typeof P[row.parser], 'function');
    assert.ok(P[row.parser](row.value, row.command), row.parser);
  }
});

test('text and photo-only commands are exact frozen values with independent listing references', () => {
  assert.ok(Object.isFrozen(C.copySendMessage(send())));
  assert.equal(C.copySendMessage(send({ message: '', attachmentId: PHOTO })).attachmentId, PHOTO);
  assert.equal(C.copySendMessage(send({ listingId: '197', attachmentId: PHOTO })).listingId, '197');
  for (const patch of [{ message: '' }, { message: '   ' }, { message: '\0' }, { message: '\ud800' },
    { message: '😀'.repeat(5001) }, { attachmentId: 'no' }, { listingId: 197 }, { requestKey: USER.toUpperCase() + 'x' },
    { conversationId: '9223372036854775808' }, { title: 'caller-authored snapshot' }]) throws(() => C.copySendMessage(send(patch)));
});

test('accessors and prototype-bearing commands fail without executing user code', () => {
  let calls = 0; const input = send();
  Object.defineProperty(input, 'message', { enumerable: true, get() { calls++; return 'bad'; } });
  throws(() => C.copySendMessage(input)); assert.equal(calls, 0);
  throws(() => C.copySendMessage(Object.assign(Object.create({}), send())));
  throws(() => C.copySendMessage({ ...send(), [Symbol('hidden')]: 'private' }));
});

test('thread keeps listing snapshots, private photo references and long V1 text independently', () => {
  const source = view({ messages: [message(11, { text: 'ü'.repeat(10000), listing: card('197'),
    image: { kind: 'v2', attachment_id: PHOTO, width: 1200, height: 900 } }),
    message(12, { image: { kind: 'legacy', attachment_id: null, width: null, height: null } })] });
  const result = P.parseMessageThread(source, command());
  assert.equal(result.messages[0].text.length, 10000); assert.equal(result.messages[0].listing.id, '197');
  assert.equal(result.listing.id, '198'); assert.equal(result.messages[1].image.kind, 'legacy');
  assert.ok(Object.isFrozen(result.messages[0].image)); assert.ok(Object.isFrozen(result.actor));
});

test('thread rejects forged actor, identities, photo URL and impossible dimensions', () => {
  for (const patch of [{ actor_user_id: PEER }, { identity_id: PEER }, { actor: identity(PEER) },
    { conversation_id: '39' }, { schema_version: 1 }, { blocked_by_me: true }, { peer: identity(OWN) },
    { messages: [message(11, { image: { kind: 'v2', attachment_id: PHOTO, width: 1601, height: 400 } })] },
    { messages: [message(11, { image: { kind: 'legacy', attachment_id: null, width: null, height: null, url: API } })] },
    { messages: [message(11, { text_truncated: undefined })] }]) throws(() => P.parseMessageThread(view(patch), command()));
});

test('history cursor permits a byte-limited short page, preserves bigint order and excludes newer rows', () => {
  const messages = [message('9007199254740993'), message('9007199254740994')];
  const source = view({ messages, next_before_message_id: messages[0].id });
  assert.equal(P.parseMessageThread(source, command()).messages.length, 2);
  throws(() => P.parseMessageThread(source, command({ beforeMessageId: messages[1].id })));
  throws(() => P.parseMessageThread({ ...source, messages: [...messages].reverse() }, command()));
  throws(() => P.parseMessageThread({ ...source, next_before_message_id: '11' }, command()));
});

test('activity cursor distinguishes microseconds and uses ID only for an exact timestamp tie', () => {
  const newest = '2026-10-30T10:00:00.000002+00:00', older = '2026-10-30T10:00:00.000001Z';
  assert.equal(V.messageInstant(newest) - V.messageInstant(older), BigInt(1));
  assert.equal(V.messageInstant('2026-10-30T12:00:00.000001+02:00'), V.messageInstant(older));
  const rows = [item('1', newest), item('99', older), item('98', older)];
  assert.equal(P.parseMessageThreadList(list(rows), { ...actor, cursor: null }).conversations.length, 3);
  throws(() => P.parseMessageThreadList(list([...rows].reverse()), { ...actor, cursor: null }));
  throws(() => P.parseMessageThreadList(list([rows[0], rows[0]]), { ...actor, cursor: null }));
  throws(() => P.parseMessageThreadList(list(rows), { ...actor, cursor: { updated_at: newest, conversation_id: '1' } }));
});

test('mutation receipts bind action, user, identity, thread, key and monotonic visible watermark', () => {
  assert.equal(P.parseSendMessageReceipt(receipt({ replayed: true }), send()).replayed, true);
  for (const patch of [{ request_key: USER }, { actor_user_id: OWN }, { identity_id: USER }, { conversation_id: '9' },
    { action: 'hide' }, { message_id: 12 }, { replayed: undefined }]) throws(() => P.parseSendMessageReceipt(receipt(patch), send()));
  const c = { ...actor, conversationId: '38', throughMessageId: '12' };
  const read = { ...bound, action: 'mark_read', conversation_id: '38', through_message_id: '14' };
  assert.equal(P.parseMarkThreadReadReceipt(read, c).through_message_id, '14');
  throws(() => P.parseMarkThreadReadReceipt({ ...read, through_message_id: '11' }, c));
  throws(() => P.parseHideThreadReceipt({ ...bound, action: 'hide', conversation_id: '39' }, { ...actor, conversationId: '38' }));
  throws(() => P.parseSetThreadBlockedReceipt({ ...bound, action: 'block', conversation_id: '38', blocked_by_me: true,
    can_send: true }, { ...actor, conversationId: '38', blocked: true }));
});

test('private-chat avatar requests cannot leak to unrelated hosts or signed private object URLs', () => {
  const saved = process.env.NEXT_PUBLIC_SUPABASE_URL; process.env.NEXT_PUBLIC_SUPABASE_URL = API;
  try {
    const allowed = API + '/storage/v1/object/public/avatars/a.webp'; assert.equal(V.safeMessageAvatar(allowed), allowed);
    for (const input of [API + '/storage/v1/object/sign/messages/a?token=x', 'https://tracker.invalid/avatar',
      allowed + '?identifier=private', 'data:image/svg+xml,test', '//evil.invalid', 'javascript:alert(1)'])
      assert.equal(V.safeMessageAvatar(input), null);
  } finally { saved === undefined ? delete process.env.NEXT_PUBLIC_SUPABASE_URL : process.env.NEXT_PUBLIC_SUPABASE_URL = saved; }
});

test('server verifies JWT user before exactly one user-scoped RPC and keeps the immutable request key', async () => {
  const calls = [];
  const service = createMessagingService({ projectOrigin: API, publicKey: 'synthetic-public' }, async (url, init) => {
    calls.push({ url, init }); return Response.json(url.endsWith('/auth/v1/user') ? { id: USER } : receipt());
  });
  assert.equal((await service.send(TOKEN, send({ attachmentId: PHOTO, listingId: '197' }))).message_id, '12');
  assert.equal(calls.length, 2); assert.equal(calls[1].url, API + '/rest/v1/rpc/send_my_message_v2');
  assert.deepEqual(JSON.parse(calls[1].init.body), { p_expected_user_id: USER, p_expected_identity_id: OWN,
    p_request_key: KEY, p_conversation_id: '38', p_message: 'Tere', p_listing_id: '197', p_attachment_id: PHOTO });
  assert.equal(new Headers(calls[1].init.headers).get('authorization'), 'Bearer ' + TOKEN);
});

test('wrong JWT user reaches no RPC; ambiguous send response never triggers a retry or v1 fallback', async () => {
  let calls = 0;
  const wrong = createMessagingService({ projectOrigin: API, publicKey: 'synthetic-public' }, async () => {
    calls++; return Response.json({ id: PEER });
  });
  await assert.rejects(wrong.send(TOKEN, send()), e => e.code === 'context_changed'); assert.equal(calls, 1);
  const paths = [];
  const service = createMessagingService({ projectOrigin: API, publicKey: 'synthetic-public' }, async url => {
    paths.push(url); return url.endsWith('/auth/v1/user') ? Response.json({ id: USER }) : new Response('private upstream text', { status: 500 });
  });
  await assert.rejects(service.send(TOKEN, send()), e => e.code === 'outcome_unknown' && !e.message.includes('private'));
  assert.equal(paths.length, 2); assert.ok(paths[1].endsWith('/send_my_message_v2'));
});

function request(body = send(), patch = {}) {
  return new Request(APP + '/api/v2/messaging/send', { method: 'POST', headers: {
    host: new URL(APP).host, origin: APP, authorization: 'Bearer ' + TOKEN, 'content-type': 'application/json', ...patch },
    body: typeof body === 'string' ? body : JSON.stringify(body) });
}
test('handler validates origin, body limit, UTF8/JSON and complete command before authority or service', async () => {
  let authority = 0, serviceCalls = 0;
  const handler = createMessagingHandler({ appOrigin: APP }, { service: { send: async () => { serviceCalls++; return receipt(); } },
    actorGuard: async () => { authority++; } });
  for (const req of [request(send(), { origin: 'https://other.invalid' }), request(send(), { host: 'other.invalid' }),
    request('x'.repeat(32769)), request('{broken'), request({ ...send(), attachmentId: 'invalid' }),
    request(send(), { 'content-length': '1' }), request(send(), { 'content-type': 'text/plain' })])
    assert.ok((await handler(req, 'send')).status >= 400);
  assert.equal((await handler(request(), '__proto__')).status, 404);
  assert.equal(authority, 0); assert.equal(serviceCalls, 0);
});

test('maintenance scheduling follows success only and cannot corrupt a successful receipt', async () => {
  let maintenance = 0, refuse = false;
  const handler = createMessagingHandler({ appOrigin: APP }, { actorGuard: async () => {},
    service: { send: async () => { if (refuse) throw new ListingContactError('refused'); return receipt(); } },
    maintenance: () => { maintenance++; throw Error('scheduler unavailable'); } });
  const good = await handler(request(), 'send'); assert.equal(good.status, 200); assert.equal(maintenance, 1);
  assert.equal(good.headers.get('cache-control'), 'private, no-store'); assert.deepEqual(await good.json(), receipt());
  refuse = true; assert.equal((await handler(request(), 'send')).status, 409); assert.equal(maintenance, 1);
});

test('browser preserves unknown/refused/context outcomes, binds response and never retries', async () => {
  const saved = ['NODE_ENV','NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION','NEXT_PUBLIC_SUPABASE_URL'].map(k => [k, process.env[k]]);
  process.env.NODE_ENV = 'development'; process.env.NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION = 'v1';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  try {
    for (const [status, code] of [[503,'outcome_unknown'],[409,'refused'],[403,'context_changed']]) {
      let count = 0;
      const client = createMessagingClient(async (_url, init) => { count++;
        assert.equal(JSON.parse(init.body).requestKey, KEY); return Response.json({ error: 'private-upstream' }, { status }); });
      await assert.rejects(client.sendMessage(TOKEN, send()), e => e.code === code && !JSON.stringify(e).includes('private-upstream'));
      assert.equal(count, 1);
    }
    const wrong = createMessagingClient(async () => Response.json(receipt({ identity_id: PEER })));
    await assert.rejects(wrong.sendMessage(TOKEN, send()), e => e.code === 'response');
  } finally { for (const [k,v] of saved) v === undefined ? delete process.env[k] : process.env[k] = v; }
});
