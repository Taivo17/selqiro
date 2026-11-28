import "server-only";
import { boundedMediaFetch, checkedMediaOrigin, type MessageMediaConfig, type MessageMediaFetch } from "../messaging-media/transport";
import { databaseLocationError, locationFail } from "./errors";

export function createLocationTransport(config: MessageMediaConfig, fetcher: MessageMediaFetch = fetch) {
  const origin = checkedMediaOrigin(config.projectOrigin);
  function parse(bytes: Uint8Array): unknown {
    try { return JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(bytes)); } catch { return locationFail("unknown"); }
  }
  return Object.freeze({
    async authenticate(token: string, userId: string, signal: AbortSignal) {
      const result = await boundedMediaFetch(fetcher, origin + "/auth/v1/user", {method: "GET",
        headers: {apikey: config.publicKey, authorization: "Bearer " + token}}, 65536, signal);
      if (result.status !== 200) return locationFail("authChanged");
      const row = parse(result.bytes);
      if (!row || typeof row !== "object" || Array.isArray(row) || (row as {id?: unknown}).id !== userId) return locationFail("authChanged");
    },
    async rpc(name: string, args: object, token: string | null, signal: AbortSignal): Promise<unknown> {
      if (!["get_my_profile_editor_v2", "save_my_profile_editor_v2", "prepare_profile_location_v1", "reserve_profile_location_lookup_v1"].includes(name)) return locationFail("unknown");
      if (signal.aborted) return locationFail("unknown");
      const credential = token ?? config.serviceKey;
      const result = await boundedMediaFetch(fetcher, origin + "/rest/v1/rpc/" + name, {method: "POST",
        headers: {apikey: token === null ? config.serviceKey : config.publicKey, authorization: "Bearer " + credential, "content-type": "application/json"},
        body: JSON.stringify(args)}, 65536, signal);
      const body = parse(result.bytes);
      if (result.status !== 200) throw databaseLocationError(body);
      return body;
    },
  });
}
