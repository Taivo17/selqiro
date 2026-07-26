export const CONTENT_IMAGE_LIMIT = 10;

export const CONTENT_IMAGE_MAX_SIZE_BYTES =
  10 * 1024 * 1024;

export const CONTENT_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp";

const ALLOWED_CONTENT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateContentImageFile(
  file: File
): void {
  if (!file) {
    throw new Error("Pildifail puudub.");
  }

  if (!ALLOWED_CONTENT_IMAGE_TYPES.has(file.type)) {
    throw new Error(
      "Lubatud on JPG, PNG ja WEBP pildid."
    );
  }

  if (file.size <= 0) {
    throw new Error("Pildifail on tühi.");
  }

  if (file.size > CONTENT_IMAGE_MAX_SIZE_BYTES) {
    throw new Error(
      "Pilt on liiga suur. Maksimaalne suurus on 10 MB."
    );
  }
}

function extensionFromFile(file: File): string {
  const extensionFromName = file.name
    .split(".")
    .pop()
    ?.toLowerCase();

  if (
    extensionFromName &&
    ["jpg", "jpeg", "png", "webp"].includes(
      extensionFromName
    )
  ) {
    return extensionFromName === "jpeg"
      ? "jpg"
      : extensionFromName;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

export function buildContentImageStoragePath(input: {
  userId: string;
  contentId: string;
  file: File;
}): string {
  const userId = input.userId.trim();
  const contentId = input.contentId.trim();

  if (!UUID_PATTERN.test(userId)) {
    throw new Error(
      "Kasutaja ID ei ole korrektne."
    );
  }

  if (!UUID_PATTERN.test(contentId)) {
    throw new Error(
      "Sisu ID ei ole korrektne."
    );
  }

  const randomPart =
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(16)
          .slice(2)}`;

  const extension =
    extensionFromFile(input.file);

  return [
    userId,
    contentId,
    `${Date.now()}-${randomPart}.${extension}`,
  ].join("/");
}
