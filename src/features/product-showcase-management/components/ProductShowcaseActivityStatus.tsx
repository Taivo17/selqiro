"use client";

import { localeForLanguage } from "../../../../lib/i18n/useTranslation";
import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import {
  getProductShowcaseActivity,
  type ProductShowcaseActivity,
} from "../../../entities/product-showcase/model/activity";
import type { ProductShowcase } from "../../../entities/product-showcase/model/types";

type ProductShowcaseActivityStatusProps = {
  showcase: ProductShowcase;
  now: number | null;
};

type ActivityPresentation = {
  label: string;
  message: string;
  className: string;
};

function formatActivityDate(
  value: string | null,
  language: "en" | "et"
): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(localeForLanguage(language), {
    dateStyle: "medium",
  }).format(date);
}

function remainingDaysLabel(
  daysLeft: number
): string {
  return daysLeft === 1
    ? marketplaceMessage("showcase.1_day.e325ce")
    : marketplaceMessage("showcase.value_days.f7b402", { p0: String(daysLeft) });
}

function getActivityPresentation(
  activity: ProductShowcaseActivity,
  language: "en" | "et"
): ActivityPresentation | null {
  const dateLabel =
    formatActivityDate(
      activity.activeUntil,
      language
    );

  const daysLabel =
    remainingDaysLabel(
      activity.daysLeft || 0
    );

  if (activity.state === "active") {
    return {
      label: marketplaceMessage("showcase.active.ec7011"),
      message:
        marketplaceMessage("showcase.public_until_value.89150a", { p0: String(dateLabel) }) +
        marketplaceMessage("showcase.value_remaining.fe3209", { p0: String(daysLabel) }),
      className:
        "border-emerald-100 bg-emerald-50 text-emerald-800",
    };
  }

  if (activity.state === "warning") {
    return {
      label: marketplaceMessage("showcase.expires_soon.89c0d1"),
      message:
        marketplaceMessage("showcase.review_the_details_before_value.6d0bae", { p0: String(dateLabel) }) +
        marketplaceMessage("showcase.value_remaining.fe3209", { p0: String(daysLabel) }),
      className:
        "border-amber-200 bg-amber-50 text-amber-900",
    };
  }

  if (activity.state === "urgent") {
    return {
      label: marketplaceMessage("showcase.expires_very_soon.90d84e"),
      message:
        marketplaceMessage("showcase.review_the_details_before_value.4128f3", { p0: String(dateLabel) }) +
        marketplaceMessage("showcase.value_remaining.fe3209", { p0: String(daysLabel) }),
      className:
        "border-orange-200 bg-orange-50 text-orange-900",
    };
  }

  if (activity.state === "expired") {
    return {
      label: marketplaceMessage("showcase.expired.00e195"),
      message:
        marketplaceMessage("showcase.the_deadline_was_value.11e23c", { p0: String(dateLabel) }) +
        marketplaceMessage("showcase.the_product_showcase_is_not_visible_on_the.25b9dd") +
        marketplaceMessage("showcase.but_remains_in_my_area.22dcd0"),
      className:
        "border-red-200 bg-red-50 text-red-900",
    };
  }

  if (activity.state === "invalid") {
    return {
      label: marketplaceMessage("showcase.needs_review.95fc34"),
      message:
        marketplaceMessage("showcase.the_active_period_could_not_be_displayed.6dac33") +
        marketplaceMessage("showcase.refresh_the_page_and_check_the_product_showcase.71d0fa"),
      className:
        "border-red-200 bg-red-50 text-red-900",
    };
  }

  return null;
}

export default function ProductShowcaseActivityStatus({
  showcase,
  now,
}: ProductShowcaseActivityStatusProps) {
  const { language, r } = useMarketplaceTranslation();
  if (
    now === null ||
    showcase.status !== "published"
  ) {
    return null;
  }

  const activity =
    getProductShowcaseActivity(
      showcase,
      now
    );

  const presentation =
    getActivityPresentation(activity, language);

  if (!presentation) {
    return null;
  }

  return (
    <div
      className={[
        "mt-3 rounded-2xl border px-3.5 py-3",
        presentation.className,
      ].join(" ")}
    >
      <span className="inline-flex rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-black">
        {r(presentation.label)}
      </span>

      <p className="mt-2 text-xs font-semibold leading-5">
        {r(presentation.message)}
      </p>
    </div>
  );
}
