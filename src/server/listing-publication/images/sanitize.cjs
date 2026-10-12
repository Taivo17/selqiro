'use strict';

if (typeof window !== 'undefined') throw new Error('listing_image_server_only');
const {spawn} = require('node:child_process');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {IMAGE_POLICY: P, ERROR_CODES, PublicationImageError, preflightImage} = require('./image-contract.cjs');
let active = false; // Per Node process ONLY. Global/account quotas belong to the DB attempt contract.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join('|') === keys.slice().sort().join('|');

function parseResult(bytes, sourceFormat) {
  const bad = () => { throw new PublicationImageError('image_processor_protocol_invalid'); };
  if (bytes.length < 4) bad();
  const headerLength = bytes.readUInt32BE(0);
  if (headerLength < 2 || headerLength > P.maxHeaderBytes || 4 + headerLength > bytes.length) bad();
  let header;
  try { header = JSON.parse(bytes.toString('utf8', 4, 4 + headerLength)); } catch { bad(); }
  const output = bytes.subarray(4 + headerLength);
  if (header && header.ok === false) {
    if (!exactKeys(header, ['ok', 'code']) || !ERROR_CODES.includes(header.code) || output.length !== 0) bad();
    throw new PublicationImageError(header.code);
  }
  if (!exactKeys(header, ['ok', 'pipelineVersion', 'sourceFormat', 'width', 'height', 'engine']) ||
      header.ok !== true || header.pipelineVersion !== P.version || header.sourceFormat !== sourceFormat ||
      !Number.isSafeInteger(header.width) || !Number.isSafeInteger(header.height) ||
      header.width < 1 || header.height < 1 || header.width > P.maxOutputEdge ||
      header.height > P.maxOutputEdge || !exactKeys(header.engine, ['sharp', 'libvips']) ||
      !/^\d+\.\d+\.\d+$/.test(header.engine.sharp) || !/^\d+\.\d+\.\d+$/.test(header.engine.libvips)) bad();
  if (output.length > P.maxOutputBytes) bad();
  try { if (preflightImage(output) !== 'webp') bad(); } catch { bad(); }
  return {header, output: Buffer.from(output)};
}

/** Decode and re-encode one server-downloaded original. Never authorizes a path,
 * creates a listing, marks a slot ready, uploads a file, or cleans up on failure.
 * The caller must persist attempt ownership / immutable object provenance first.
 */
async function sanitizeListingImage(input) {
  const sourceFormat = preflightImage(input);
  if (active) throw new PublicationImageError('image_processor_busy');
  // Detach from the caller's mutable Buffer before yielding or calculating evidence.
  const source = Buffer.from(input), sourceSha256 = hash(source);
  active = true;
  return new Promise((resolve, reject) => {
    let child, timer, settled = false, stopping = false;
    let chunks = [], outputSize = 0, stderrSize = 0;
    const fail = code => {
      if (!settled) { settled = true; reject(new PublicationImageError(code)); }
    };
    const stop = code => {
      stopping = true; chunks = []; fail(code);
      // Promise rejection is NOT proof the native task ended. Keep the busy lock
      // until close, and actively kill the process instead of Promise.race alone.
      try { child?.kill('SIGKILL'); } catch { /* busy remains fail-closed until close */ }
    };
    try {
      child = spawn(process.execPath, [path.join(__dirname, 'worker.cjs')], {
        shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
        // Never pass DB/Storage keys, NODE_OPTIONS, NODE_PATH or app environment.
        env: {LANG: 'C', TZ: 'UTC', UV_THREADPOOL_SIZE: '1'},
      });
    } catch {
      active = false; fail('image_processor_unavailable'); return;
    }
    timer = setTimeout(() => stop('image_processing_timeout'), P.processTimeoutMs);
    child.on('error', () => { fail('image_processor_unavailable'); });
    child.stdin.on('error', () => { if (!stopping) stop('image_processor_failed'); });
    child.stdout.on('error', () => stop('image_processor_failed'));
    child.stderr.on('error', () => stop('image_processor_failed'));
    child.stdout.on('data', chunk => {
      if (stopping) return;
      outputSize += chunk.length;
      if (outputSize > P.maxOutputBytes + P.maxHeaderBytes + 4) {
        stop('image_processor_protocol_invalid'); return;
      }
      chunks.push(chunk);
    });
    child.stderr.on('data', chunk => {
      stderrSize += chunk.length; // Drain, never store/log/return raw decoder errors.
      if (stderrSize > P.maxStderrBytes) stop('image_processor_failed');
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer); active = false;
      if (settled) return;
      if (code !== 0 || signal) { fail('image_processor_failed'); return; }
      try {
        const {header, output} = parseResult(Buffer.concat(chunks, outputSize), sourceFormat);
        settled = true;
        resolve(Object.freeze({
          buffer: output, contentType: 'image/webp', byteLength: output.length,
          width: header.width, height: header.height, sha256: hash(output),
          sourceSha256, sourceByteLength: source.length, sourceFormat,
          pipelineVersion: P.version, engine: Object.freeze({...header.engine}),
        }));
      } catch (error) {
        fail(error instanceof PublicationImageError ? error.code : 'image_processor_protocol_invalid');
      } finally { chunks = []; }
    });
    try { child.stdin.end(source); } catch { stop('image_processor_failed'); }
  });
}
module.exports = Object.freeze({sanitizeListingImage, PublicationImageError});
