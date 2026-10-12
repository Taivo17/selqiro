/// <reference types="node" />
export type PublicationImageErrorCode =
  | 'image_input_required' | 'image_source_too_large' | 'image_type_unsupported'
  | 'image_structure_invalid' | 'image_animation_unsupported' | 'image_pixels_exceeded'
  | 'image_decode_failed' | 'image_output_invalid' | 'image_output_too_large'
  | 'image_processor_unavailable' | 'image_processor_busy' | 'image_processing_timeout'
  | 'image_processor_failed' | 'image_processor_protocol_invalid';
export class PublicationImageError extends Error {
  readonly code: PublicationImageErrorCode;
  constructor(code: PublicationImageErrorCode);
}
/** Evidence of byte processing only: not an ownership, object-ready or publish token.
 * The Buffer is mutable. Hash the exact bytes at the immutable Storage write boundary. */
export type SanitizedListingImage = Readonly<{
  buffer: Buffer;
  contentType: 'image/webp';
  byteLength: number;
  width: number;
  height: number;
  sha256: string;
  sourceSha256: string;
  sourceByteLength: number;
  sourceFormat: 'jpeg' | 'png' | 'webp';
  pipelineVersion: 'listing-web-v1';
  engine: Readonly<{sharp: string; libvips: string}>;
}>;
export function sanitizeListingImage(input: Buffer): Promise<SanitizedListingImage>;
