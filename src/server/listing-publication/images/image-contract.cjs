'use strict';

// One closed, versioned image recipe; callers cannot raise its resource limits.
// It is NOT an upload authorization or a publication/Storage receipt.
const IMAGE_POLICY = Object.freeze({
  version: 'listing-web-v1',
  maxSourceBytes: 25 * 1024 * 1024,
  maxSourcePixels: 40_000_000,
  maxSourceEdge: 16_384,
  maxContainerChunks: 4_096,
  maxOutputEdge: 2_048,
  maxOutputBytes: 4 * 1024 * 1024,
  nativeTimeoutSeconds: 6,
  processTimeoutMs: 12_000,
  maxHeaderBytes: 2_048,
  maxStderrBytes: 16_384,
  webpQuality: 82,
  webpEffort: 4,
});
const ERROR_CODES = Object.freeze([
  'image_input_required', 'image_source_too_large', 'image_type_unsupported',
  'image_structure_invalid', 'image_animation_unsupported', 'image_pixels_exceeded',
  'image_decode_failed', 'image_output_invalid', 'image_output_too_large',
  'image_processor_unavailable', 'image_processor_busy', 'image_processing_timeout',
  'image_processor_failed', 'image_processor_protocol_invalid',
]);
class PublicationImageError extends Error {
  constructor(code) {
    const safe = ERROR_CODES.includes(code) ? code : 'image_processor_failed';
    super(safe);
    this.name = 'PublicationImageError';
    this.code = safe;
  }
}
const fail = code => { throw new PublicationImageError(code); };

function validateWebpStructure(bytes) {
  if (bytes.length < 20 || bytes.readUInt32LE(4) !== bytes.length - 8) {
    fail('image_structure_invalid');
  }
  let chunks = 0;
  for (let offset = 12; offset < bytes.length;) {
    if (++chunks > IMAGE_POLICY.maxContainerChunks) fail('image_structure_invalid');
    if (bytes.length - offset < 8) fail('image_structure_invalid');
    const kind = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const end = offset + 8 + size + (size % 2);
    if (end > bytes.length) fail('image_structure_invalid');
    if (kind === 'ANIM' || kind === 'ANMF' ||
        (kind === 'VP8X' && size > 0 && (bytes[offset + 8] & 2) !== 0)) {
      fail('image_animation_unsupported');
    }
    offset = end;
  }
}
function validatePngStructure(bytes) {
  let sawEnd = false, chunks = 0;
  for (let offset = 8; offset < bytes.length;) {
    if (++chunks > IMAGE_POLICY.maxContainerChunks) fail('image_structure_invalid');
    if (bytes.length - offset < 12) fail('image_structure_invalid');
    const size = bytes.readUInt32BE(offset);
    const kind = bytes.toString('ascii', offset + 4, offset + 8);
    const end = offset + 12 + size;
    if (end > bytes.length || !/^[A-Za-z]{4}$/.test(kind)) fail('image_structure_invalid');
    if (offset === 8 && (kind !== 'IHDR' || size !== 13)) fail('image_structure_invalid');
    if (['acTL', 'fcTL', 'fdAT'].includes(kind)) fail('image_animation_unsupported');
    if (kind === 'IEND') {
      if (size !== 0 || end !== bytes.length) fail('image_structure_invalid');
      sawEnd = true;
    }
    offset = end;
  }
  if (!sawEnd) fail('image_structure_invalid');
}
function preflightImage(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) fail('image_input_required');
  if (bytes.length > IMAGE_POLICY.maxSourceBytes) fail('image_source_too_large');
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    validatePngStructure(bytes);
    return 'png';
  }
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP') {
    validateWebpStructure(bytes);
    return 'webp';
  }
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpeg';
  fail('image_type_unsupported');
}
function validateSourceMetadata(meta, expectedFormat) {
  if (!meta || meta.format !== expectedFormat) fail('image_type_unsupported');
  if ((meta.pages !== undefined && meta.pages !== 1) || meta.pageHeight !== undefined ||
      (Array.isArray(meta.delay) && meta.delay.length > 0)) fail('image_animation_unsupported');
  const {width, height} = meta;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    fail('image_decode_failed');
  }
  if (width > IMAGE_POLICY.maxSourceEdge || height > IMAGE_POLICY.maxSourceEdge ||
      width * height > IMAGE_POLICY.maxSourcePixels) fail('image_pixels_exceeded');
  if (meta.orientation !== undefined && (!Number.isInteger(meta.orientation) ||
      meta.orientation < 1 || meta.orientation > 8)) fail('image_decode_failed');
}
function validateOutputMetadata(meta, info, bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 20) fail('image_output_invalid');
  if (bytes.length > IMAGE_POLICY.maxOutputBytes) fail('image_output_too_large');
  if (preflightImage(bytes) !== 'webp' || !meta || !info || meta.format !== 'webp' ||
      info.format !== 'webp' || meta.width !== info.width || meta.height !== info.height ||
      !Number.isSafeInteger(info.width) || !Number.isSafeInteger(info.height) ||
      info.width < 1 || info.height < 1 || info.width > IMAGE_POLICY.maxOutputEdge ||
      info.height > IMAGE_POLICY.maxOutputEdge || (meta.pages !== undefined && meta.pages !== 1)) {
    fail('image_output_invalid');
  }
  for (const key of ['exif', 'icc', 'iptc', 'xmp', 'orientation']) {
    if (meta[key] !== undefined) fail('image_output_invalid');
  }
  if (meta.comments !== undefined && (!Array.isArray(meta.comments) || meta.comments.length > 0)) {
    fail('image_output_invalid');
  }
}
module.exports = Object.freeze({
  IMAGE_POLICY, ERROR_CODES, PublicationImageError, preflightImage,
  validateSourceMetadata, validateOutputMetadata,
});
