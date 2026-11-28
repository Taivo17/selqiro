import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { exactLocationKeys, parseSelectedLocation, type SelectedLocation } from "../../entities/location/model/location";
import { locationFail } from "./errors";

const PURPOSE = "selqiro.profile-location.selection.v1";
const TTL = 1800;
type ProofActor = Readonly<{user_id: string; identity_id: string}>;
export function createLocationProofs(serviceKey: string, projectOrigin: string, appOrigin: string, now = () => Date.now()) {
  // A distinct derived key/domain prevents interchange with Supabase access tokens.
  const key = createHmac("sha256", serviceKey).update(PURPOSE + "\n" + projectOrigin + "\n" + appOrigin).digest();
  const signature = (payload: string) => createHmac("sha256", key).update(payload, "ascii").digest();
  return Object.freeze({
    issue(location: SelectedLocation, actor: ProofActor) {
      const issued_at = Math.floor(now() / 1000), expires_at = issued_at + TTL;
      const payload = Buffer.from(JSON.stringify({purpose: PURPOSE, ...actor, issued_at, expires_at, location}), "utf8").toString("base64url");
      return Object.freeze({location, proof: payload + "." + signature(payload).toString("base64url"), expires_at});
    },
    verify(proof: unknown, actor: ProofActor): SelectedLocation {
      if (typeof proof !== "string" || proof.length > 16384 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(proof)) return locationFail("invalid");
      const [payload, signed] = proof.split("."), bytes = Buffer.from(signed, "base64url");
      if (bytes.length !== 32 || bytes.toString("base64url") !== signed || !timingSafeEqual(bytes, signature(payload))) return locationFail("invalid");
      let value: unknown;
      try {
        const decoded = Buffer.from(payload, "base64url");
        if (decoded.toString("base64url") !== payload) return locationFail("invalid");
        value = JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(decoded));
      } catch { return locationFail("invalid"); }
      if (!exactLocationKeys(value, ["purpose", "user_id", "identity_id", "issued_at", "expires_at", "location"])
        || value.purpose !== PURPOSE || value.user_id !== actor.user_id || value.identity_id !== actor.identity_id
        || !Number.isSafeInteger(value.issued_at) || !Number.isSafeInteger(value.expires_at)
        || Number(value.expires_at) !== Number(value.issued_at) + TTL || Number(value.issued_at) > Math.floor(now() / 1000) + 30) return locationFail("invalid");
      if (Number(value.expires_at) <= Math.floor(now() / 1000)) return locationFail("selectionExpired");
      return parseSelectedLocation(value.location) ?? locationFail("invalid");
    },
  });
}
