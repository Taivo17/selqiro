import type { ProductShowcase } from "./types";

export const PRODUCT_SHOWCASE_ACTIVITY_WARNING_DAYS =
  30;

export const PRODUCT_SHOWCASE_ACTIVITY_URGENT_DAYS =
  7;

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

export type ProductShowcaseActivityState =
  | "not_published"
  | "active"
  | "warning"
  | "urgent"
  | "expired"
  | "invalid";

export type ProductShowcaseActivity = {
  state: ProductShowcaseActivityState;
  activeUntil: string | null;
  daysLeft: number | null;
  publiclyVisible: boolean;
};

export function getProductShowcaseActivity(
  showcase: ProductShowcase,
  now = Date.now()
): ProductShowcaseActivity {
  if (showcase.status !== "published") {
    return {
      state: "not_published",
      activeUntil: showcase.activeUntil,
      daysLeft: null,
      publiclyVisible: false,
    };
  }

  if (!showcase.activeUntil) {
    return {
      state: "invalid",
      activeUntil: null,
      daysLeft: null,
      publiclyVisible: false,
    };
  }

  const activeUntilTime =
    new Date(showcase.activeUntil).getTime();

  if (!Number.isFinite(activeUntilTime)) {
    return {
      state: "invalid",
      activeUntil: showcase.activeUntil,
      daysLeft: null,
      publiclyVisible: false,
    };
  }

  const remainingMilliseconds =
    activeUntilTime - now;

  if (remainingMilliseconds <= 0) {
    return {
      state: "expired",
      activeUntil: showcase.activeUntil,
      daysLeft: 0,
      publiclyVisible: false,
    };
  }

  const daysLeft = Math.ceil(
    remainingMilliseconds /
      MILLISECONDS_PER_DAY
  );

  if (
    daysLeft <=
    PRODUCT_SHOWCASE_ACTIVITY_URGENT_DAYS
  ) {
    return {
      state: "urgent",
      activeUntil: showcase.activeUntil,
      daysLeft,
      publiclyVisible: true,
    };
  }

  if (
    daysLeft <=
    PRODUCT_SHOWCASE_ACTIVITY_WARNING_DAYS
  ) {
    return {
      state: "warning",
      activeUntil: showcase.activeUntil,
      daysLeft,
      publiclyVisible: true,
    };
  }

  return {
    state: "active",
    activeUntil: showcase.activeUntil,
    daysLeft,
    publiclyVisible: true,
  };
}

export function isProductShowcasePubliclyActive(
  showcase: ProductShowcase,
  now = Date.now()
): boolean {
  return getProductShowcaseActivity(
    showcase,
    now
  ).publiclyVisible;
}
