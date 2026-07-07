export type IdentityType = "private" | "business";

export type IdentitySummary = {
  id: string;
  type: IdentityType;
  displayName: string;
  avatarUrl: string | null;
  slug: string | null;
};

export type ActiveIdentityState = {
  identity: IdentitySummary | null;
  loading: boolean;
  error: string | null;
};
