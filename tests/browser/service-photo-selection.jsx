import React from "react";
import {createRoot} from "react-dom/client";
import {fixture} from "selqiro-browser-fixture";
import ServiceEditor from "../../src/features/service-editor/components/ServiceEditor";
import MyAreaServicesSection from "../../src/features/service-editor/components/MyAreaServicesSection";
import PublicProfileServicesSection from "../../src/features/public-profile/components/PublicProfileServicesSection";
import {beginIdentityChange, finishIdentityChange} from "../../src/features/v2-shell/model/identityEvents";

// This entry is only bundled by the local browser regression runner. It is not
// an application route and all data boundaries resolve to synthetic fixtures.
window.__serviceBrowser = Object.assign(fixture, {beginIdentityChange, finishIdentityChange});
const nativeCreate = URL.createObjectURL.bind(URL), nativeRevoke = URL.revokeObjectURL.bind(URL);
URL.createObjectURL = file => {const url = nativeCreate(file); fixture.createdUrls.push(url); return url;};
URL.revokeObjectURL = url => {fixture.revokedUrls.push(url); nativeRevoke(url);};
document.addEventListener("change", event => {
  if (event.target instanceof HTMLInputElement && event.target.type === "file") {
    fixture.lastSelectedFile = event.target.files?.[0] ?? null;
  }
}, true);

const profile = {identityId: fixture.actor.identityId, slug: "synthetic-service-provider"};
const view = new URLSearchParams(location.search).get("view");
createRoot(document.getElementById("root")).render(
  <main style={{maxWidth: 1120, margin: "24px auto", padding: "0 16px"}}>
    {view === "lists" ? <div style={{display: "grid", gap: 28}}>
      <div data-case="my-area"><MyAreaServicesSection /></div>
      <div data-case="profile-preview"><PublicProfileServicesSection profile={profile} expanded={false} onExpandedChange={() => {}} /></div>
      <div data-case="profile-expanded"><PublicProfileServicesSection profile={profile} expanded onExpandedChange={() => {}} /></div>
    </div> : <ServiceEditor userId={fixture.actor.userId} serviceId={fixture.create ? null : fixture.serviceId} />}
  </main>
);
