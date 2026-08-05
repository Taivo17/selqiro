"use client";

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
  return error instanceof Error &&
    error.message
    ? error.message
    : fallback;
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
                "Teenuse pilte ei saanud laadida."
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

    input.value = "";

    if (
      selectedFiles.length === 0 ||
      uploading ||
      disabled
    ) {
      return;
    }

    if (
      selectedFiles.length >
      remainingSlots
    ) {
      setError(
        remainingSlots === 0
          ? `Teenusele saab lisada kuni ${SERVICE_IMAGE_LIMIT} pilti.`
          : `Saad lisada veel ${remainingSlots} pilti.`
      );

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
          ? "Teenusele lisati üks pilt."
          : `Teenusele lisati ${uploadedCount} pilti.`
      );
    } catch (uploadError) {
      const message =
        resolveError(
          uploadError,
          "Teenuse pildi lisamine ebaõnnestus."
        );

      setError(
        uploadedCount > 0
          ? `${uploadedCount} pilti lisati, kuid järgmise pildi lisamine ebaõnnestus: ${message}`
          : message
      );
    } finally {
      setUploading(false);
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
        "Teenuse põhipilt muudeti."
      );
    } catch (primaryError) {
      setError(
        resolveError(
          primaryError,
          "Teenuse põhipilti ei saanud muuta."
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
      window.confirm(
        images.length === 1
          ? "Kas eemaldada teenuse viimane pilt?"
          : "Kas eemaldada see pilt teenuselt?"
      );

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
          "Pilt eemaldati teenuselt, kuid Storage'i faili automaatne koristamine ebaõnnestus. Andmebaasi tulemus on salvestatud."
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
              ? "Storage'i faili koristamine ja "
              : ""
          ) +
          "Pildiloendi uuesti laadimine ebaõnnestus. Värskendamisel kuvatakse serveri viimane seis."
        );
      }

      setSuccessMessage(
        result.remainingCount === 0
          ? "Teenuse viimane pilt eemaldati."
          : "Teenuse pilt eemaldati."
      );
    } catch (deleteError) {
      setError(
        resolveError(
          deleteError,
          "Teenuse pilti ei saanud kustutada."
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
            Teenuse pildid
          </p>

          <p className="mt-1 break-words text-sm font-semibold text-neutral-600">
            {loaded
              ? `${images.length}/${SERVICE_IMAGE_LIMIT} pilti`
              : service.imageUrl
                ? "Põhipilt on olemas"
                : "Pilte ei ole veel lisatud"}
          </p>
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-controls={`service-images-${service.id}`}
          onClick={toggleOpen}
          disabled={
            disabled ||
            operationBusy
          }
          className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-black text-neutral-700 shadow-sm transition hover:border-neutral-300 disabled:cursor-wait disabled:opacity-50 sm:w-auto"
        >
          {open
            ? "Sulge pildihaldur"
            : "Halda pilte"}
        </button>
      </div>

      {open ? (
        <div
          id={`service-images-${service.id}`}
          className="mt-4 min-w-0 border-t border-neutral-100 pt-4"
        >
          {loading ? (
            <div className="space-y-3">
              <div className="h-40 animate-pulse rounded-[20px] bg-neutral-100 sm:h-52" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {[0, 1, 2].map(
                  (item) => (
                    <div
                      key={item}
                      className="h-32 animate-pulse rounded-[18px] bg-neutral-100"
                    />
                  )
                )}
              </div>
            </div>
          ) : null}

          {!loading &&
          primaryImageUrl ? (
            <div className="overflow-hidden rounded-[20px] border border-neutral-100 bg-neutral-100">
              <img
                src={
                  primaryImageUrl
                }
                alt={`${service.title} põhipilt`}
                className="h-44 w-full object-cover sm:h-56"
              />
            </div>
          ) : null}

          {!loading &&
          loaded &&
          images.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-neutral-200 bg-[#fbfbfa] px-4 py-6 text-center">
              <p className="font-black">
                Teenusel ei ole veel pilte
              </p>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Esimene lisatud pilt muutub automaatselt põhipildiks.
              </p>
            </div>
          ) : null}

          {!loading &&
          images.length > 0 ? (
            <div className="mt-3 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {images.map(
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
                          )
                        }
                        disabled={
                          controlsDisabled ||
                          image.isPrimary
                        }
                        aria-label={
                          image.isPrimary
                            ? `Pilt ${index + 1} on teenuse põhipilt`
                            : `Tee pilt ${index + 1} teenuse põhipildiks`
                        }
                        className="group relative block h-24 w-full overflow-hidden rounded-[14px] bg-neutral-100 disabled:cursor-default sm:h-28"
                      >
                        <img
                          src={imageUrl}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />

                        {image.isPrimary ? (
                          <span className="absolute left-2 top-2 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 shadow-sm">
                            Põhipilt
                          </span>
                        ) : null}
                      </button>

                      <div className="mt-2 grid gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void handleSetPrimary(
                              image
                            )
                          }
                          disabled={
                            controlsDisabled ||
                            image.isPrimary
                          }
                          className={[
                            "min-h-9 rounded-full border px-2 py-1.5 text-[11px] font-black transition disabled:cursor-default disabled:opacity-60",
                            image.isPrimary
                              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                              : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
                          ].join(" ")}
                        >
                          {image.isPrimary
                            ? "Põhipilt"
                            : settingPrimary
                              ? "Muudan..."
                              : "Põhipildiks"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDelete(
                              image
                            )
                          }
                          disabled={
                            controlsDisabled
                          }
                          className="min-h-9 rounded-full border border-red-100 bg-red-50 px-2 py-1.5 text-[11px] font-black text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-50"
                        >
                          {deleting
                            ? "Kustutan..."
                            : images.length === 1
                              ? "Eemalda viimane"
                              : "Kustuta"}
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          ) : null}

          {!loading ? (
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
                  accept="image/jpeg,image/png,image/webp"
                  disabled={
                    controlsDisabled ||
                    remainingSlots === 0
                  }
                  onChange={(event) =>
                    void handleUpload(
                      event
                    )
                  }
                  className="sr-only"
                />

                {uploading
                  ? "Laadin pilte..."
                  : remainingSlots === 0
                    ? `Maksimum ${SERVICE_IMAGE_LIMIT} pilti`
                    : remainingSlots === 1
                      ? "Lisa viimane pilt"
                      : `Lisa pilte (${remainingSlots} kohta)`}
              </label>

              <p className="text-xs leading-5 text-neutral-500">
                Lubatud JPG, PNG ja WEBP. Maksimaalne suurus 10 MB pildi kohta.
              </p>
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-semibold leading-6 text-red-800"
            >
              {error}
            </p>
          ) : null}

          {warning ? (
            <p
              role="status"
              className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-sm font-semibold leading-6 text-amber-900"
            >
              {warning}
            </p>
          ) : null}

          {successMessage ? (
            <p
              role="status"
              className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm font-semibold leading-6 text-emerald-800"
            >
              {successMessage}
            </p>
          ) : null}

          {!loading &&
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
                )
              }
              disabled={
                controlsDisabled
              }
              className="mt-3 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-black text-neutral-700 shadow-sm disabled:opacity-50"
            >
              Proovi uuesti
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
