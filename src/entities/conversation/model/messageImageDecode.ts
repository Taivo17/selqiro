import {contactFail} from "./listingContact";
import {decodeLocalImage} from "../../../shared/media/localImageDecode";
import type {SelectedImageInfo} from "./messageImageSelection";
export type {DecodedLocalImage as DecodedMessageImage} from "../../../shared/media/localImageDecode";

/** Keep the existing messaging API and error contract around the shared decoder. */
export async function decodeMessageImage(info: SelectedImageInfo, targetWidth: number,
  targetHeight: number, signal?: AbortSignal) {
  try { return await decodeLocalImage(info, targetWidth, targetHeight, signal); }
  catch (error) {
    if (signal?.aborted) contactFail("aborted");
    if (error instanceof Error && error.message.startsWith("local_image_"))
      throw new Error(error.message.replace("local_image_", "message_image_"));
    throw error;
  }
}
