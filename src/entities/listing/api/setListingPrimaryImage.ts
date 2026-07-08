import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";

export type SetListingPrimaryImageInput = {
  listingId: string;
  imageId: string;
};

function mapPrimaryImageError(message: string): string {
  if (message.includes("not_authenticated")) {
    return "Sisselogimine puudub.";
  }

  if (message.includes("listing_not_found")) {
    return "Kuulutust ei leitud.";
  }

  if (message.includes("not_owner")) {
    return "Sul ei ole õigust seda kuulutust muuta.";
  }

  if (message.includes("image_not_found")) {
    return "Pilti ei leitud selle kuulutuse juurest.";
  }

  return message || "Põhipildi muutmine ebaõnnestus.";
}

export async function setListingPrimaryImage(
  input: SetListingPrimaryImageInput
): Promise<void> {
  if (!input.listingId || !input.imageId) {
    throw new Error("Pildi või kuulutuse id puudub.");
  }

  const { error } = await supabaseBrowserClient.rpc(
    "set_listing_primary_image_v2",
    {
      p_listing_id: String(input.listingId),
      p_image_id: String(input.imageId),
    }
  );

  if (error) {
    throw new Error(mapPrimaryImageError(error.message));
  }
}
