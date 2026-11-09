"use client";
import { useEffect, useRef } from "react";
import type { PublicProfile } from "../../../entities/profile/model/types";
import { usePublicProfileServices } from "./usePublicProfileServices";
import { useServiceReturnSnapshot } from "../../service-navigation/model/useServiceReturnSnapshot";
import { useServiceReturnRestoration } from "../../service-navigation/model/useServiceReturnRestoration";
import { saveServiceReturnContext } from "../../service-navigation/model/serviceReturnContext";

export function usePublicProfileServiceView(profile: PublicProfile, expanded: boolean,
  onExpandedChange: (expanded: boolean) => void) {
  const data = usePublicProfileServices(profile);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  const snapshot = useServiceReturnSnapshot("public-profile", `${profile.identityId ?? ""}:${profile.slug}`);
  useEffect(() => {
    if (snapshot.ready) onExpandedChange(snapshot.context?.profile?.expanded === true);
  }, [snapshot.ready, snapshot.visit, snapshot.context, onExpandedChange]);
  const viewReady = !snapshot.context?.profile || expanded === snapshot.context.profile.expanded;
  useServiceReturnRestoration({context: snapshot.context, visit: snapshot.visit,
    ready: snapshot.ready && viewReady && !data.loading && !data.error,
    serviceIds: data.services.map(service => service.id), horizontalScrollRef});
  function remember(input: {serviceId: string; cardViewportTop: number}) {
    saveServiceReturnContext({source: "public-profile", ...input,
      profile: {expanded, horizontalScrollLeft: horizontalScrollRef.current?.scrollLeft ?? 0}});
  }
  return {...data, horizontalScrollRef, remember};
}
