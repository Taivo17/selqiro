import type { MessageCatalog } from "../useTranslation";

export const listingPresentationMessages = {
  en: {
    ask_price: "Ask for price", free: "Free", negotiable: "Negotiable", unspecified_currency: "Currency unspecified",
    untitled: "Untitled listing", location_unspecified: "Location unspecified", seller: "Seller",
    active: "Active", expired: "Expired", paused: "Paused", sold: "Sold", status_check: "Status needs checking",
    deadline_unset: "No expiry set", deadline_check: "Expiry needs checking", expired_at: "Expired {date}", valid_until: "Valid until {date}",
    new: "New", used: "Used", damaged: "Damaged", back_profile: "← Back to profile", back_listings: "← Back to listings"
  },
  et: {
    ask_price: "Küsi hinda", free: "Tasuta", negotiable: "Kokkuleppel", unspecified_currency: "Valuuta täpsustamata",
    untitled: "Pealkirjata kuulutus", location_unspecified: "Asukoht täpsustamata", seller: "Avaldaja",
    active: "Aktiivne", expired: "Aegunud", paused: "Peatatud", sold: "Müüdud", status_check: "Staatus vajab kontrolli",
    deadline_unset: "Tähtaeg määramata", deadline_check: "Tähtaeg vajab kontrolli", expired_at: "Aegus {date}", valid_until: "Kehtib kuni {date}",
    new: "Uus", used: "Kasutatud", damaged: "Kahjustatud", back_profile: "← Tagasi profiilile", back_listings: "← Tagasi kuulutuste juurde"
  }
} as const satisfies MessageCatalog;
