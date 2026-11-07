"use client";

import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  deleteServiceImage,
  getServiceImages,
  SERVICE_IMAGE_LIMIT,
  setServicePrimaryImage,
  uploadServiceImage,
} from "../../../entities/service/api/serviceImages";
import {
  getServiceImageUrl,
  sortServiceImages,
  type ServiceImage,
} from "../../../entities/service/model/image";
import type {
  Service,
} from "../../../entities/service/model/types";

type ServiceImageManagerProps = {
  service: Service;
  disabled?: boolean;
  onImageUrlChange: (
    imageUrl: string | null
  ) => void;
  onBusyChange?: (
    busy: boolean
  ) => void;
};

function resolveError(
  error: unknown,
  fallback: string
): string {
  return safeMarketplaceError(error, fallback);
}

function buildOptimisticDeletedImages(
  images: ServiceImage[],
  deletedImageId: string,
  primaryImageId: string | null
): ServiceImage[] {
  return sortServiceImages(
    images
      .filter(
        (image) =>
          image.id !==
          deletedImageId
      )
      .map(
        (image, index) => ({
          ...image,
          isPrimary:
            primaryImageId
              ? image.id ===
                primaryImageId
              : false,
          sortOrder: index,
        })
      )
  );
}

export default function ServiceImageManager({
  service,
  disabled = false,
  onImageUrlChange,
  onBusyChange,
}: ServiceImageManagerProps) {
  const { language, r } = useMarketplaceTranslation();
  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    images,
    setImages,
  ] = useState<ServiceImage[]>(
    []
  );

  const [
    loaded,
    setLoaded,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    primarySavingId,
    setPrimarySavingId,
  ] = useState<string | null>(
    null
  );

  const [
    deletingImageId,
    setDeletingImageId,
  ] = useState<string | null>(
    null
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const [
    warning,
    setWarning,
  ] = useState<string | null>(
    null
  );

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(
    null
  );

  const loadRequestRef =
    useRef(0);

  const onBusyChangeRef =
    useRef(onBusyChange);

  useEffect(() => {
    onBusyChangeRef.current =
      onBusyChange;
  }, [onBusyChange]);

  const operationBusy =
    uploading ||
    primarySavingId !== null ||
    deletingImageId !== null;

  useEffect(() => {
    onBusyChangeRef.current?.(
      operationBusy
    );
  }, [operationBusy]);

  useEffect(() => {
    return () => {
      onBusyChangeRef.current?.(
        false
      );
    };
  }, []);

  const loadImages =
    useCallback(
      async (
        options: {
          silent?: boolean;
        } = {}
      ) => {
        const requestId =
          ++loadRequestRef.current;

        if (!options.silent) {
          setLoading(true);
        }

        setError(null);

        try {
          const nextImages =
            await getServiceImages(
              service.id
            );

          if (
            requestId !==
            loadRequestRef.current
          ) {
            return nextImages;
          }

          setImages(
            nextImages
          );
          setLoaded(true);

          return nextImages;
        } catch (loadError) {
          if (
            requestId ===
            loadRequestRef.current
          ) {
            setError(
              resolveError(
                loadError,
                marketplaceMessage("service.service_images_could_not_be_loaded.d3870f")
              )
            );
          }

          throw loadError;
        } finally {
          if (
            !options.silent &&
            requestId ===
              loadRequestRef.current
          ) {
            setLoading(false);
          }
        }
      },
      [service.id]
    );

  useEffect(() => {
    loadRequestRef.current += 1;
    setOpen(false);
    setImages([]);
    setLoaded(false);
    setLoading(false);
    setUploading(false);
    setPrimarySavingId(null);
    setDeletingImageId(null);
    setError(null);
    setWarning(null);
    setSuccessMessage(null);
  }, [
    service.id,
    service.status,
  ]);

  useEffect(() => {
    if (
      !open ||
      loaded ||
      loading
    ) {
      return;
    }

    void loadImages().catch(
      () => {
        /*
         * Kasutajale mõeldud viga
         * kuvatakse komponendi sees.
         */
      }
    );
  }, [
    open,
    loaded,
    loading,
    loadImages,
  ]);

  if (
    service.status !==
    "draft"
  ) {
    return null;
  }

  const primaryImage =
    images.find(
      (image) =>
        image.isPrimary
    ) ||
    images[0] ||
    null;

  const primaryImageUrl =
    primaryImage
      ? getServiceImageUrl(
          primaryImage
        )
      : null;

  const remainingSlots =
    Math.max(
      0,
      SERVICE_IMAGE_LIMIT -
        images.length
    );

  const controlsDisabled =
    disabled ||
    operationBusy;

  function clearMessages() {
    setError(null);
    setWarning(null);
    setSuccessMessage(null);
  }

  function toggleOpen() {
    if (
      disabled ||
      operationBusy
    ) {
      return;
    }

    clearMessages();
    setOpen(
      (current) =>
        !current
    );
  }

  async function handleUpload(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const input =
      event.currentTarget;

    const selectedFiles =
      Array.from(
        input.files || []
      );

    if (
      selectedFiles.length === 0 ||
      uploading ||
      disabled
    ) {
      input.value = "";
      return;
    }

    if (
      selectedFiles.length >
      remainingSlots
    ) {
      setError(
        remainingSlots === 0
          ? marketplaceMessage("service.a_service_can_have_up_to_value_images.e4bb05", { p0: String(SERVICE_IMAGE_LIMIT) })
          : marketplaceMessage("service.you_can_add_value_more_images.025f7f", { p0: String(remainingSlots) })
      );

      input.value = "";
      return;
    }

    clearMessages();
    setUploading(true);

    let uploadedCount = 0;
    let nextImages =
      images;

    try {
      for (
        const file of selectedFiles
      ) {
        const uploadedImage =
          await uploadServiceImage({
            serviceId:
              service.id,
            file,
          });

        nextImages =
          sortServiceImages([
            ...nextImages,
            uploadedImage,
          ]);

        setImages(
          nextImages
        );
        setLoaded(true);

        if (
          uploadedImage.isPrimary
        ) {
          onImageUrlChange(
            getServiceImageUrl(
              uploadedImage
            ) || null
          );
        }

        uploadedCount += 1;
      }

      setSuccessMessage(
        uploadedCount === 1
          ? marketplaceMessage("service.one_image_was_added_to_the_service.38cf04")
          : marketplaceMessage("service.value_images_were_added_to_the_service.35f6af", { p0: String(uploadedCount) })
      );
    } catch (uploadError) {
      const message =
        resolveError(
          uploadError,
          marketplaceMessage("service.the_service_image_could_not_be_added.2a3709")
        );

      setError(
        uploadedCount > 0
          ? marketplaceMessage("service.value_images_were_added_but_the_next_image.2ddfc3", { p0: String(uploadedCount), p1: String(message) })
          : message
      );
    } finally {
      setUploading(false);
      input.value = "";
    }
  }

  async function handleSetPrimary(
    image: ServiceImage
  ) {
    if (
      controlsDisabled ||
      image.isPrimary
    ) {
      return;
    }

    clearMessages();
    setPrimarySavingId(
      image.id
    );

    try {
      const updatedImage =
        await setServicePrimaryImage({
          serviceId:
            service.id,
          imageId:
            image.id,
        });

      onImageUrlChange(
        getServiceImageUrl(
          updatedImage
        ) || null
      );

      const nextImages =
        await loadImages({
          silent: true,
        });

      setImages(
        nextImages
      );

      setSuccessMessage(
        marketplaceMessage("service.the_service_s_main_image_was_changed.ba2b18")
      );
    } catch (primaryError) {
      setError(
        resolveError(
          primaryError,
          marketplaceMessage("service.the_service_s_main_image_could_not_be.85c9bf")
        )
      );
    } finally {
      setPrimarySavingId(
        null
      );
    }
  }

  async function handleDelete(
    image: ServiceImage
  ) {
    if (
      controlsDisabled
    ) {
      return;
    }

    const confirmed =
      window.confirm(r(images.length === 1
          ? marketplaceMessage("service.remove_the_service_s_last_image.ae86fc")
          : marketplaceMessage("service.remove_this_image_from_the_service.d2105b")));

    if (!confirmed) {
      return;
    }

    clearMessages();
    setDeletingImageId(
      image.id
    );

    try {
      const result =
        await deleteServiceImage({
          serviceId:
            service.id,
          imageId:
            image.id,
        });

      const optimisticImages =
        buildOptimisticDeletedImages(
          images,
          result.deletedImageId,
          result.primaryImageId
        );

      setImages(
        optimisticImages
      );
      setLoaded(true);

      onImageUrlChange(
        result.fallbackImage
      );

      if (
        result.storageCleanupFailed
      ) {
        setWarning(
          marketplaceMessage("service.the_image_was_removed_from_the_service_but.5360f2")
        );
      }

      try {
        const nextImages =
          await loadImages({
            silent: true,
          });

        setImages(
          nextImages
        );

        const nextPrimary =
          nextImages.find(
            (candidate) =>
              candidate.isPrimary
          ) ||
          nextImages[0] ||
          null;

        onImageUrlChange(
          nextPrimary
            ? getServiceImageUrl(
                nextPrimary
              ) || null
            : null
        );
      } catch {
        setWarning(
          (
            result.storageCleanupFailed
              ? marketplaceMessage("service.the_stored_file_cleanup_and.4b3e76")
              : ""
          ) +
          marketplaceMessage("service.the_image_list_could_not_be_reloaded_refresh.c38883")
        );
      }

      setSuccessMessage(
        result.remainingCount === 0
          ? marketplaceMessage("service.the_service_s_last_image_was_removed.241b78")
          : marketplaceMessage("service.the_service_image_was_removed.f4fac2")
      );
    } catch (deleteError) {
      setError(
        resolveError(
          deleteError,
          marketplaceMessage("service.the_service_image_could_not_be_deleted.7bf769")
        )
      );
    } finally {
      setDeletingImageId(
        null
      );
    }
  }

  return (
    <section className="mt-3 min-w-0 rounded-[22px] border border-neutral-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
            {r(marketplaceMessage("service.service_images.5350af"))}</p>

          <p className="mt-1 break-words text-sm font-semibold text-neutral-600">
            {r(loaded
              ? marketplaceMessage("service.value_value_images.97a0e5", { p0: String(images.length), p1: String(SERVICE_IMAGE_LIMIT) })
              : service.imageUrl
                ? marketplaceMessage("service.a_main_image_is_available.ef4547")
                : marketplaceMessage("service.no_images_added_yet.d4bf76"))}
          </p>
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-controls={`service-images-${service.id}`}
          onClick={toggleOpen}
          disabled={disabled ||
            operationBusy}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-black text-neutral-700 shadow-sm transition hover:border-neutral-300 disabled:cursor-wait disabled:opacity-50 sm:w-auto"
        >
          {r(open
            ? marketplaceMessage("service.close_image_manager.3b2fb5")
            : marketplaceMessage("service.manage_images.7231de"))}
        </button>
      </div>

      {r(open ? (
        <div
          id={`service-images-${service.id}`}
          className="mt-4 min-w-0 border-t border-neutral-100 pt-4"
        >
          {r(loading ? (
            <div className="space-y-3">
              <div className="h-40 animate-pulse rounded-[20px] bg-neutral-100 sm:h-52" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {r([0, 1, 2].map(
                  (item) => (
                    <div
                      key={item}
                      className="h-32 animate-pulse rounded-[18px] bg-neutral-100"
                    />
                  )
                ))}
              </div>
            </div>
          ) : null)}

          {r(!loading &&
          primaryImageUrl ? (
            <div className="overflow-hidden rounded-[20px] border border-neutral-100 bg-neutral-100">
              <img
                src={primaryImageUrl}
                alt={r(marketplaceMessage("service.main_image_for_value.4c06d2", { p0: String(service.title) }))}
                className="h-44 w-full object-cover sm:h-56"
              />
            </div>
          ) : null)}

          {r(!loading &&
          loaded &&
          images.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-neutral-200 bg-[#fbfbfa] px-4 py-6 text-center">
              <p className="font-black">
                {r(marketplaceMessage("service.the_service_has_no_images_yet.317078"))}</p>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                {r(marketplaceMessage("service.the_first_image_you_add_automatically_becomes_the.31d635"))}</p>
            </div>
          ) : null)}

          {r(!loading &&
          images.length > 0 ? (
            <div className="mt-3 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {r(images.map(
                (image, index) => {
                  const imageUrl =
                    getServiceImageUrl(
                      image
                    );

                  if (!imageUrl) {
                    return null;
                  }

                  const settingPrimary =
                    primarySavingId ===
                    image.id;

                  const deleting =
                    deletingImageId ===
                    image.id;

                  return (
                    <article
                      key={image.id}
                      className="min-w-0 rounded-[18px] border border-neutral-200 bg-[#fbfbfa] p-2"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          void handleSetPrimary(
                            image
                          )}
                        disabled={controlsDisabled ||
                          image.isPrimary}
                        aria-label={r(image.isPrimary
                            ? marketplaceMessage("service.image_value_is_the_service_s_main_image.2719e9", { p0: String(index + 1) })
                            : marketplaceMessage("service.make_image_value_the_service_s_main_image.1a09cd", { p0: String(index + 1) }))}
                        className="group relative block h-24 w-full overflow-hidden rounded-[14px] bg-neutral-100 disabled:cursor-default sm:h-28"
                      >
                        <img
                          src={imageUrl}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />

                        {r(image.isPrimary ? (
                          <span className="absolute left-2 top-2 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 shadow-sm">
                            {r(marketplaceMessage("service.main_image.7fc1c0"))}</span>
                        ) : null)}
                      </button>

                      <div className="mt-2 grid gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void handleSetPrimary(
                              image
                            )}
                          disabled={controlsDisabled ||
                            image.isPrimary}
                          className={[
                            "min-h-9 rounded-full border px-2 py-1.5 text-[11px] font-black transition disabled:cursor-default disabled:opacity-60",
                            image.isPrimary
                              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                              : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
                          ].join(" ")}
                        >
                          {r(image.isPrimary
                            ? marketplaceMessage("service.main_image.7fc1c0")
                            : settingPrimary
                              ? marketplaceMessage("service.updating.94c79c")
                              : marketplaceMessage("service.set_as_main.6960df"))}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDelete(
                              image
                            )}
                          disabled={controlsDisabled}
                          className="min-h-9 rounded-full border border-red-100 bg-red-50 px-2 py-1.5 text-[11px] font-black text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-50"
                        >
                          {r(deleting
                            ? marketplaceMessage("service.deleting.b12b82")
                            : images.length === 1
                              ? marketplaceMessage("service.remove_last_image.bedea5")
                              : marketplaceMessage("service.delete.b50cda"))}
                        </button>
                      </div>
                    </article>
                  );
                }
              ))}
            </div>
          ) : null)}

          {r(!loading ? (
            <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label
                className={[
                  "inline-flex min-h-11 w-full items-center justify-center rounded-full border px-5 py-2.5 text-sm font-black shadow-sm transition sm:w-auto",
                  controlsDisabled ||
                  remainingSlots === 0
                    ? "cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-300"
                    : "cursor-pointer border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300",
                ].join(" ")}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onClick={(event) => {
                    /*
                     * Nullime vana valiku enne süsteemse
                     * fotovalija avamist, et sama pilti
                     * saaks pärast ebaõnnestumist uuesti valida.
                     */
                    event.currentTarget.value = "";
                  }}
                  disabled={controlsDisabled ||
                    remainingSlots === 0}
                  onChange={(event) =>
                    void handleUpload(
                      event
                    )}
                  className="sr-only"
                />

                {r(uploading
                  ? marketplaceMessage("service.uploading_images.7c5e1c")
                  : remainingSlots === 0
                    ? marketplaceMessage("service.maximum_value_images.15aa96", { p0: String(SERVICE_IMAGE_LIMIT) })
                    : remainingSlots === 1
                      ? marketplaceMessage("service.add_last_image.17645c")
                      : marketplaceMessage("service.add_images_value_spaces.4d658c", { p0: String(remainingSlots) }))}
              </label>

              <p className="text-xs leading-5 text-neutral-500">
                {r(marketplaceMessage("service.jpg_png_and_webp_are_supported_heic_heif.8d0e91"))}</p>
            </div>
          ) : null)}

          {r(error ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-semibold leading-6 text-red-800"
            >
              {r(error)}
            </p>
          ) : null)}

          {r(warning ? (
            <p
              role="status"
              className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-sm font-semibold leading-6 text-amber-900"
            >
              {r(warning)}
            </p>
          ) : null)}

          {r(successMessage ? (
            <p
              role="status"
              className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm font-semibold leading-6 text-emerald-800"
            >
              {r(successMessage)}
            </p>
          ) : null)}

          {r(!loading &&
          error &&
          !loaded ? (
            <button
              type="button"
              onClick={() =>
                void loadImages().catch(
                  () => {
                    /*
                     * Viga kuvatakse komponendis.
                     */
                  }
                )}
              disabled={controlsDisabled}
              className="mt-3 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-black text-neutral-700 shadow-sm disabled:opacity-50"
            >
              {r(marketplaceMessage("horse.try_again.8c63df"))}</button>
          ) : null)}
        </div>
      ) : null)}
    </section>
  );
}
