'use strict';

// Native decoder process, not a web route. stdin is bounded original bytes; stdout
// is a framed result. No original filename, environment secrets, Storage or DB API.
const {
  IMAGE_POLICY: P, PublicationImageError, preflightImage,
  validateSourceMetadata, validateOutputMetadata,
} = require('./image-contract.cjs');
let responded = false;
function respond(header, image = Buffer.alloc(0)) {
  if (responded) return;
  responded = true;
  const json = Buffer.from(JSON.stringify(header), 'utf8');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(json.length);
  process.stdout.write(Buffer.concat([length, json, image]));
}
function reject(code) { respond({ok: false, code: new PublicationImageError(code).code}); }
async function decode(bytes) {
  const format = preflightImage(bytes);
  let sharp;
  try { sharp = require('sharp'); } catch { reject('image_processor_unavailable'); return; }
  sharp.cache(false);
  sharp.concurrency(1);
  const options = {
    // metadata first is cheap; the second pipeline MUST finish full decoding.
    failOn: 'warning', limitInputPixels: P.maxSourcePixels,
    sequentialRead: true, unlimited: false, animated: false,
  };
  const metadata = await sharp(bytes, options).metadata();
  validateSourceMetadata(metadata, format);
  const {data, info} = await sharp(bytes, options)
    .timeout({seconds: P.nativeTimeoutSeconds})
    .autoOrient()
    .resize({width: P.maxOutputEdge, height: P.maxOutputEdge,
      fit: 'inside', withoutEnlargement: true})
    .toColourspace('srgb')
    // No keepMetadata/withMetadata/keepExif/withExif/keepIccProfile/keepXmp.
    // The default output strips metadata. Verify the actual result as well.
    .webp({quality: P.webpQuality, effort: P.webpEffort})
    .toBuffer({resolveWithObject: true});
  if (data.length > P.maxOutputBytes) throw new PublicationImageError('image_output_too_large');
  const outputMetadata = await sharp(data, options).metadata();
  validateOutputMetadata(outputMetadata, info, data);
  respond({ok: true, pipelineVersion: P.version, sourceFormat: format,
    width: info.width, height: info.height,
    engine: {sharp: sharp.versions.sharp, libvips: sharp.versions.vips}}, data);
}
function main() {
  let chunks = [], size = 0, invalid = false;
  process.stdin.on('data', chunk => {
    if (invalid) return;
    size += chunk.length;
    if (size > P.maxSourceBytes) {
      invalid = true; chunks = []; reject('image_source_too_large');
      // Continue draining; do not retain oversized input or echo native errors.
    } else chunks.push(chunk);
  });
  process.stdin.on('error', () => { invalid = true; chunks = []; reject('image_input_required'); });
  process.stdin.on('end', async () => {
    if (invalid) return;
    const bytes = Buffer.concat(chunks, size); chunks = [];
    try { await decode(bytes); }
    catch (error) {
      // libvips error strings can contain data. Export ONLY fixed error codes.
      reject(error instanceof PublicationImageError ? error.code : 'image_decode_failed');
    }
  });
}
if (require.main === module) main();
