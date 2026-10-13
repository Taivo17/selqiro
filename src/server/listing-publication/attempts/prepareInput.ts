import type { ListingCreationInput } from "../../../entities/listing/model/listingCreationInput";
import { normalizeListingPriceWire } from "../../../entities/listing/model/listingPriceInput";
import { LISTING_CREATE_IMAGE_LIMIT, LISTING_CREATE_MAX_SOURCE_IMAGE_SIZE_MB } from "../../../features/listing-create/model/imageSelection";

export type PublicationImageDeclaration = Readonly<{
  client_file_id: string; byte_length: number; sha256: string;
}>;
export type PrepareListingPublicationCommand = Readonly<{
  p_expected_user_id: string; p_expected_identity_id: string; p_request_key: string;
  p_input: ListingCreationInput; p_images: readonly PublicationImageDeclaration[];
}>;
export class PublicationCommandError extends Error {
  constructor(readonly code: "context" | "input" | "images" | "count" | "bytes") {
    super("publication_command_" + code); this.name = "PublicationCommandError";
  }
}
const fail = (code: PublicationCommandError["code"]): never => { throw new PublicationCommandError(code); };
function uuid(value: unknown): value is string {
  return typeof value === "string" && value.length === 36 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value) &&
    value !== "00000000-0000-0000-0000-000000000000";
}
function exactKeys(value: object, keys: readonly string[]): void {
  if (Object.getPrototypeOf(value) !== Object.prototype ||
      Reflect.ownKeys(value).some(k => typeof k !== "string") ||
      Object.keys(value).sort().join(",") !== [...keys].sort().join(",")) fail("input");
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (!("value" in descriptor) || !descriptor.enumerable) fail("input");
  }
}
function denseDataArray(value: readonly unknown[], code: PublicationCommandError["code"]): void {
  if (Object.getPrototypeOf(value) !== Array.prototype ||
      Reflect.ownKeys(value).length !== value.length + 1) fail(code);
  for (let i = 0; i < value.length; i += 1) {
    const d = Object.getOwnPropertyDescriptor(value, String(i));
    if (!d || !("value" in d) || !d.enumerable) fail(code);
  }
}
/** Copy only bounded JSON data. A caller's later mutation must not change an already-bound request.
 * No normalization of descriptions, details, place names or units; SQL remains authoritative. */
function copyJson(value: unknown, depth = 0): unknown {
  if (depth > 8) return fail("input");
  if (value === null) return null;
  if (typeof value === "string") {
    if (value.length > 30000 || value.includes("\0")) return fail("input");
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 64) return fail("input");
    denseDataArray(value, "input");
    return Object.freeze(Array.from(value, item => copyJson(item, depth + 1)));
  }
  if (!value || typeof value !== "object") return fail("input");
  const keys = Object.keys(value); if (keys.length > 64) return fail("input");
  exactKeys(value, keys);
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    if (["__proto__", "constructor", "prototype"].includes(key) || key.length > 64) return fail("input");
    result[key] = copyJson((value as Record<string, unknown>)[key], depth + 1);
  }
  return Object.freeze(result);
}
/** Pure command binding only. Does not authenticate, authorize, persist, issue URLs or call an RPC.
 * `listing` comes from the existing ordinary form builder; the server REVALIDATES all of it.
 * A file digest is an intent declaration, never evidence that a server has verified those bytes. */
export function bindPrepareListingPublicationCommand(input: {
  expectedUserId: string; expectedIdentityId: string; requestKey: string;
  listing: ListingCreationInput; images: readonly PublicationImageDeclaration[];
}): PrepareListingPublicationCommand {
  if (!input || typeof input !== "object") return fail("input");
  exactKeys(input, ["expectedUserId", "expectedIdentityId", "requestKey", "listing", "images"]);
  if (!uuid(input.expectedUserId) || !uuid(input.expectedIdentityId) || !uuid(input.requestKey)) return fail("context");
  if (!input.listing || typeof input.listing !== "object") return fail("input");
  exactKeys(input.listing, ["basics", "price", "category_path", "location", "attributes", "details", "language"]);
  const copied = copyJson(input.listing) as ListingCreationInput;
  const price = Object.freeze(normalizeListingPriceWire(copied.price)); // existing exact-decimal registry, no Number(amount)
  const listing: ListingCreationInput = Object.freeze({ ...copied, price });
  if (new TextEncoder().encode(JSON.stringify(listing)).length > 65536) return fail("input");
  if (!Array.isArray(input.images)) return fail("images");
  if (input.images.length > LISTING_CREATE_IMAGE_LIMIT) return fail("count");
  denseDataArray(input.images, "images");
  const ids = new Set<string>(); let bytes = 0;
  const images = input.images.map(image => {
    if (!image || typeof image !== "object" || Array.isArray(image)) return fail("images");
    exactKeys(image, ["client_file_id", "byte_length", "sha256"]);
    if (!uuid(image.client_file_id) || ids.has(image.client_file_id) ||
        !Number.isSafeInteger(image.byte_length) || image.byte_length < 1 ||
        image.byte_length > LISTING_CREATE_MAX_SOURCE_IMAGE_SIZE_MB * 1024 * 1024 ||
        typeof image.sha256 !== "string" || image.sha256.length !== 64 || !/^[0-9a-f]{64}$/.test(image.sha256)) return fail("images");
    ids.add(image.client_file_id); bytes += image.byte_length;
    return Object.freeze({ client_file_id: image.client_file_id, byte_length: image.byte_length, sha256: image.sha256 });
  });
  if (bytes > 100 * 1024 * 1024) return fail("bytes");
  return Object.freeze({ p_expected_user_id: input.expectedUserId, p_expected_identity_id: input.expectedIdentityId,
    p_request_key: input.requestKey, p_input: listing, p_images: Object.freeze(images) });
}
