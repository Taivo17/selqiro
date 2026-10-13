import { PRIVATE_UPLOAD, copyUploadCommand, copyUploadBinding, copyPrivateUploadGrant, inspectUploadToken,
  publicationStorageOrigin, uploadRecord, uploadFail, type UploadCommand, type PrivateUploadGrant } from "../../../entities/listing/model/privatePublicationUpload";
import { privateUploadHttp, type UploadFetch } from "../../../entities/listing/api/privateUploadHttp";
export type UploadIssueResult = Readonly<{ kind: "grant"; grant: PrivateUploadGrant }> |
  Readonly<{ kind: "reconcile_same_slot"; attemptId: string; slotId: string }>;
type Config = Readonly<{ projectOrigin: string; publicKey: string; serviceKey: string }>;
/** Server-only USE of this factory: environment loading lives in supabaseUploadBroker.
 * Test injection remaps HTTPS requests to a local HTTP model. No injected global state.
 * SQL acknowledgements must precede external signing and precede grant release. */
export function createPrivateUploadIssuer(config: Config, fetcher: UploadFetch = fetch) {
  const origin = publicationStorageOrigin(config.projectOrigin);
  const { publicKey, serviceKey } = config;
  for (const key of [publicKey, serviceKey]) {
    if (typeof key !== "string" || key.length < 1 || key.length > 8192 || /\s/.test(key)) uploadFail("configuration");
  }
  return async function issuePrivateUpload(accessToken: string, input: UploadCommand,
      signal?: AbortSignal): Promise<UploadIssueResult> {
    const cmd = copyUploadCommand(input);
    if (typeof accessToken !== "string" || !accessToken || accessToken.length > 8192 || /\s/.test(accessToken)) return uploadFail("unauthorized");
    const userHeaders = { apikey: publicKey, authorization: "Bearer " + accessToken, "content-type": "application/json" };
    const serviceHeaders = { apikey: serviceKey, authorization: "Bearer " + serviceKey, "content-type": "application/json" };
    const args = { p_expected_user_id: cmd.expectedUserId, p_expected_identity_id: cmd.expectedIdentityId,
      p_attempt_id: cmd.attemptId, p_slot_id: cmd.slotId, p_dispatch_key: cmd.dispatchKey };
    async function rpc(name: string, body: object, service = false): Promise<unknown> {
      const r = await privateUploadHttp(fetcher, origin + "/rest/v1/rpc/" + name,
        { method: "POST", headers: service ? serviceHeaders : userHeaders, body: JSON.stringify(body) }, { signal });
      if (r.status === 401 || r.status === 403) return uploadFail("unauthorized");
      if (r.status !== 200) return uploadFail("outcome_unknown");
      return r.json;
    }
    // Server-validated user from Auth, NEVER locally decoded JWT claims.
    const auth = await privateUploadHttp(fetcher, origin + "/auth/v1/user",
      { method: "GET", headers: userHeaders }, { signal, responseBytes: 65536 });
    if (auth.status !== 200) return uploadFail("unauthorized");
    if (uploadRecord(auth.json).id !== cmd.expectedUserId) return uploadFail("context_changed");
    const reserve = uploadRecord(await rpc("reserve_my_listing_upload_v1", args), ["binding"]);
    if (reserve.binding === null) return Object.freeze({ kind: "reconcile_same_slot", attemptId: cmd.attemptId, slotId: cmd.slotId });
    const binding = copyUploadBinding(reserve.binding, cmd);
    // An authenticated reservation does NOT grant the right to sign: the private
    // service claim has its own durable one-winner fence and rechecks actor/policies.
    const claim = uploadRecord(await rpc("claim_listing_upload_sign_v1", { ...args, p_grant_id: binding.grant_id }, true),
      ["binding", "sign_allowed", "claim_id", "send_before_epoch"]);
    const claimedBinding = copyUploadBinding(claim.binding, cmd);
    if (Object.keys(binding).some(k => claimedBinding[k as keyof typeof binding] !== binding[k as keyof typeof binding])) return uploadFail("invalid_response");
    if (typeof claim.sign_allowed !== "boolean") return uploadFail("invalid_response");
    if (claim.sign_allowed) {
      const cc = copyUploadCommand({ ...cmd, dispatchKey: claim.claim_id });
      if (!Number.isSafeInteger(claim.send_before_epoch) || Number(claim.send_before_epoch) <= Math.floor(Date.now() / 1000) ||
          Number(claim.send_before_epoch) > Math.floor(Date.now() / 1000) + PRIVATE_UPLOAD.signWindowSeconds + 60) return uploadFail("grant_unavailable");
      // ONE signing request, after the claim transaction's acknowledgement. Never retry
      // after a timeout, cancellation, 5xx or malformed response: remote issuance may exist.
      const r = await privateUploadHttp(fetcher, origin + "/storage/v1/object/upload/sign/" + binding.bucket_id + "/" + binding.object_path,
        { method: "POST", headers: { ...serviceHeaders, "x-upsert": "false" }, body: "{}" }, { signal });
      if (r.status !== 200) return uploadFail("outcome_unknown");
      const value = uploadRecord(r.json);
      const prefix = "/object/upload/sign/" + binding.bucket_id + "/" + binding.object_path + "?token=";
      if (typeof value.url !== "string" || !value.url.startsWith(prefix)) return uploadFail("invalid_response");
      const token = value.url.slice(prefix.length);
      // A JWT's base64url alphabet needs no URL escaping. Reject extra query parameters,
      // absolute URLs, encoded delimiters, redirects, wrong paths and mismatching duplicates.
      const times = inspectUploadToken(token, binding.object_path);
      if (value.token !== undefined && value.token !== token) return uploadFail("invalid_response");
      if (times.issued_epoch > Math.floor(Date.now() / 1000) + 60 ||
          times.issued_epoch > Number(claim.send_before_epoch) + 60 ||
          times.expires_epoch <= Math.floor(Date.now() / 1000)) return uploadFail("grant_unavailable");
      const receipt = uploadRecord(await rpc("record_listing_upload_grant_v1", {
        p_grant_id: binding.grant_id, p_claim_id: cc.dispatchKey, p_token: token,
        p_issued_epoch: times.issued_epoch, p_expires_epoch: times.expires_epoch,
      }, true), ["recorded"]);
      if (receipt.recorded !== true) return uploadFail("outcome_unknown");
    }
    // A lost record acknowledgement or application response is recovered on a NEW
    // explicit call by reading the same token, not signing again. Auth/identity/policy
    // and open-attempt/expiry conditions are rechecked by SQL before any secret release.
    const read = uploadRecord(await rpc("get_my_listing_upload_grant_v1", { ...args, p_grant_id: binding.grant_id }), ["state", "grant"]);
    if (read.state === "pending" && read.grant === null) return Object.freeze({ kind: "reconcile_same_slot", attemptId: cmd.attemptId, slotId: cmd.slotId });
    if (read.state === "expired" && read.grant === null) return uploadFail("grant_unavailable");
    if (read.state !== "ready") return uploadFail("invalid_response");
    const grant = copyPrivateUploadGrant(read.grant, cmd, Date.now());
    if (grant.grant_id !== binding.grant_id || grant.object_id !== binding.object_id ||
        grant.expected_bytes !== binding.expected_bytes || grant.expected_sha256 !== binding.expected_sha256) return uploadFail("invalid_response");
    return Object.freeze({ kind: "grant", grant });
  };
}
