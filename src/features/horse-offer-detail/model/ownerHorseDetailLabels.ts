import { localeForLanguage } from "../../../../lib/i18n/useTranslation";
import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
export const OWNER_HORSE_KIND_LABELS: Record<string, string> = {
  sale: marketplaceMessage("horse.sale.2879b9"), free_transfer: marketplaceMessage("horse.free_transfer.ccb86a"), lease: marketplaceMessage("horse.lease.f0268c"), co_rider: marketplaceMessage("horse.co_rider_wanted.0ddb2c"), wanted: marketplaceMessage("horse.horse_wanted.5f511d"),
};
export const OWNER_HORSE_STATUS_LABELS: Record<string, string> = {
  draft: marketplaceMessage("horse.draft.e9670d"), pending_review: marketplaceMessage("horse.under_review.f690a0"), published: marketplaceMessage("horse.published.2de00c"),
  paused: marketplaceMessage("horse.paused.18c3b2"), closed: marketplaceMessage("horse.closed.d6ea40"), rejected: marketplaceMessage("horse.rejected.7aae6f"), archived: marketplaceMessage("horse.archived.c37d62"),
};

export function formatOwnerHorseDate(
  value: string | null,
  language: "en" | "et" = "et"
): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    localeForLanguage(language),
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

export function getOwnerHorseStatusClassName(
  status: string
): string {
  switch (status) {
    case "published":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "pending_review":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "paused":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "closed":
    case "archived":
      return "border-zinc-300 bg-zinc-100 text-zinc-700";
    default:
      return "border-zinc-300 bg-white text-zinc-700";
  }
}
