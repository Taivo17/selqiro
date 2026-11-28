// Synthetic authority/network boundary for a real React profile editor browser test.
// No application account, provider, storage or database request is made.
import React, {useSyncExternalStore} from "react";
import {createRoot} from "react-dom/client";
import ProfileEditorPage from "../../src/features/profile-editor/components/ProfileEditorPage.tsx";

export const U = "11111111-1111-4111-8111-111111111111", I = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
export const places = {
  EE: {country_code: "EE", country_name: "Estonia", place_name: "Paide", region_name: "Järva maakond", latitude: 58.885, longitude: 25.558,
    precision: "locality", source: "geoapify", source_id: "synthetic-paide", source_kind: "city"},
  FI: {country_code: "FI", country_name: "Finland", place_name: "Helsinki", region_name: "Uusimaa", latitude: 60.17, longitude: 24.94,
    precision: "locality", source: "geoapify", source_id: "synthetic-helsinki", source_kind: "city"},
  JP: {country_code: "JP", country_name: "Japan", place_name: "東京", region_name: "東京都", latitude: 35.68, longitude: 139.69,
    precision: "locality", source: "geoapify", source_id: "synthetic-tokyo", source_kind: "city"},
};
const business = new URLSearchParams(location.search).get("kind") === "business";
const profile = {user_id: U, identity_id: I, identity_type: business ? "business" : "private", revision: "44444444-4444-4444-8444-444444444444",
  slug: "test-profile", display_name: "Näidisprofiil", bio: "", website_url: "", country: business ? "Estonia" : "Eesti", city: "Paide",
  address_text: business ? "Vana tänav 1" : "", location_visibility: business ? "exact" : "city"};
const snapshots = new Map([[I, {profile, location: business ? places.EE : null}], [OTHER, {profile: {...profile, identity_id: OTHER,
  display_name: "Teine profiil", identity_type: "private", address_text: "", location_visibility: "city", country: "Finland", city: "Helsinki"}, location: places.FI}]]);
let generation = 1, version = 5, controller = new AbortController();
let currentActor = Object.freeze({expectedUserId: U, expectedIdentityId: I, accessToken: "synthetic.profile.user", generation, signal: controller.signal});
const listeners = new Set();
export const fixture = {requests: [], saves: [], reads: [], language: "et", slowEE: false, acknowledged: 0,
  get actor() {return currentActor;},
  get saved() {return snapshots.get(currentActor.expectedIdentityId);},
  isCurrent: actor => actor === currentActor && !actor.signal.aborted,
  switchActor() {controller.abort(); controller = new AbortController();
    currentActor = Object.freeze({...currentActor, expectedIdentityId: OTHER, generation: ++generation, signal: controller.signal});
    for (const listener of listeners) listener();},
  refresh() {controller.abort(); controller = new AbortController();
    currentActor = Object.freeze({...currentActor, generation: ++generation, signal: controller.signal}); for (const listener of listeners) listener();},
  rpc(name, args) {
    const read = {name, args: structuredClone(args), token: null, aborted: false}; fixture.reads.push(read);
    let signal;
    return {setHeader(key, value) {if (key.toLowerCase() === "authorization") read.token = value; return this;},
      abortSignal(value) {signal = value; return this;},
      then(yes, no) {return new Promise(resolve => setTimeout(() => {
        read.aborted = !!signal?.aborted;
        resolve(name === "get_my_profile_editor_v2" && args.p_expected_user_id === U
          ? {data: structuredClone(snapshots.get(args.p_expected_identity_id)), error: null}
          : {data: null, error: {code: "42501", message: "PROFILE_EDITOR_FORBIDDEN"}});
      }, 30)).then(yes, no);}};
  },
};
export function useFixtureActor() {
  const actor = useSyncExternalStore(listener => {listeners.add(listener); return () => listeners.delete(listener);}, () => currentActor, () => currentActor);
  return {actor, loading: false, anonymous: false, error: null, refresh: fixture.refresh, isCurrent: fixture.isCurrent};
}
const json = (body, status = 200) => new Response(JSON.stringify(body), {status, headers: {"content-type": "application/json"}});
window.fetch = async (url, init) => {
  if (!String(url).startsWith("/api/v2/profile-location/")) throw new Error("Unexpected external request blocked by fixture");
  const body = JSON.parse(init.body), entry = {url: String(url), body: structuredClone(body), headers: {...init.headers}, aborted: false};
  fixture.requests.push(entry);
  if (body.user_id !== U || body.identity_id !== currentActor.expectedIdentityId) return json({error: "actorChanged"}, 403);
  if (entry.url.endsWith("/suggest")) {
    // An intentionally late response ignores abort so the actual client/session must discard it.
    await new Promise(resolve => setTimeout(resolve, fixture.slowEE && body.country_code === "EE" ? 1200 : 35));
    entry.aborted = init.signal.aborted;
    const location = places[body.country_code];
    return json({suggestions: location ? [{location, proof: `synthetic.${body.country_code}.choice`, expires_at: 4102444800}] : []});
  }
  if (!entry.url.endsWith("/save")) return json({error: "invalid"}, 400);
  const saved = snapshots.get(body.identity_id);
  if (saved.profile.revision !== body.expected_revision) return json({error: "conflict"}, 409);
  let location = saved.location;
  if (body.location.action === "select") location = places[body.location.proof.split(".")[1]];
  else if (body.location.action === "clear") location = null;
  if (body.location.action === "select" && (!location || body.patch.country !== location.country_name || body.patch.city !== location.place_name))
    return json({error: "invalid"}, 400);
  if (body.location.action === "clear" && (body.patch.country || body.patch.city)) return json({error: "invalid"}, 400);
  await new Promise(resolve => setTimeout(resolve, 50));
  const next = {profile: {...saved.profile, ...body.patch, revision: `55555555-5555-4555-8555-${String(++version).padStart(12, "0")}`}, location};
  snapshots.set(body.identity_id, next); fixture.saves.push(structuredClone(body));
  return json(next);
};
window.__profileLocation = fixture;
createRoot(document.getElementById("root")).render(<main className="min-h-screen bg-neutral-50 px-4 py-6"><ProfileEditorPage/></main>);
