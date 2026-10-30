// Focused contract/service tests; all accounts and responses are synthetic.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename);
const old = require('../src/entities/conversation/model/listingContact.ts');
const cards = require('../src/entities/conversation/model/listingMessageCards.ts');
const { createListingContactService } = require('../src/server/listing-publication/contact/contactListing.ts');
const USER = '71000000-0000-0000-0000-000000000001';
const IDENTITY = '72000000-0000-0000-0000-000000000002';
const API = 'https://abcdefghijklmnopqrst.supabase.co';
const image = '/api/v2/listing-media/74000000-0000-0000-0000-000000000004/1';
const command = (patch = {}) => ({ expectedUserId: USER, expectedIdentityId: IDENTITY,
  conversationId: '38', beforeMessageId: null, attachmentListingId: '197', ...patch });
const card = (id = '197') => ({ id, title: id === '197' ? 'Müüa BMW' : 'Teine kuulutus', image, price: '4376 EUR' });
const message = (id, listing = null) => ({ id: String(id), mine: true, text: 'Kas on saadaval?',
  created_at: '2026-10-29T19:13:20Z', listing });
const view = (patch = {}) => ({ schema_version: 2, actor_user_id: USER, identity_id: IDENTITY, conversation_id: '38',
  peer_name: 'Müüja', can_send: true, listing: { id: '198', title: 'Teine kuulutus' },
  messages: [message(11, card()), message(12, card('198')), message(13)], next_before_message_id: null,
  attachment_listing_id: '197', attachment_listing: card(), ...patch });

test('each message keeps its own listing while header and composer reference other listings', () => {
  const value = cards.parseConversationCardView(view(), command());
  assert.equal(value.listing.id, '198');
  assert.equal(value.messages[0].listing.id, '197');
  assert.equal(value.messages[1].listing.id, '198');
  assert.equal(value.messages[2].listing, null);
  assert.equal(value.attachment_listing.id, '197');
  assert.ok(Object.isFrozen(value) && Object.isFrozen(value.messages) && Object.isFrozen(value.messages[0].listing));
});

test('missing or scrubbed snapshot stays null; header is never used to fill it', () => {
  const value = cards.parseConversationCardView(view({ attachment_listing: null, messages: [message(11)] }), command());
  assert.equal(value.attachment_listing_id, '197');
  assert.equal(value.attachment_listing, null);
  assert.equal(value.messages[0].listing, null);
});

test('prices stay exact text, including non-euro labels and large decimal values', () => {
  for (const price of ['999999999999999999.999 KWD', 'Tasuta', 'Kokkuleppel', '130.', '', null]) {
    const source = view(); source.messages[0].listing.price = price;
    assert.equal(cards.parseConversationCardView(source, command()).messages[0].listing.price, price);
  }
});

test('new reader rejects wrong actor, version, conversation, and mismatched attachment echo', () => {
  for (const patch of [{ schema_version: 1 }, { actor_user_id: IDENTITY }, { identity_id: USER },
    { conversation_id: '39' }, { attachment_listing_id: '198' }, { attachment_listing: card('198') }]) {
    assert.throws(() => cards.parseConversationCardView(view(patch), command()), old.ListingContactError);
  }
  assert.throws(() => cards.parseConversationCardView(view({ attachment_listing_id: null }), command({ attachmentListingId: null })));
});

test('new contract rejects missing/extra fields and accessor properties without invoking them', () => {
  const missing = view(); delete missing.messages[0].listing;
  const extra = view(); extra.messages[0].listing.secret = 'private';
  const wrongPrice = view(); wrongPrice.messages[0].listing.price = 4376;
  const getter = view(); Object.defineProperty(getter.messages[0].listing, 'price', { enumerable: true,
    get() { throw new Error('must not execute'); } });
  for (const value of [missing, extra, wrongPrice, getter, { ...view(), unexpected: true }]) {
    assert.throws(() => cards.parseConversationCardView(value, command()), old.ListingContactError);
  }
});

test('v1 exact contract remains accepted and rejects the additive v2 shape', () => {
  const source = view();
  const { attachment_listing, attachment_listing_id, ...base } = source;
  const v1 = { ...base, schema_version: 1, messages: source.messages.map(({ listing, ...m }) => m) };
  const { attachmentListingId, ...c } = command();
  assert.equal(old.parseConversationView(v1, c).messages.length, 3);
  assert.throws(() => old.parseConversationView(source, c));
  assert.throws(() => cards.parseConversationCardView(v1, command()));
});

test('cursor and bigint message order validation survives v2 extension', () => {
  const messages = Array.from({ length: 50 }, (_, i) => message(BigInt('9007199254740993') + BigInt(i), i % 2 ? card() : null));
  const c = command({ beforeMessageId: '9007199254741099' });
  const source = view({ messages, next_before_message_id: messages[0].id });
  assert.equal(cards.parseConversationCardView(source, c).messages.length, 50);
  assert.throws(() => cards.parseConversationCardView({ ...source, next_before_message_id: messages[1].id }, c));
  assert.throws(() => cards.parseConversationCardView({ ...source, messages: [...messages].reverse() }, c));
  assert.throws(() => cards.parseConversationCardView(source, command({ beforeMessageId: messages[49].id })));
});

test('read command is exact, frozen, and refuses caller-authored snapshots or invalid IDs', () => {
  const c = cards.copyConversationCardReadCommand(command());
  assert.ok(Object.isFrozen(c));
  for (const patch of [{ listing: card() }, { attachmentListingId: 197 }, { attachmentListingId: '0' },
    { attachmentListingId: '9223372036854775808' }]) assert.throws(() => cards.copyConversationCardReadCommand(command(patch)));
  assert.equal(cards.copyConversationCardReadCommand(command({ attachmentListingId: null })).attachmentListingId, null);
});

test('private chat image rendering permits managed media and configured public storage only', () => {
  const saved = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = API;
  try {
    assert.equal(cards.safeListingCardImage(image), image);
    const publicImage = API + '/storage/v1/object/public/listings/image.webp';
    assert.equal(cards.safeListingCardImage(publicImage), publicImage);
    for (const url of [null, '', 'javascript:alert(1)', '//tracker.invalid/a', 'https://tracker.invalid/pixel',
      API + '/auth/v1/user', API + '/storage/v1/object/sign/private/a?token=secret',
      publicImage + '?tracking=1', '/api/v2/listing-owner-media/secret/1', '/api/v2/listing-media/../contact',
      'data:image/svg+xml,<svg/>', 'https://user:password@abcdefghijklmnopqrst.supabase.co/storage/v1/object/public/a'])
      assert.equal(cards.safeListingCardImage(url), null);
  } finally { saved === undefined ? delete process.env.NEXT_PUBLIC_SUPABASE_URL : process.env.NEXT_PUBLIC_SUPABASE_URL = saved; }
});

test('service uses versioned reader and validated explicit attachment ID under the same authenticated actor', async () => {
  const calls = [];
  const service = createListingContactService({ projectOrigin: API, publicKey: 'synthetic-public-key' }, async (url, init) => {
    calls.push({ url, init });
    return Response.json(url.endsWith('/auth/v1/user') ? { id: USER } : view());
  });
  const result = await service.getWithListings('synthetic.token', command());
  assert.equal(result.messages[0].listing.id, '197');
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, API + '/rest/v1/rpc/get_my_listing_conversation_v2');
  assert.deepEqual(JSON.parse(calls[1].init.body), { p_expected_user_id: USER, p_expected_identity_id: IDENTITY,
    p_conversation_id: '38', p_before_message_id: null, p_attachment_listing_id: '197' });
  assert.equal(new Headers(calls[1].init.headers).get('authorization'), 'Bearer synthetic.token');
});

test('service refuses mismatched authentication and never retries a failed versioned read or drops to v1', async () => {
  let calls = 0;
  const wrong = createListingContactService({ projectOrigin: API, publicKey: 'synthetic-public-key' }, async () => {
    calls++; return Response.json({ id: IDENTITY });
  });
  await assert.rejects(wrong.getWithListings('synthetic.token', command()), old.ListingContactError);
  assert.equal(calls, 1);
  const paths = [];
  const failing = createListingContactService({ projectOrigin: API, publicKey: 'synthetic-public-key' }, async url => {
    paths.push(url); return url.endsWith('/auth/v1/user') ? Response.json({ id: USER }) : Response.json({ code: 'PGRST202' }, { status: 404 });
  });
  await assert.rejects(failing.getWithListings('synthetic.token', command()), old.ListingContactError);
  assert.equal(paths.length, 2);
  assert.equal(paths.filter(p => p.includes('get_my_listing_conversation_v1')).length, 0);
});
