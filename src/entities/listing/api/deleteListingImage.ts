import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";

export type DeleteListingImageInput = {
  listingId: string;
  imageId: string;
};

type DeleteListingImageResult = {
  deleted_urls?: Array<string | null>;
  fallback_image?: string | null;
};

function mapDeleteImageError(message: string): string {
  if (message.includes("not_authenticated")) return "Sisselogimine puudub.";
  if (message.includes("listing_not_found")) return "Kuulutust ei leitud.";
  if (message.includes("not_owner")) return "Sul ei ole õigust seda kuulutust muuta.";
  if (message.includes("image_not_found")) return "Pilti ei leitud selle kuulutuse juurest.";
  if (message.includes("last_image")) return "Viimast pilti ei saa kustutada.";

  return message || "Pildi kustutamine ebaõnnestus.";
}

function storagePathFromUrl(url: string): string | null {
  const cleanUrl = url.split("?")[0] || "";
  const publicMarker = "/storage/v1/object/public/listing-images/";
  const signedMarker = "/storage/v1/object/sign/listing-images/";

  const publicIndex = cleanUrl.indexOf(publicMarker);

  if (publicIndex >= 0) {
    return decodeURIComponent(cleanUrl.slice(publicIndex + publicMarker.length));
  }

  const signedIndex = cleanUrl.indexOf(signedMarker);

  if (signedIndex >= 0) {
    return decodeURIComponent(cleanUrl.slice(signedIndex + signedMarker.length));
  }

  return null;
}

async function cleanupStorageFiles(urls: Array<string | null | undefined>) {
  const paths = Array.from(
    new Set(
      urls
        .filter(Boolean)
        .map((url) => storagePathFromUrl(String(url)))
        .filter(Boolean) as string[]
    )
  );

  if (paths.length === 0) return;

  const { error } = await supabaseBrowserClient.storage
    .from("listing-images")
    .remove(paths);

  if (error) {
    console.warn("Listing image storage cleanup failed:", error.message);
  }
}

export async function deleteListingImage(
  input: DeleteListingImageInput
): Promise<void> {
  if (!input.listingId || !input.imageId) {
    throw new Error("Pildi või kuulutuse id puudub.");
  }

  const { data, error } = await supabaseBrowserClient.rpc(
    "delete_listing_image_v2",
    {
      p_listing_id: String(input.listingId),
      p_image_id: String(input.imageId),
    }
  );

  if (error) {
    throw new Error(mapDeleteImageError(error.message));
  }

  const result = (data || {}) as DeleteListingImageResult;

  await cleanupStorageFiles(result.deleted_urls || []);
}
