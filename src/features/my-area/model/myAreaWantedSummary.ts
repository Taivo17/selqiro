import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import type { OwnerWantedSummary } from "../../../entities/marketplace-item/model/ownerWantedSummary";
import { formatOwnerHorseMoney } from "../../../entities/horse-offer/model/ownerMoney";

/** Display labels only: buyer budget never enters the generic seller-price field. */
export function getMyAreaWantedSummaryLabels(summary: OwnerWantedSummary | null, language: "en" | "et" = "et") {
  const budget = summary?.budget;
  const area = summary?.searchArea;
  const priceLabel = !budget
    ? marketplaceMessage("media.budget_in_details.2d9476")
    : budget.mode === "contact"
      ? marketplaceMessage("horse.flexible_budget.20da6f")
      : marketplaceMessage("horse.budget_up_to_value.82a955", { p0: String(formatOwnerHorseMoney(budget.amount, budget.currency, language)) });
  const parts = area ? [area.cityOrMunicipality, area.region].filter(Boolean) : [];
  const locationLabel = !area
    ? marketplaceMessage("media.search_area_in_details.c426a4")
    : [...new Set(parts)].join(" · ") || marketplaceMessage("horse.search_area_not_added.085cfe");

  return { priceLabel, locationLabel };
}
