import type { ListingMessageCard } from "../../../entities/conversation/model/listingMessageCards";
import type { OfferKind } from "../../../shared/marketplace/offerTheme";
import { publicOfferPath } from "../../../shared/sharing/offerLink";

export type ConversationSubject = Readonly<{ id: string; title: string | null; content_type?: ListingMessageCard["content_type"] }>;
export function conversationOfferKind(subject: ConversationSubject): OfferKind {
  return subject.content_type === "horse_offer" ? "horse" : subject.content_type === "service" ? "service"
    : subject.content_type === "job" ? "job" : "listing";
}
export function conversationSubjectHref(subject: ConversationSubject): string | null {
  return publicOfferPath(conversationOfferKind(subject), subject.id);
}
export const conversationSubjectMessages = {
  en: { listing: "Listing", horse: "Horse listing", service: "Service", job: "Job opportunity", view: "View offer" },
  et: { listing: "Kuulutus", horse: "Hobusekuulutus", service: "Teenus", job: "Tööpakkumine", view: "Vaata pakkumist" },
} as const;
