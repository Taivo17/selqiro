export const OWNER_HORSE_KIND_LABELS: Record<string, string> = {
  sale: "Müük", free_transfer: "Tasuta üleandmine", lease: "Rent", co_rider: "Kaasratsaniku otsing", wanted: "Otsin hobust",
};
export const OWNER_HORSE_STATUS_LABELS: Record<string, string> = {
  draft: "Mustand", pending_review: "Kontrollimisel", published: "Avaldatud",
  paused: "Peatatud", closed: "Lõpetatud", rejected: "Tagasi lükatud", archived: "Arhiveeritud",
};

export function formatOwnerHorseDate(
  value: string | null
): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "et-EE",
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
