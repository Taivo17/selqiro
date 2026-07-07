export type PublicProfile = {
  identityId: string | null;
  identityType: string | null;
  legacyUserId: string | null;
  displayName: string;
  slug: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bannerDominantColor: string | null;
  country: string | null;
  city: string | null;
  locationLabel: string;
};
