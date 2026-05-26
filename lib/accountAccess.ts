export const ADMIN_EMAIL = "taiwo17@gmail.com";

export function isAdminEmail(email?: string | null) {
  return !!email && email.toLowerCase() === ADMIN_EMAIL;
}

export function isPremiumActive(profile?: {
  is_premium?: boolean | null;
  premium_until?: string | null;
}) {
  if (!profile) return false;

  if (profile.is_premium && profile.premium_until) {
    return new Date(profile.premium_until).getTime() > Date.now();
  }

  return false;
}

export function hasPremiumAccess(
  email?: string | null,
  profile?: {
    is_premium?: boolean | null;
    premium_until?: string | null;
  }
) {
  if (isAdminEmail(email)) {
    return true;
  }

  return isPremiumActive(profile);
}