"use client";
import { useEffect, useState } from "react";
import { uiMessage, safeUiError } from "../../../../lib/i18n/interfaceMessage";
import { getPublicProfileBySlug } from "../../../entities/profile/api/getPublicProfileBySlug";
import type { PublicProfile } from "../../../entities/profile/model/types";
import { useViewerReadScope } from "../../../shared/provider-controls/useViewerReadScope";

export type PublicProfileState = {profile: PublicProfile | null; loading: boolean; error: string | null};
export function usePublicProfile(slug: string): PublicProfileState {
  // Temporary discovery hiding never affects a deliberate profile visit.
  const audience = useViewerReadScope("visibility"), key = `${audience.key}:${slug}`;
  const [state, setState] = useState<{key: string; profile: PublicProfile | null; error: string | null}>({key: "", profile: null, error: null});
  useEffect(() => {
    let mounted = true;
    if (!audience.ready) return;
    if (!slug) {setState({key, profile: null, error: uiMessage("the_profile_address_is_missing")}); return;}
    void getPublicProfileBySlug(slug).then(profile => {
      if (mounted) setState({key, profile, error: null});
    }).catch(error => {
      if (mounted) setState({key, profile: null, error: safeUiError(error, "could_not_load_the_public_profile_try_again")});
    });
    return () => {mounted = false;};
  }, [key, slug, audience.ready]);
  if (audience.error) return {profile: null, loading: false, error: uiMessage("could_not_load_the_public_profile_try_again")};
  return audience.ready && state.key === key ? {...state, loading: false} : {profile: null, loading: true, error: null};
}
