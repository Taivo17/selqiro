import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";

export type UploadListingImageInput = {
  listingId: string;
  file: File;
};

const MAX_LISTING_IMAGES = 10;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function mapUploadImageError(message: string): string {
  if (message.includes("not_authenticated")) return "Sisselogimine puudub.";
  if (message.includes("listing_not_found")) return "Kuulutust ei leitud.";
  if (message.includes("not_owner")) return "Sul ei ole õigust seda kuulutust muuta.";
  if (message.includes("image_url_missing")) return "Pildi URL puudub.";
  if (message.includes("max_images")) {
    return `Kuulutusele saab lisada kuni ${MAX_LISTING_IMAGES} pilti.`;
  }

  return message || "Pildi lisamine ebaõnnestus.";
}

function validateImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Lubatud on JPG, PNG ja WEBP pildid.");
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Pilt on liiga suur. Maksimaalne suurus on 10 MB.");
  }
}

function extensionFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();

  if (fromName && ["jpg", "jpeg", "png", "webp"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";

  return "jpg";
}

function safeStoragePath(input: {
  userId: string;
  listingId: string;
  file: File;
}): string {
  const extension = extensionFromFile(input.file);
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${input.userId}/${input.listingId}/${Date.now()}-${randomPart}.${extension}`;
}

async function removeUploadedFile(path: string) {
  const { error } = await supabaseBrowserClient.storage
    .from("listing-images")
    .remove([path]);

  if (error) {
    console.warn("Uploaded image cleanup failed:", error.message);
  }
}

export async function uploadListingImage(
  input: UploadListingImageInput
): Promise<void> {
  if (!input.listingId) {
    throw new Error("Kuulutuse id puudub.");
  }

  validateImageFile(input.file);

  const {
    data: { user },
    error: userError,
  } = await supabaseBrowserClient.auth.getUser();

  if (userError || !user?.id) {
    throw new Error("Sisselogimine puudub.");
  }

  const path = safeStoragePath({
    userId: user.id,
    listingId: input.listingId,
    file: input.file,
  });

  const { error: uploadError } = await supabaseBrowserClient.storage
    .from("listing-images")
    .upload(path, input.file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: input.file.type,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Pildi üleslaadimine ebaõnnestus.");
  }

  const { data: publicUrlData } = supabaseBrowserClient.storage
    .from("listing-images")
    .getPublicUrl(path);

  const publicUrl = publicUrlData.publicUrl;

  try {
    const { error: rpcError } = await supabaseBrowserClient.rpc(
      "add_listing_image_v2",
      {
        p_listing_id: String(input.listingId),
        p_original_url: publicUrl,
        p_medium_url: null,
        p_thumb_url: null,
        p_max_images: MAX_LISTING_IMAGES,
      }
    );

    if (rpcError) {
      throw new Error(mapUploadImageError(rpcError.message));
    }
  } catch (error) {
    await removeUploadedFile(path);
    throw error;
  }
}
