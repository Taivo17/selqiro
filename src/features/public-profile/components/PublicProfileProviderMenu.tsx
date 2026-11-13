"use client";
import type { PublicProfile } from "../../../entities/profile/model/types";
import ProviderMenu from "../../viewer-provider-controls/components/ProviderMenu";
import { useProviderControlsContext } from "../../viewer-provider-controls/components/ProviderControlsBoundary";

type Profile = Pick<PublicProfile, "identityId" | "identityType" | "legacyUserId" | "displayName">;

export default function PublicProfileProviderMenu({profile}: {profile: Profile}) {
  const controls = useProviderControlsContext();
  if (!controls || !profile.identityId) return null;
  // The public row identifies a private profile's owner. Business ownership and
  // active membership remain server-checked; this row does not prove either.
  const ownPrivateProfile = profile.identityType === "private" && !!profile.legacyUserId
    && profile.legacyUserId === controls.account.actor?.userId;
  if (ownPrivateProfile) return null;
  return <ProviderMenu target={{type: "profile", id: profile.identityId}} name={profile.displayName} />;
}
