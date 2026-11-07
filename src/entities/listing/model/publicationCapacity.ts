const capacityReasons = {
  publication_open_attempt_limit: "open_attempts",
  publication_daily_attempt_limit: "daily_attempts",
  publication_retained_bytes_limit: "retained_capacity",
} as const;

type PublicationCapacityError = Readonly<{code: "54000"; message: keyof typeof capacityReasons}>;
export type PublicationCapacityReason = typeof capacityReasons[keyof typeof capacityReasons];

/** Only these known allocator refusals can be shown as temporary capacity.
 * Other database failures remain unknown outcomes and never imply a rollback. */
export function isPublicationCapacityError(value: unknown): value is PublicationCapacityError {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const error = value as Record<string, unknown>;
  return error.code === "54000" && Object.keys(capacityReasons).some(message => error.message === message);
}

export function publicationCapacityReason(value: unknown): PublicationCapacityReason | null {
  return isPublicationCapacityError(value) ? capacityReasons[value.message] : null;
}
