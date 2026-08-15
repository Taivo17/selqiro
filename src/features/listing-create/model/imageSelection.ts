export const LISTING_CREATE_IMAGE_LIMIT = 10;
export const LISTING_CREATE_MAX_SOURCE_IMAGE_SIZE_MB =
  25;

const LISTING_CREATE_MAX_SOURCE_IMAGE_SIZE_BYTES =
  LISTING_CREATE_MAX_SOURCE_IMAGE_SIZE_MB *
  1024 *
  1024;

const LISTING_CREATE_ALLOWED_IMAGE_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

export type AppendListingCreateImagesResult = {
  files: File[];
  errors: string[];
};

export function validateListingCreateImage(
  file: File
): string | null {
  if (
    !LISTING_CREATE_ALLOWED_IMAGE_TYPES.has(
      file.type
    )
  ) {
    return "Lubatud on JPG-, PNG- ja WEBP-pildid.";
  }

  if (
    file.size >
    LISTING_CREATE_MAX_SOURCE_IMAGE_SIZE_BYTES
  ) {
    return (
      "Pilt on liiga suur. " +
      `Maksimaalne algfail on ${LISTING_CREATE_MAX_SOURCE_IMAGE_SIZE_MB} MB.`
    );
  }

  return null;
}

export function appendListingCreateImages(
  currentFiles: File[],
  incomingFiles: File[]
): AppendListingCreateImagesResult {
  const errors: string[] = [];
  const validFiles: File[] = [];

  for (const file of incomingFiles) {
    const validationError =
      validateListingCreateImage(file);

    if (validationError) {
      errors.push(
        `${file.name}: ${validationError}`
      );
      continue;
    }

    validFiles.push(file);
  }

  const remainingSlots = Math.max(
    0,
    LISTING_CREATE_IMAGE_LIMIT -
      currentFiles.length
  );

  if (validFiles.length > remainingSlots) {
    errors.push(
      remainingSlots > 0
        ? `Valisid liiga palju pilte. Lisati esimesed ${remainingSlots}.`
        : `Kuulutusele saab lisada kuni ${LISTING_CREATE_IMAGE_LIMIT} pilti.`
    );
  }

  return {
    files: [
      ...currentFiles,
      ...validFiles.slice(
        0,
        remainingSlots
      ),
    ],
    errors,
  };
}

export function moveListingCreateImage(
  files: File[],
  index: number,
  direction: "up" | "down"
): File[] {
  const targetIndex =
    direction === "up"
      ? index - 1
      : index + 1;

  if (
    index < 0 ||
    index >= files.length ||
    targetIndex < 0 ||
    targetIndex >= files.length
  ) {
    return files;
  }

  const nextFiles = [...files];
  const currentFile = nextFiles[index];

  nextFiles[index] =
    nextFiles[targetIndex];
  nextFiles[targetIndex] =
    currentFile;

  return nextFiles;
}
