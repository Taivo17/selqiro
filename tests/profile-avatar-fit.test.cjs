'use strict';
// Real TS model and image-header/hash code; local synthetic identities only.
// Raster integration with the optional native Canvas runtime is recorded in
// proof/model separately, so these release tests need no added dependency.
const test = require('node:test'), assert = require('node:assert/strict');
const {createHash} = require('node:crypto'), sharp = require('sharp');
const {loader, deferred, U, I, J, P, project} = require('./helpers/jobs-public-loader.cjs');
const load = loader(), geometry = load('src/shared/profile-media/coverFit.ts');
const {clampAvatarFit, avatarCropRect} = load('src/shared/profile-media/avatarFit.ts');
const {ProfileMediaSession} = load('src/features/profile-media/model/profileMediaSession.ts');
const {ProfileMediaClientError} = load('src/features/profile-media/api/profileMediaClient.ts');
const {ProfileImagePreparationError} = load('src/features/profile-media/model/prepareProfileImage.ts');
const R = '55555555-5555-4555-8555-555555555555', NEXT = '66666666-6666-4666-8666-666666666666';
const actor = {expectedUserId: U, expectedIdentityId: I};
const fit = (extra = {}) => ({focus_x: 500, focus_y: 500, zoom: 1000, mode: 'cover', ...extra});
const hash = value => createHash('sha256').update(value).digest('hex');
const prepared = (value = 'original', width = 400, height = 300) => {
  const bytes = Buffer.from(value), preview = new Blob([bytes], {type: 'image/webp'});
  return Object.freeze({imageBase64: bytes.toString('base64'), sourceSha256: hash(bytes), sourceBytes: bytes.length,
    sourceMime: 'image/webp', preview, width, height});
};
const fromBytes = (bytes, width, height) => Object.freeze({imageBase64: bytes.toString('base64'), sourceSha256: hash(bytes),
  sourceBytes: bytes.length, sourceMime: 'image/webp', preview: new Blob([bytes], {type: 'image/webp'}), width, height});
const url = id => `${project}/storage/v1/object/public/identity-media/managed-profile-v1/${I}/${id}.webp`;
const image = id => ({asset_id: id, url: url(id), width: 256, height: 256});
const snapshot = (extra = {}) => ({user_id: U, identity_id: I, revision: R, avatar: null, cover: null,
  focus_x: 500, focus_y: 500, zoom: 1000, ...extra});
const context = (extra = {}) => ({...actor, accessToken: 'synthetic.profile.token', generation: 1,
  signal: new AbortController().signal, ...extra});
const crop = (source, value) => value.mode === 'contain' ? source
  : prepared(`${source.sourceSha256}/${value.focus_x}/${value.focus_y}/${value.zoom}`, 200, 200);
function fixture(extra = {}) {
  let current = context(), saved = extra.initial ?? snapshot(), nextId = 0, confirmations = 0;
  const calls = {upload: [], update: [], snapshot: [], prepareAvatar: []};
  const original = prepared();
  const client = {
    async upload(ctx, command) {
      calls.upload.push(command);
      if (extra.upload) return extra.upload(ctx, command, calls);
      return {user_id: U, identity_id: I, asset_id: command.assetId, slot: command.slot,
        status: 'ready', url: url(command.assetId), width: 256, height: 256};
    },
    async update(ctx, command) {
      calls.update.push(command);
      if (extra.update) return extra.update(ctx, command, calls);
      saved = snapshot({revision: NEXT, [command.slot]: command.action === 'remove' ? null : image(command.assetId),
        ...(command.slot === 'cover' ? {focus_x: command.focusX, focus_y: command.focusY, zoom: command.zoom} : {})});
      return saved;
    },
    async snapshot(ctx) {calls.snapshot.push(ctx); return extra.snapshot ? extra.snapshot(ctx) : saved;},
  };
  const session = new ProfileMediaSession({actor, initial: saved, client, context: () => current,
    confirmed: () => {confirmations++;}, prepare: extra.prepare ?? (async () => original),
    prepareAvatar: async (source, value, signal) => {
      calls.prepareAvatar.push({source, value, signal});
      return extra.prepareAvatar ? extra.prepareAvatar(source, value, signal) : crop(source, value);
    }, uuid: () => `88888888-8888-4888-8888-${String(++nextId).padStart(12, '0')}`});
  return {session, calls, original, confirmations: () => confirmations, setContext: value => {current = value;}};
}
async function withDocument(document, action) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {value: document, configurable: true});
  try {return await action();}
  finally {if (descriptor) Object.defineProperty(globalThis, 'document', descriptor); else delete globalThis.document;}
}

test('avatar crop matches the square preview and remains inside source bounds', () => {
  for (const [width, height] of [[1024, 400], [300, 900], [512, 512], [1, 800], [800, 1]]) {
    for (const focus_x of [0, 500, 1000]) for (const focus_y of [0, 500, 1000]) for (const zoom of [1000, 1500, 2000]) {
      const value = fit({focus_x, focus_y, zoom}), rect = avatarCropRect(width, height, value);
      assert.ok(rect.size > 0 && rect.sx >= 0 && rect.sy >= 0);
      assert.ok(rect.sx + rect.size <= width + 1e-8 && rect.sy + rect.size <= height + 1e-8);
      const preview = geometry.coverGeometry(width, height, 180, 180, value), scale = preview.width / width;
      assert.ok(Math.abs(rect.sx * scale + preview.left) < 1e-8);
      assert.ok(Math.abs(rect.sy * scale + preview.top) < 1e-8);
      assert.ok(Math.abs(rect.size * scale - 180) < 1e-8);
    }
  }
  for (const [value, expected] of [[fit(), {sx: 50, sy: 0, size: 300}],
    [fit({zoom: 2000, focus_x: 1000}), {sx: 250, sy: 75, size: 150}]]) {
    const actual = avatarCropRect(400, 300, value);
    for (const key of ['sx', 'sy', 'size']) assert.ok(Math.abs(actual[key] - expected[key]) < 1e-8);
  }
  for (const width of [0, -1, NaN, Infinity]) assert.equal(avatarCropRect(width, 100, fit()), null);
});

test('avatar fit clamps invalid values and contain has no crop', () => {
  assert.deepEqual(clampAvatarFit(fit({focus_x: NaN, focus_y: Infinity, zoom: -3})), fit());
  assert.deepEqual(clampAvatarFit(fit({focus_x: -1, focus_y: 5000, zoom: 9000})), fit({focus_x: 0, focus_y: 1000, zoom: 2000}));
  assert.equal(avatarCropRect(400, 300, fit({mode: 'contain'})), null);
  assert.ok(Object.isFrozen(clampAvatarFit(fit())));
});

test('avatar preparation rejects unbounded or mismatched sources before decoding', async () => {
  let decodes = 0;
  const local = loader({'src/shared/media/localImageDecode.ts': {decodeLocalImage() {decodes++; throw new Error('unexpected decode');}}});
  const {prepareAvatarImage} = local('src/features/profile-media/model/prepareProfileImage.ts');
  const bytes = await sharp({create: {width: 64, height: 32, channels: 3, background: '#226644'}}).webp().toBuffer();
  const source = fromBytes(bytes, 64, 32);
  assert.equal(await prepareAvatarImage(source, fit({mode: 'contain'})), source);
  for (const changed of [{width: 1025}, {height: 1025}, {width: NaN}, {width: 0}, {sourceMime: 'image/png'},
    {sourceBytes: bytes.length + 1}, {width: 32}, {preview: new Blob(['bad'], {type: 'image/webp'}), sourceBytes: 3},
    {preview: new Blob([], {type: 'image/webp'}), sourceBytes: 0}]) {
    await assert.rejects(prepareAvatarImage({...source, ...changed}, fit()), error => ['decodeError', 'tooLarge'].includes(error.code));
  }
  const huge = new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], {type: 'image/webp'});
  await assert.rejects(prepareAvatarImage({...source, preview: huge, sourceBytes: huge.size}, fit({mode: 'contain'})), error => error.code === 'tooLarge');
  assert.equal(decodes, 0);
});

test('avatar crop encodes bounded square output and binds the hash to its bytes', async () => {
  const sourceBytes = await sharp({create: {width: 64, height: 32, channels: 3, background: '#226644'}}).webp().toBuffer();
  const outputBytes = await sharp({create: {width: 16, height: 16, channels: 3, background: '#226644'}}).webp().toBuffer();
  const bitmap = {}, draws = [], qualities = []; let disposed = 0;
  const local = loader({'src/shared/media/localImageDecode.ts': {async decodeLocalImage() {
    return {source: bitmap, width: 64, height: 32, dispose: () => {disposed++;}};
  }}});
  const {prepareAvatarImage} = local('src/features/profile-media/model/prepareProfileImage.ts');
  const canvas = {width: 0, height: 0, getContext: () => ({drawImage: (...args) => draws.push(args)}),
    toBlob(callback, type, quality) {
      assert.equal(type, 'image/webp'); qualities.push(quality);
      callback(qualities.length === 1 ? new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], {type}) : new Blob([outputBytes], {type}));
    }};
  const source = fromBytes(sourceBytes, 64, 32);
  const result = await withDocument({createElement: tag => {assert.equal(tag, 'canvas'); return canvas;}},
    () => prepareAvatarImage(source, fit({focus_x: 1000, zoom: 2000})));
  assert.deepEqual(draws, [[bitmap, 48, 8, 16, 16, 0, 0, 16, 16], [bitmap, 48, 8, 16, 16, 0, 0, 16, 16]]);
  assert.deepEqual(qualities, [.86, .72]); assert.equal(result.width, 16); assert.equal(result.height, 16);
  assert.equal(result.sourceSha256, hash(outputBytes)); assert.equal(result.sourceBytes, outputBytes.length);
  assert.deepEqual(Buffer.from(result.imageBase64, 'base64'), outputBytes);
  assert.deepEqual(Buffer.from(await source.preview.arrayBuffer()), sourceBytes);
  assert.equal(disposed, 1); assert.equal(canvas.width, 0); assert.equal(canvas.height, 0); assert.ok(Object.isFrozen(result));
});

test('aborted avatar encoding disposes the decoder and never yields a prepared result', async () => {
  const bytes = await sharp({create: {width: 40, height: 20, channels: 3, background: '#226644'}}).webp().toBuffer();
  const started = deferred(), controller = new AbortController(); let disposed = 0, late;
  const local = loader({'src/shared/media/localImageDecode.ts': {async decodeLocalImage() {
    return {source: {}, width: 40, height: 20, dispose: () => {disposed++;}};
  }}});
  const {prepareAvatarImage} = local('src/features/profile-media/model/prepareProfileImage.ts');
  const canvas = {width: 0, height: 0, getContext: () => ({drawImage() {}}),
    toBlob(callback) {late = callback; started.resolve();}};
  await withDocument({createElement: () => canvas}, async () => {
    const pending = prepareAvatarImage(fromBytes(bytes, 40, 20), fit(), controller.signal);
    await started.promise; controller.abort();
    await assert.rejects(pending, error => error.code === 'aborted');
    late(new Blob([bytes], {type: 'image/webp'}));
  });
  assert.equal(disposed, 1); assert.equal(canvas.width, 0); assert.equal(canvas.height, 0);
});

test('avatar selection defaults to fill while contain keeps the full original', async () => {
  const personal = fixture(); await personal.session.choose({}, 'avatar');
  const photo = personal.session.getSnapshot().draft;
  assert.equal(photo.avatarFit.mode, 'cover'); assert.equal(photo.avatarSource, personal.original);
  assert.equal(photo.prepared.width, photo.prepared.height); assert.notEqual(photo.prepared, personal.original);
  assert.equal(personal.calls.upload.length, 0);
  const business = fixture(); await business.session.choose({}, 'avatar', 'contain');
  const logo = business.session.getSnapshot().draft;
  assert.equal(logo.avatarFit.mode, 'contain'); assert.equal(logo.prepared, business.original);
  assert.equal(logo.prepared.width, 400); assert.equal(logo.prepared.height, 300);
});

test('repeated avatar fits preserve the original and replace changed-content asset IDs', async () => {
  const f = fixture(); await f.session.choose({}, 'avatar');
  const first = f.session.getSnapshot().draft;
  assert.equal(await f.session.fitAvatar(fit({zoom: 1800, focus_x: 1000})), true);
  const second = f.session.getSnapshot().draft;
  assert.notEqual(second.assetId, first.assetId); assert.equal(second.avatarSource, first.avatarSource);
  assert.equal(await f.session.fitAvatar(fit({mode: 'contain'})), true);
  const whole = f.session.getSnapshot().draft;
  assert.equal(whole.prepared, first.avatarSource); assert.equal(whole.avatarSource, f.original);
  assert.notEqual(whole.assetId, second.assetId); assert.equal(whole.baseRevision, R);
  assert.ok(f.calls.prepareAvatar.every(call => call.source === f.original));
  assert.equal(f.original.sourceSha256, hash('original')); assert.equal(f.session.getSnapshot().saved.avatar, null);
});

test('same-byte avatar fits retain a compatible upload receipt and asset ID', async () => {
  const unchanged = prepared('same crop', 200, 200);
  const f = fixture({prepareAvatar: async () => unchanged,
    update: async () => {throw new ProfileMediaClientError('invalid');}});
  await f.session.choose({}, 'avatar'); await f.session.save();
  const prior = f.session.getSnapshot().draft; assert.ok(prior.uploaded);
  assert.equal(await f.session.fitAvatar(fit({focus_x: 700})), true);
  const result = f.session.getSnapshot().draft;
  assert.equal(result.assetId, prior.assetId); assert.equal(result.uploaded, prior.uploaded);
  await f.session.save(); assert.equal(f.calls.upload.length, 1); assert.equal(f.calls.update.length, 2);
});

test('changed avatar bytes after an uncertain upload get a fresh asset ID', async () => {
  const f = fixture({upload: async (_ctx, command, calls) => {
    if (calls.upload.length === 1) throw new ProfileMediaClientError('unknown');
    return {user_id: U, identity_id: I, asset_id: command.assetId, slot: 'avatar', status: 'ready', url: url(command.assetId), width: 256, height: 256};
  }});
  await f.session.choose({}, 'avatar'); await f.session.save();
  assert.equal(f.session.getSnapshot().notice, 'uploadError'); assert.equal(f.calls.update.length, 0);
  const previous = f.session.getSnapshot().draft;
  assert.equal(await f.session.fitAvatar(fit({zoom: 1600})), true);
  assert.notEqual(f.session.getSnapshot().draft.assetId, previous.assetId);
  assert.equal(f.session.getSnapshot().draft.uploaded, null);
  await f.session.save(); assert.equal(f.calls.upload.length, 2);
  assert.notEqual(f.calls.upload[0].assetId, f.calls.upload[1].assetId);
  assert.notEqual(f.calls.upload[0].sourceSha256, f.calls.upload[1].sourceSha256);
  assert.equal(f.calls.upload[1].expectedRevision, R); assert.equal(f.confirmations(), 1);
});

test('avatar fitting clears a prior upload receipt when the bytes change', async () => {
  const f = fixture({update: async () => {throw new ProfileMediaClientError('invalid');}});
  await f.session.choose({}, 'avatar'); await f.session.save();
  const prior = f.session.getSnapshot().draft; assert.ok(prior.uploaded);
  assert.equal(await f.session.fitAvatar(fit({focus_x: 0, zoom: 2000})), true);
  const draft = f.session.getSnapshot().draft;
  assert.equal(draft.uploaded, null); assert.notEqual(draft.assetId, prior.assetId);
  assert.equal(draft.baseRevision, prior.baseRevision); assert.equal(draft.avatarSource, prior.avatarSource);
  await f.session.save(); assert.equal(f.calls.upload.length, 2);
  assert.equal(f.calls.upload[1].assetId, draft.assetId); assert.equal(f.calls.update[1].expectedRevision, R);
});

test('cancel and retirement discard late avatar fit completions', async () => {
  for (const action of ['cancel', 'retire']) {
    const gate = deferred(); let signal;
    const f = fixture({prepareAvatar: (source, value, activeSignal) => {
      if (value.zoom === 2000) {signal = activeSignal; return gate.promise;} return crop(source, value);
    }});
    await f.session.choose({}, 'avatar'); const pending = f.session.fitAvatar(fit({zoom: 2000}));
    assert.equal(f.session.getSnapshot().phase, 'preparing'); f.session[action](); assert.equal(signal.aborted, true);
    gate.resolve(prepared('late crop', 100, 100)); assert.equal(await pending, false);
    assert.equal(f.session.getSnapshot().draft, null); assert.equal(f.session.getSnapshot().phase, action === 'retire' ? 'retired' : 'ready');
    assert.equal(f.calls.upload.length, 0);
  }
});

test('stale avatar work cannot replace a newer selection or cross identities', async () => {
  const gate = deferred(), replacement = prepared('replacement');
  const f = fixture({prepare: async file => file.replacement ? replacement : prepared(),
    prepareAvatar: (source, value) => value.zoom === 2000 ? gate.promise : crop(source, value)});
  await f.session.choose({}, 'avatar'); const pending = f.session.fitAvatar(fit({zoom: 2000}));
  await f.session.choose({replacement: true}, 'avatar'); const newest = f.session.getSnapshot().draft;
  gate.resolve(prepared('stale crop', 100, 100)); assert.equal(await pending, false);
  assert.equal(f.session.getSnapshot().draft, newest); assert.equal(newest.avatarSource, replacement);
  const switched = deferred();
  const other = fixture({prepareAvatar: (source, value) => value.zoom === 2000 ? switched.promise : crop(source, value)});
  await other.session.choose({}, 'avatar'); const prior = other.session.getSnapshot().draft;
  const late = other.session.fitAvatar(fit({zoom: 2000})); other.setContext(context({expectedIdentityId: J}));
  switched.resolve(prepared('wrong owner crop', 100, 100)); assert.equal(await late, false);
  assert.equal(other.session.getSnapshot().draft, prior); await other.session.save(); assert.equal(other.calls.upload.length, 0); other.session.retire();
});

test('same-owner focus revalidation preserves local avatar fitting and its base revision', async () => {
  const gate = deferred();
  const f = fixture({prepareAvatar: (source, value) => value.zoom === 1500 ? gate.promise : crop(source, value)});
  await f.session.choose({}, 'avatar'); const pending = f.session.fitAvatar(fit({zoom: 1500}));
  f.session.suspend(); f.setContext(null); assert.equal(f.session.getSnapshot().available, false);
  f.setContext(context({generation: 2})); f.session.revalidate(snapshot());
  gate.resolve(prepared('fitted after focus', 100, 100)); assert.equal(await pending, true);
  const view = f.session.getSnapshot(); assert.equal(view.available, true); assert.equal(view.phase, 'ready');
  assert.equal(view.draft.baseRevision, R); assert.equal(view.draft.avatarSource, f.original);
  assert.equal(f.calls.upload.length, 0);
});

test('a changed revision during avatar fitting retains the draft in conflict', async () => {
  const gate = deferred();
  const f = fixture({prepareAvatar: (source, value) => value.zoom === 1500 ? gate.promise : crop(source, value)});
  await f.session.choose({}, 'avatar'); const pending = f.session.fitAvatar(fit({zoom: 1500}));
  f.session.revalidate(snapshot({revision: NEXT, avatar: image(P)}));
  gate.resolve(prepared('conflicted crop', 100, 100)); assert.equal(await pending, false);
  const view = f.session.getSnapshot(); assert.equal(view.phase, 'conflict'); assert.equal(view.notice, 'conflict');
  assert.equal(view.draft.baseRevision, R); assert.equal(view.draft.avatarSource, f.original);
  await f.session.save(); assert.equal(f.calls.upload.length, 0);
});

test('an uncertain profile save blocks avatar reframing and avoids a second write', async () => {
  let committed;
  const f = fixture({update: async (_ctx, command) => {
    committed = snapshot({revision: NEXT, avatar: image(command.assetId)}); throw new ProfileMediaClientError('unknown');
  }, snapshot: async () => committed});
  await f.session.choose({}, 'avatar'); await f.session.save();
  assert.equal(f.session.getSnapshot().phase, 'uncertain'); const preparations = f.calls.prepareAvatar.length;
  assert.equal(await f.session.fitAvatar(fit({zoom: 2000})), false); f.session.cancel(); await f.session.save();
  assert.equal(f.calls.prepareAvatar.length, preparations); assert.equal(f.calls.update.length, 1);
  await f.session.check(); assert.equal(f.session.getSnapshot().draft, null); assert.equal(f.confirmations(), 1);
  assert.equal(f.calls.update.length, 1); assert.equal(f.calls.upload.length, 1);
});

test('a failed avatar fit keeps the prior draft and original source', async () => {
  const f = fixture({prepareAvatar: async (source, value) => {
    if (value.zoom === 2000) throw new ProfileImagePreparationError('reduceError'); return crop(source, value);
  }});
  await f.session.choose({}, 'avatar'); const prior = f.session.getSnapshot().draft;
  assert.equal(await f.session.fitAvatar(fit({zoom: 2000})), false);
  const view = f.session.getSnapshot(); assert.equal(view.draft, prior); assert.equal(view.notice, 'reduceError');
  assert.equal(view.phase, 'ready'); assert.equal(view.draft.avatarSource, f.original);
});

test('cover drafts keep their original preparation and position contract', async () => {
  const f = fixture({prepareAvatar: () => {throw new Error('cover must not enter avatar cropping');}});
  await f.session.choose({}, 'cover'); const draft = f.session.getSnapshot().draft;
  assert.equal(draft.prepared, f.original); assert.equal(draft.avatarSource, undefined); assert.equal(draft.avatarFit, undefined);
  f.session.position({focus_x: 200, focus_y: 800, zoom: 1500}); await f.session.save();
  assert.equal(f.calls.prepareAvatar.length, 0); assert.equal(f.calls.upload[0].slot, 'cover');
  assert.deepEqual([f.calls.update[0].focusX, f.calls.update[0].focusY, f.calls.update[0].zoom], [200, 800, 1500]);
});
