import type { OwnerHorseOfferDetail } from "./types";

/** These two values originate in ONE server read and must never be re-paired. */
export type OwnerHorseOfferEditSnapshot = {
  detail: OwnerHorseOfferDetail;
  editRevision: string;
};
