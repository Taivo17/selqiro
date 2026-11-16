import type { OfferKind } from "../marketplace/offerTheme";
import { publicOfferUrl } from "./offerLink";

export type ShareOfferInput = Readonly<{ kind: OfferKind; id: string; title: string }>;
export type ShareOutcome = "shared" | "copied" | "manual" | "cancelled";
export type ShareTransport = Readonly<{
  share?: (payload: Readonly<{ title: string; url: string }>) => Promise<void>;
  copy?: (url: string) => Promise<void>;
}>;

/** Called only from a user action. A resolved native share means handoff to the
 * chosen app, never proof that a social post was published. */
export async function shareOfferLink(input: ShareOfferInput, transport: ShareTransport): Promise<ShareOutcome> {
  const url = publicOfferUrl(input.kind, input.id);
  if (!url) throw new Error("invalid_public_offer_link");
  const title = (typeof input.title === "string" ? input.title : "")
    .replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) || "Selqiro";
  if (transport.share) {
    try { await transport.share({title, url}); return "shared"; }
    catch (error) {
      if (error && typeof error === "object" && "name" in error && error.name === "AbortError") return "cancelled";
    }
  }
  if (transport.copy) {
    try { await transport.copy(url); return "copied"; } catch { /* A selectable link remains available. */ }
  }
  return "manual";
}
