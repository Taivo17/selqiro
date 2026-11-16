/** Offer colours identify context; sender and status colours have separate meanings. */
export type OfferKind = "listing" | "horse" | "service" | "job";

export type OfferTheme = Readonly<{
  surface: string;
  border: string;
  text: string;
  badge: string;
  button: string;
  activeTab: string;
  card: string;
}>;

const listing: OfferTheme = {
  surface: "bg-amber-50",
  border: "border-amber-200",
  text: "text-amber-950",
  badge: "border border-amber-200 bg-amber-50 text-amber-950",
  button: "border-amber-400 bg-amber-300 text-amber-950 hover:bg-amber-400 focus-visible:outline-amber-700",
  activeTab: "border-amber-300 bg-amber-100 text-amber-950 shadow-sm focus-visible:ring-amber-500/30",
  card: "border border-amber-200 bg-amber-50 text-amber-950",
};

const themes: Record<OfferKind, OfferTheme> = {
  listing,
  horse: listing,
  service: {
    surface: "bg-teal-50",
    border: "border-teal-200",
    text: "text-teal-950",
    badge: "border border-teal-200 bg-teal-50 text-teal-950",
    button: "border-teal-700 bg-teal-700 text-white hover:bg-teal-800 focus-visible:outline-teal-700",
    activeTab: "border-teal-300 bg-teal-100 text-teal-950 shadow-sm focus-visible:ring-teal-500/30",
    card: "border border-teal-200 bg-teal-50 text-teal-950",
  },
  job: {
    surface: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-950",
    badge: "border border-blue-200 bg-blue-50 text-blue-950",
    button: "border-blue-700 bg-blue-700 text-white hover:bg-blue-800 focus-visible:outline-blue-700",
    activeTab: "border-blue-300 bg-blue-100 text-blue-950 shadow-sm focus-visible:ring-blue-500/30",
    card: "border border-blue-200 bg-blue-50 text-blue-950",
  },
};

export function getOfferTheme(kind: OfferKind): OfferTheme {
  return themes[kind];
}

export const offerButtonLayout = "inline-flex min-h-11 items-center justify-center rounded-full border px-5 py-3 text-sm font-bold shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
