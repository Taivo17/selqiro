import {LOCAL_IMAGE_HEADER_LIMITS} from "../../../shared/media/localImageHeader";
export {SelectedImageHeaderError, readSelectedImageInfo} from "../../../shared/media/localImageHeader";
export type {SelectedImageInfo} from "../../../shared/media/localImageHeader";

/** Message selection budgets stay independent of listing photo preparation. */
export const MESSAGE_IMAGE_SELECTION_LIMITS = Object.freeze({
  bytes: 32 * 1024 * 1024, pixels: 64000000, edge: 32768,
  ...LOCAL_IMAGE_HEADER_LIMITS,
});
