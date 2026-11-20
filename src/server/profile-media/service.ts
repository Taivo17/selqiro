import "server-only";
import { ListingContactError } from "../../entities/conversation/model/listingContact";
import { PROFILE_MEDIA_LIMITS, ProfileMediaError, profileMediaFail, profileMediaObjectName, profileMediaRecord,
  copyProfileMediaActor, copyProfileMediaUploadBody, copyProfileMediaUpdateCommand, parseProfileMediaSnapshot, parseProfileMediaUploadReceipt,
  type ProfileMediaActor, type ProfileMediaUploadBody } from "../../entities/profile/model/profileMedia";
import type { MessageMediaConfig, MessageMediaFetch, MessageMediaTransport } from "../messaging-media/transport";
import { canonicalProfileImage, profileImageHash } from "./imageCodec";
import { createProfileMediaTransport } from "./transport";

type Dependencies = Readonly<{ fetcher?: MessageMediaFetch; transport?: MessageMediaTransport; canonicalize?: typeof canonicalProfileImage }>;
const actorArgs = (c: ProfileMediaActor) => ({ p_expected_user_id: c.expectedUserId, p_expected_identity_id: c.expectedIdentityId });
const BINDING_KEYS = ["asset_id", "user_id", "identity_id", "slot", "object_name", "status"];
function binding(value: unknown, c: ProfileMediaUploadBody, finished = false) {
  const r = profileMediaRecord(value, finished ? [...BINDING_KEYS, "sha256", "byte_size", "width", "height"] : BINDING_KEYS, "response");
  if (r.asset_id !== c.assetId || r.user_id !== c.expectedUserId || r.identity_id !== c.expectedIdentityId || r.slot !== c.slot
    || r.object_name !== profileMediaObjectName(c.expectedIdentityId, c.assetId)
    || !(finished ? ["ready", "active"] : ["pending", "ready", "active"]).includes(String(r.status))) return profileMediaFail("response");
  return r;
}
async function execute<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (error) {
    if (error instanceof ProfileMediaError) throw error;
    if (error instanceof ListingContactError) return profileMediaFail(error.code);
    return profileMediaFail("outcome_unknown");
  }
}
export function createProfileMediaService(config: MessageMediaConfig, dependencies: Dependencies = {}) {
  const transport = dependencies.transport ?? createProfileMediaTransport(config, dependencies.fetcher);
  const canonicalize = dependencies.canonicalize ?? canonicalProfileImage;
  return Object.freeze({
    snapshot(token: string, input: unknown, signal?: AbortSignal) { return execute(async () => {
      const c = copyProfileMediaActor(input);
      await transport.authenticate(token, c.expectedUserId, signal);
      return parseProfileMediaSnapshot(await transport.rpc("get_my_profile_media_v1", actorArgs(c), token, signal), c, config.projectOrigin);
    }); },
    upload(token: string, input: unknown, signal?: AbortSignal) { return execute(async () => {
      const c = copyProfileMediaUploadBody(input);
      const source = new Uint8Array(Buffer.from(c.imageBase64, "base64"));
      if (source.length !== c.sourceBytes || Buffer.from(source).toString("base64") !== c.imageBase64 || profileImageHash(source) !== c.sourceSha256)
        return profileMediaFail("input");
      await transport.authenticate(token, c.expectedUserId, signal);
      const lease = binding(await transport.rpc("begin_my_profile_media_v1", { ...actorArgs(c), p_expected_revision: c.expectedRevision,
        p_asset_id: c.assetId, p_slot: c.slot }, token, signal), c);
      const canonical = await canonicalize(source, c.slot, c.sourceMime);
      if (signal?.aborted) return profileMediaFail("aborted");
      const path = profileMediaObjectName(c.expectedIdentityId, c.assetId);
      if (lease.status === "pending") {
        // A lost write acknowledgement is not failure or permission to overwrite.
        // The immutable reservation's bytes must be independently read back.
        try { await transport.writeObject("identity-media", path, canonical.bytes, signal); }
        catch { if (signal?.aborted) return profileMediaFail("aborted"); }
      }
      const maximum = c.slot === "avatar" ? PROFILE_MEDIA_LIMITS.avatarBytes : PROFILE_MEDIA_LIMITS.coverBytes;
      const stored = await transport.readObject("identity-media", path, maximum, signal);
      if (stored.status !== 200 || stored.bytes.length !== canonical.bytes.length || profileImageHash(stored.bytes) !== canonical.sha256)
        return profileMediaFail("outcome_unknown");
      const ready = binding(await transport.rpc("finish_profile_media_upload_v1", { p_asset_id: c.assetId, p_user_id: c.expectedUserId,
        p_identity_id: c.expectedIdentityId, p_sha256: canonical.sha256, p_byte_size: canonical.bytes.length,
        p_width: canonical.width, p_height: canonical.height }, null, signal), c, true);
      if (ready.sha256 !== canonical.sha256 || ready.byte_size !== canonical.bytes.length || ready.width !== canonical.width || ready.height !== canonical.height)
        return profileMediaFail("response");
      return parseProfileMediaUploadReceipt({ user_id: c.expectedUserId, identity_id: c.expectedIdentityId, asset_id: c.assetId, slot: c.slot,
        status: "ready", url: config.projectOrigin + "/storage/v1/object/public/identity-media/" + path,
        width: canonical.width, height: canonical.height }, c, config.projectOrigin);
    }); },
    update(token: string, input: unknown, signal?: AbortSignal) { return execute(async () => {
      const c = copyProfileMediaUpdateCommand(input);
      await transport.authenticate(token, c.expectedUserId, signal);
      // One authenticated compare-and-set. Never retry an unknown final write;
      // the caller reads a fresh snapshot and reconciles this asset/position.
      const result = parseProfileMediaSnapshot(await transport.rpc("update_my_profile_media_v1", { ...actorArgs(c),
        p_expected_revision: c.expectedRevision, p_slot: c.slot, p_action: c.action, p_asset_id: c.assetId,
        p_focus_x: c.focusX, p_focus_y: c.focusY, p_zoom: c.zoom }, token, signal), c, config.projectOrigin);
      if (!result.revision || result.revision === c.expectedRevision || (c.action === "remove" ? result[c.slot] !== null : result[c.slot]?.asset_id !== c.assetId)
        || (c.slot === "cover" && (result.focus_x !== c.focusX || result.focus_y !== c.focusY || result.zoom !== c.zoom))) return profileMediaFail("response");
      return result;
    }); },
  });
}
