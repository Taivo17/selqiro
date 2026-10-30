import type { MessageThread, MessageThreadMessage } from "../../../entities/conversation/model/messaging";

export function mergeThreadMessages(older: readonly MessageThreadMessage[], newer: readonly MessageThreadMessage[]) {
  const items = new Map<string, MessageThreadMessage>();
  for (const item of [...older, ...newer]) items.set(item.id, item);
  return Object.freeze([...items.values()].sort((a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : 1));
}

/** A bounded latest-page response cannot fill an unobserved gap. Keep the old
 * visible history until the user explicitly opens the separate latest page. */
export function hasThreadGap(current: MessageThread, latest: MessageThread): boolean {
  if (!current.messages.length || !latest.messages.length) return false;
  const known = new Set(current.messages.map(message => message.id));
  return !latest.messages.some(message => known.has(message.id))
    && BigInt(latest.messages[0].id) > BigInt(current.messages[current.messages.length - 1].id);
}
