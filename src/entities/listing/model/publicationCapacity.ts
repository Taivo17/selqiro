const capacityMessages = [
  "publication_open_attempt_limit",
  "publication_daily_attempt_limit",
  "publication_retained_bytes_limit",
] as const;

type PublicationCapacityError = Readonly<{code: "54000"; message: typeof capacityMessages[number]}>;

/** Only these known allocator refusals can be shown as temporary capacity.
 * Other database failures remain unknown outcomes and never imply a rollback. */
export function isPublicationCapacityError(value: unknown): value is PublicationCapacityError {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const error = value as Record<string, unknown>;
  return error.code === "54000" && capacityMessages.some(message => error.message === message);
}
