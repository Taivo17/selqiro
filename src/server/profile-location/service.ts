import "server-only";
import { isLocationCountry } from "../../entities/location/model/countries";
import { exactLocationKeys, locationText, parseSelectedLocation, sameSelectedLocation, type SelectedLocation } from "../../entities/location/model/location";
import { parseProfileSnapshot, profileUuid, sameProfilePatch, validateProfilePatch,
  type ProfileEditorSnapshot } from "../../features/profile-editor/model/profileEditor";
import type { MessageMediaConfig, MessageMediaFetch } from "../messaging-media/transport";
import { locationFail } from "./errors";
import { createLocationProofs } from "./proof";
import { createLocationProvider } from "./provider";
import { createLocationTransport } from "./transport";

type Actor = Readonly<{user_id: string; identity_id: string}>;
function actor(value: Record<string, unknown>): Actor {
  if (!profileUuid(value.user_id) || !profileUuid(value.identity_id)) return locationFail("invalid");
  return {user_id: value.user_id, identity_id: value.identity_id};
}
const ownerArgs = (value: Actor) => ({p_expected_user_id: value.user_id, p_expected_identity_id: value.identity_id});
function snapshot(value: unknown, owner: Actor): {profile: ProfileEditorSnapshot; location: SelectedLocation | null} {
  if (!exactLocationKeys(value, ["profile", "location"])) return locationFail("unknown");
  let profile: ProfileEditorSnapshot;
  try { profile = parseProfileSnapshot(value.profile, {userId: owner.user_id, identityId: owner.identity_id}); }
  catch { return locationFail("unknown"); }
  const location = value.location === null ? null : parseSelectedLocation(value.location);
  if ((value.location !== null && !location) || (location && (location.country_name !== profile.country || location.place_name !== profile.city))) return locationFail("unknown");
  return {profile, location};
}
type Config = MessageMediaConfig & Readonly<{appOrigin: string}>;
type Options = {fetcher?: MessageMediaFetch; now?: () => number; provider?: ReturnType<typeof createLocationProvider>;
  transport?: ReturnType<typeof createLocationTransport>};
export function createLocationService(config: Config, apiKey: string | null, options: Options = {}) {
  const transport = options.transport ?? createLocationTransport(config, options.fetcher);
  const provider = options.provider ?? createLocationProvider(apiKey, options.fetcher);
  const proofs = createLocationProofs(config.serviceKey, config.projectOrigin, config.appOrigin, options.now);
  async function current(owner: Actor, token: string, signal: AbortSignal) {
    await transport.authenticate(token, owner.user_id, signal);
    if (signal.aborted) return locationFail("unknown");
    return snapshot(await transport.rpc("get_my_profile_editor_v2", ownerArgs(owner), token, signal), owner);
  }
  return Object.freeze({
    async suggest(token: string, value: unknown, signal: AbortSignal) {
      if (!exactLocationKeys(value, ["user_id", "identity_id", "country_code", "query", "language"])) return locationFail("invalid");
      const owner = actor(value);
      if (!isLocationCountry(value.country_code) || !locationText(value.query, 120) || Array.from(value.query).length < 2
        || (value.language !== "en" && value.language !== "et")) return locationFail("invalid");
      await current(owner, token, signal);
      if (!provider.configured) return locationFail("unavailable");
      const budget = await transport.rpc("reserve_profile_location_lookup_v1", ownerArgs(owner), null, signal);
      if (!exactLocationKeys(budget, ["allowed", "retry_after_seconds"]) || typeof budget.allowed !== "boolean"
        || !Number.isSafeInteger(budget.retry_after_seconds) || Number(budget.retry_after_seconds) < 0 || Number(budget.retry_after_seconds) > 86400) return locationFail("unknown");
      if (!budget.allowed) return locationFail("rateLimited");
      if (signal.aborted) return locationFail("unknown");
      const suggestions = await provider.suggest(value.country_code, value.query, value.language, signal);
      if (signal.aborted) return locationFail("unknown");
      return {suggestions: suggestions.map(location => proofs.issue(location, owner))};
    },
    async save(token: string, value: unknown, signal: AbortSignal) {
      if (!exactLocationKeys(value, ["user_id", "identity_id", "expected_revision", "patch", "location"])) return locationFail("invalid");
      const owner = actor(value);
      if (value.expected_revision !== null && !profileUuid(value.expected_revision)) return locationFail("invalid");
      const before = await current(owner, token, signal);
      if (before.profile.revision !== value.expected_revision) return locationFail("conflict");
      const checked = validateProfilePatch(value.patch, before.profile.identity_type);
      if (!checked.patch) return locationFail("invalid");
      const command = value.location;
      let expectedLocation = before.location;
      let databaseCommand: {action: "keep" | "clear"} | {action: "select"; selection_id: string};
      if (exactLocationKeys(command, ["action"]) && command.action === "keep") {
        if (checked.patch.country !== before.profile.country || checked.patch.city !== before.profile.city) return locationFail("invalid");
        databaseCommand = {action: "keep"};
      } else if (exactLocationKeys(command, ["action"]) && command.action === "clear") {
        if (checked.patch.country !== "" || checked.patch.city !== "") return locationFail("invalid");
        expectedLocation = null; databaseCommand = {action: "clear"};
      } else if (exactLocationKeys(command, ["action", "proof"]) && command.action === "select") {
        expectedLocation = proofs.verify(command.proof, owner);
        if (checked.patch.country !== expectedLocation.country_name || checked.patch.city !== expectedLocation.place_name) return locationFail("invalid");
        if (signal.aborted) return locationFail("unknown");
        const selection = await transport.rpc("prepare_profile_location_v1", {...ownerArgs(owner), p_location: expectedLocation}, null, signal);
        if (!exactLocationKeys(selection, ["selection_id"]) || !profileUuid(selection.selection_id)) return locationFail("unknown");
        databaseCommand = {action: "select", selection_id: selection.selection_id};
      } else return locationFail("invalid");
      if (signal.aborted) return locationFail("unknown");
      const after = snapshot(await transport.rpc("save_my_profile_editor_v2", {...ownerArgs(owner), p_expected_revision: value.expected_revision,
        p_patch: checked.patch, p_location_command: databaseCommand}, token, signal), owner);
      if (after.profile.identity_type !== before.profile.identity_type || after.profile.revision === null
        || after.profile.revision === value.expected_revision || !sameProfilePatch(after.profile, checked.patch)
        || !sameSelectedLocation(after.location, expectedLocation)) return locationFail("unknown");
      return after;
    },
  });
}
