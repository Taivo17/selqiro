import "server-only";
import type { Metadata } from "next";
import type { OfferKind } from "../../shared/marketplace/offerTheme";
import { HOSTED_PORTAL_ORIGIN } from "../../shared/config/hostedPreviewProtocol";
import { hostedPortalRequested } from "../../shared/config/v2Integration";
import { publicOfferUrl } from "../../shared/sharing/offerLink";
import { readAnonymousOfferPreview, type PublicOfferPreview } from "./anonymousOfferPreview";

export function offerMetadata(kind: OfferKind, id: string, preview: PublicOfferPreview | null): Metadata {
  const canonical = publicOfferUrl(kind, id);
  if (!preview || preview.url !== canonical) return {
    title: "Selqiro", description: "Products, services and job opportunities on Selqiro.",
    robots: {index: false, follow: false},
    openGraph: {type: "website", siteName: "Selqiro", title: "Selqiro", images: []},
    twitter: {card: "summary", title: "Selqiro", images: []},
  };
  return {
    metadataBase: new URL(HOSTED_PORTAL_ORIGIN), title: preview.title + " | Selqiro", description: preview.description,
    alternates: {canonical: preview.url},
    openGraph: {type: "website", siteName: "Selqiro", title: preview.title, description: preview.description,
      url: preview.url, images: preview.image ? [{url: preview.image, alt: preview.title}] : []},
    twitter: {card: preview.image && kind !== "job" ? "summary_large_image" : "summary", title: preview.title,
      description: preview.description, images: preview.image ? [preview.image] : []},
  };
}

/** Next's server-only metadata uses anonymous public RPCs. No owner fallback,
 * persistent metadata cache, incoming host, request headers or user cookies. */
export async function generateOfferMetadata(kind: OfferKind, id: string): Promise<Metadata> {
  const projectOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL, publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const preview = hostedPortalRequested() && projectOrigin && publicKey
    ? await readAnonymousOfferPreview(kind, id, {projectOrigin, publicKey}) : null;
  return offerMetadata(kind, id, preview);
}
