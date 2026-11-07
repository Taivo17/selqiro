import { uiMessage } from "../../../../lib/i18n/interfaceMessage";
import { isRenewableListingId, listingDeadlineMicros } from "./listingActivity";

export type ListingActivityActor = { userId: string; identityId: string };
export type RenewListingActivityInput = { listingId: string; expectedActiveUntil: string | null; expectedActor?: ListingActivityActor };
export type RenewListingActivityResult = { listingId: string; status: "active"; activeUntil: string | null; changed: boolean };
export type ListingRenewalFailure = "invalid" | "conflict" | "forbidden" | "status" | "uncertain";

const messages: Record<ListingRenewalFailure, string> = {
  invalid: uiMessage("could_not_verify_the_listing_s_expiry_reload_the_list"),
  conflict: uiMessage("the_listing_s_expiry_has_changed_reload_the_list_and_check_its_validity"),
  forbidden: uiMessage("the_account_or_active_identity_does_not_match_this_listing_reload_the_list"),
  status: uiMessage("the_listing_s_status_has_changed_paused_or_sold_listings_cannot_be_renewed"),
  uncertain: uiMessage("the_renewal_result_has_not_been_confirmed_the_listing_may_have_a_new_expiry"),
};
export class ListingRenewalError extends Error {
  constructor(readonly kind: ListingRenewalFailure) { super(messages[kind]); this.name = "ListingRenewalError"; }
}
export function sameListingActor(a: ListingActivityActor | null, b: ListingActivityActor | null): boolean {
  return !!a && !!b && a.userId === b.userId && a.identityId === b.identityId;
}
export function validateListingRenewalInput(input: RenewListingActivityInput): void {
  if (!isRenewableListingId(input.listingId)
    || (input.expectedActiveUntil !== null && listingDeadlineMicros(input.expectedActiveUntil) === null)) {
    throw new ListingRenewalError("invalid");
  }
}
export function listingRenewalError(error: unknown): ListingRenewalError {
  if (error instanceof ListingRenewalError) return error;
  if (error && typeof error === "object" && "message" in error) {
    const value = error as { message?: unknown; code?: unknown };
    if (value.message === "listing_activity_conflict" && value.code === "40001") return new ListingRenewalError("conflict");
    if (value.message === "listing_activity_active_status_required" && value.code === "55000") return new ListingRenewalError("status");
    if (value.code === "42501" && ["listing_activity_authentication_required", "listing_activity_identity_required",
      "listing_activity_not_found_or_forbidden"].includes(String(value.message))) return new ListingRenewalError("forbidden");
    if (value.code === "22023" && ["listing_activity_id_invalid", "listing_activity_deadline_invalid"].includes(String(value.message))) {
      return new ListingRenewalError("invalid");
    }
  }
  return new ListingRenewalError("uncertain");
}

/** Table-returning RPC: exactly one minimized row, matching ID and monotonic deadline. */
export function parseListingRenewalResult(value: unknown, input: RenewListingActivityInput): RenewListingActivityResult {
  validateListingRenewalInput(input);
  const fail = () => { throw new ListingRenewalError("uncertain"); };
  if (!Array.isArray(value) || value.length !== 1) return fail();
  const r = value[0];
  if (!r || typeof r !== "object" || Array.isArray(r)
    || Object.keys(r).length !== 4 || !["listing_id", "status", "active_until", "changed"].every(k => Object.hasOwn(r, k))
    || r.listing_id !== input.listingId || r.status !== "active" || typeof r.changed !== "boolean") return fail();
  const old = input.expectedActiveUntil === null ? null : listingDeadlineMicros(input.expectedActiveUntil);
  const next = r.active_until === null ? null : listingDeadlineMicros(r.active_until);
  if (r.active_until !== null && next === null) return fail();
  if (r.changed ? old === null || next === null || next <= old : old !== next) return fail();
  return { listingId: r.listing_id, status: "active", activeUntil: r.active_until, changed: r.changed };
}
