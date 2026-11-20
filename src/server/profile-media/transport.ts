import "server-only";
import { profileMediaFail } from "../../entities/profile/model/profileMedia";
import { boundedMediaFetch, checkedMediaOrigin, createMediaTransport, type MessageMediaConfig,
  type MessageMediaFetch, type MessageMediaTransport } from "../messaging-media/transport";

/** Keep existing bounded transport and Storage behavior. Only profile admission
 * has its own expected rate response; no messaging error semantics are changed. */
export function createProfileMediaTransport(config: MessageMediaConfig, fetcher: MessageMediaFetch = fetch): MessageMediaTransport {
  const common = createMediaTransport(config, fetcher), origin = checkedMediaOrigin(config.projectOrigin);
  return Object.freeze({ ...common,
    async rpc(name: string, args: object, token: string | null, signal?: AbortSignal) {
      if (name !== "begin_my_profile_media_v1") return common.rpc(name, args, token, signal);
      if (!token || !/^[A-Za-z0-9._-]{1,8192}$/.test(token)) return profileMediaFail("unauthorized");
      const response = await boundedMediaFetch(fetcher, origin + "/rest/v1/rpc/" + name, { method: "POST",
        headers: { apikey: config.publicKey, authorization: "Bearer " + token, "content-type": "application/json" },
        body: JSON.stringify(args) }, 65536, signal);
      if (response.status === 429) return profileMediaFail("rate_limited");
      if (response.status !== 200) return profileMediaFail([400, 401, 403, 404, 409, 422].includes(response.status) ? "refused" : "outcome_unknown");
      try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(response.bytes)) as unknown; }
      catch { return profileMediaFail("response"); }
    },
  });
}
