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

export type ListingCreateImageIssue = Readonly<{
  key: "imageTypeInvalid" | "imageTooLarge" | "imagesPartlyAdded" | "imageLimit";
  params?: Readonly<Record<string, string | number>>;
  filename?: string;
}>;
export type AppendListingCreateImagesResult = {
  files: File[]; errors: ListingCreateImageIssue[];
};
/** Semantic notices keep selected files and their errors stable across language changes. */
export function validateListingCreateImage(file: File): ListingCreateImageIssue | null {
  if (!LISTING_CREATE_ALLOWED_IMAGE_TYPES.has(file.type)) return {key: "imageTypeInvalid"};
  if (file.size > LISTING_CREATE_MAX_SOURCE_IMAGE_SIZE_BYTES) {
    return {key: "imageTooLarge", params: {size: LISTING_CREATE_MAX_SOURCE_IMAGE_SIZE_MB}};
  }
  return null;
}
export function appendListingCreateImages(currentFiles: File[], incomingFiles: File[]): AppendListingCreateImagesResult {
  const errors: ListingCreateImageIssue[] = [], validFiles: File[] = [];
  for (const file of incomingFiles) {
    const issue = validateListingCreateImage(file);
    if (issue) errors.push({...issue, filename: file.name});
    else validFiles.push(file);
  }
  const remainingSlots = Math.max(0, LISTING_CREATE_IMAGE_LIMIT - currentFiles.length);
  if (validFiles.length > remainingSlots) errors.push(remainingSlots > 0
    ? {key: "imagesPartlyAdded", params: {count: remainingSlots}}
    : {key: "imageLimit", params: {limit: LISTING_CREATE_IMAGE_LIMIT}});
  return {files: [...currentFiles, ...validFiles.slice(0, remainingSlots)], errors};
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
