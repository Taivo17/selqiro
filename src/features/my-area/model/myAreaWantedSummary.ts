import type { OwnerWantedSummary } from "../../../entities/marketplace-item/model/ownerWantedSummary";
import { formatOwnerHorseMoney } from "../../../entities/horse-offer/model/ownerMoney";

/** Display labels only: buyer budget never enters the generic seller-price field. */
export function getMyAreaWantedSummaryLabels(summary: OwnerWantedSummary | null) {
  const budget = summary?.budget;
  const area = summary?.searchArea;
  const priceLabel = !budget
    ? "Eelarve detailvaates"
    : budget.mode === "contact"
      ? "Eelarve on paindlik"
      : `Eelarve kuni ${formatOwnerHorseMoney(budget.amount, budget.currency)}`;
  const parts = area ? [area.cityOrMunicipality, area.region].filter(Boolean) : [];
  const locationLabel = !area
    ? "Otsingupiirkond detailvaates"
    : [...new Set(parts)].join(" · ") || "Otsingupiirkond lisamata";

  return { priceLabel, locationLabel };
}
