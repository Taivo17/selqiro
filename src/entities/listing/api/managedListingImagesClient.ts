import { getListingActivityActor } from "./getListingActivityActor";
import { publicationJourneyRequest } from "./publicationJourneyClient";
import type { PublicationActor } from "../model/publicationJourney";
import { bindManagedListingImagesKey, bindManagedListingPrimaryCommand, classifyManagedListingImagesError,
  ManagedListingImagesError, managedListingImagesReadArguments, managedListingPrimaryArguments,
  parseManagedListingImages, parseManagedListingPrimarySaved,
  type ManagedListingImagesKey, type ManagedListingImagesSaved, type ManagedListingImagesSnapshot,
  type ManagedListingPrimaryCommand } from "../model/managedListingImages";

export type ManagedListingImagesRequest = (actor: PublicationActor,
  action: "owner-images-read" | "owner-images-primary", args: Readonly<Record<string, unknown>>,
  signal: AbortSignal) => PromiseLike<unknown>;
export type ManagedListingImagesClient = Readonly<{
  read(key: ManagedListingImagesKey, signal?: AbortSignal): Promise<ManagedListingImagesSnapshot>;
  setPrimary(command: ManagedListingPrimaryCommand, signal?: AbortSignal): Promise<ManagedListingImagesSaved>;
}>;

/** One bounded request with actor checks on both sides. Writes have no retry or legacy fallback. */
export function createManagedListingImagesClient(request: ManagedListingImagesRequest,
    actor: () => PromiseLike<PublicationActor>): ManagedListingImagesClient {
  async function checked<T>(key: ManagedListingImagesKey, writing: boolean,
      args: Readonly<Record<string, unknown>>, parse: (value: unknown) => T, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) throw new ManagedListingImagesError("context");
    const controller = new AbortController();
    let dispatched = false;
    let cancel: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const matches = (current: PublicationActor) => current?.userId === key.userId && current?.identityId === key.identityId;
    const work = async (): Promise<T> => {
      try {
        if (!matches(await actor()) || controller.signal.aborted) throw new ManagedListingImagesError("context");
        dispatched = true;
        const value = await request(Object.freeze({ userId: key.userId, identityId: key.identityId }),
          writing ? "owner-images-primary" : "owner-images-read", args, controller.signal);
        if (controller.signal.aborted) throw new ManagedListingImagesError(writing ? "unknown" : "context");
        const result = parse(value);
        let confirmed: PublicationActor;
        try { confirmed = await actor(); }
        catch { throw new ManagedListingImagesError(writing ? "unknown" : "context"); }
        if (!matches(confirmed) || controller.signal.aborted) throw new ManagedListingImagesError(writing ? "unknown" : "context");
        return result;
      } catch (error) {
        if (!dispatched) throw new ManagedListingImagesError("context");
        throw classifyManagedListingImagesError(error);
      }
    };
    try {
      const deadline = new Promise<never>((_, reject) => {
        cancel = () => {
          controller.abort();
          reject(new ManagedListingImagesError(dispatched && writing ? "unknown" : "context"));
        };
        signal?.addEventListener("abort", cancel, { once: true });
        if (signal?.aborted) cancel();
        timer = setTimeout(cancel, 20_000);
      });
      return await Promise.race([work(), deadline]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      if (cancel) signal?.removeEventListener("abort", cancel);
      controller.abort();
    }
  }
  return Object.freeze({
    read(key: ManagedListingImagesKey, signal?: AbortSignal) {
      const bound = bindManagedListingImagesKey(key);
      return checked(bound, false, managedListingImagesReadArguments(bound),
        value => parseManagedListingImages(value, bound), signal);
    },
    setPrimary(command: ManagedListingPrimaryCommand, signal?: AbortSignal) {
      const bound = bindManagedListingPrimaryCommand(command);
      return checked(bound.key, true, managedListingPrimaryArguments(bound),
        value => parseManagedListingPrimarySaved(value, bound), signal);
    },
  });
}

export const managedListingImagesClient = createManagedListingImagesClient(publicationJourneyRequest, getListingActivityActor);
export const readManagedListingImages = managedListingImagesClient.read;
export const setManagedListingPrimaryImage = managedListingImagesClient.setPrimary;
