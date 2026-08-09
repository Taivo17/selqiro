"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import type {
  PublicService,
  PublicServiceImage,
} from "../../../entities/service/model/public";

const LIGHTBOX_CONTROLS_HIDE_DELAY_MS =
  3000;

const SERVICE_SWIPE_MIN_DISTANCE =
  55;

const SERVICE_SWIPE_AXIS_RATIO =
  1.25;

type ServiceGalleryImage =
  PublicServiceImage;

function getServiceGalleryImageUrl(
  image: ServiceGalleryImage,
  size:
    | "thumb"
    | "display"
    | "full"
): string {
  if (size === "thumb") {
    return (
      image.thumbUrl ||
      image.mediumUrl ||
      image.originalUrl
    );
  }

  if (size === "full") {
    return (
      image.originalUrl ||
      image.mediumUrl ||
      image.thumbUrl ||
      ""
    );
  }

  return (
    image.mediumUrl ||
    image.originalUrl ||
    image.thumbUrl ||
    ""
  );
}

function buildServiceGalleryImages(
  service: PublicService
): ServiceGalleryImage[] {
  if (service.images.length > 0) {
    return service.images;
  }

  const fallbackUrl =
    service.imageUrl?.trim() || "";

  if (!fallbackUrl) {
    return [];
  }

  return [
    {
      id: `legacy-${service.id}`,
      serviceId: service.id,
      originalUrl: fallbackUrl,
      mediumUrl: null,
      thumbUrl: null,
      sortOrder: 0,
      isPrimary: true,
      createdAt: null,
    },
  ];
}

export default function PublicProfileServiceGallery({
  service,
  expanded,
}: {
  service: PublicService;
  expanded: boolean;
}) {
  const galleryImages =
    useMemo(
      () =>
        buildServiceGalleryImages(
          service
        ),
      [
        service.id,
        service.imageUrl,
        service.images,
      ]
    );

  const [
    selectedImageId,
    setSelectedImageId,
  ] = useState(
    galleryImages[0]?.id || ""
  );

  const [
    lightboxOpen,
    setLightboxOpen,
  ] = useState(false);

  const [
    lightboxControlsVisible,
    setLightboxControlsVisible,
  ] = useState(true);

  const lightboxControlsTimerRef =
    useRef<number | null>(null);

  const cardPointerStartXRef =
    useRef<number | null>(null);

  const cardPointerStartYRef =
    useRef<number | null>(null);

  const cardSwipeHandledRef =
    useRef(false);

  const lightboxPointerStartXRef =
    useRef<number | null>(null);

  const lightboxPointerStartYRef =
    useRef<number | null>(null);

  const selectedImageIndex =
    Math.max(
      0,
      galleryImages.findIndex(
        (image) =>
          image.id ===
          selectedImageId
      )
    );

  const selectedImage =
    galleryImages[
      selectedImageIndex
    ] ||
    galleryImages[0] ||
    null;

  const selectedDisplayUrl =
    selectedImage
      ? getServiceGalleryImageUrl(
          selectedImage,
          "display"
        )
      : "";

  const selectedFullUrl =
    selectedImage
      ? getServiceGalleryImageUrl(
          selectedImage,
          "full"
        )
      : "";

  function clearLightboxControlsTimer() {
    if (
      lightboxControlsTimerRef.current ===
      null
    ) {
      return;
    }

    window.clearTimeout(
      lightboxControlsTimerRef.current
    );

    lightboxControlsTimerRef.current =
      null;
  }

  function scheduleLightboxControlsHide() {
    clearLightboxControlsTimer();
    setLightboxControlsVisible(true);

    if (!lightboxOpen) {
      return;
    }

    lightboxControlsTimerRef.current =
      window.setTimeout(() => {
        setLightboxControlsVisible(false);

        lightboxControlsTimerRef.current =
          null;
      }, LIGHTBOX_CONTROLS_HIDE_DELAY_MS);
  }

  function keepLightboxControlsVisible() {
    clearLightboxControlsTimer();
    setLightboxControlsVisible(true);
  }

  function isHorizontalServiceSwipe(
    deltaX: number,
    deltaY: number
  ): boolean {
    const horizontalMove =
      Math.abs(deltaX);

    const verticalMove =
      Math.abs(deltaY);

    return (
      horizontalMove >=
        SERVICE_SWIPE_MIN_DISTANCE &&
      horizontalMove >
        verticalMove *
          SERVICE_SWIPE_AXIS_RATIO
    );
  }

  function resetServiceCardPointer() {
    cardPointerStartXRef.current =
      null;

    cardPointerStartYRef.current =
      null;
  }

  function handleServiceCardPointerDown(
    event:
      PointerEvent<HTMLButtonElement>
  ) {
    if (
      event.pointerType === "mouse" ||
      !expanded ||
      galleryImages.length <= 1
    ) {
      return;
    }

    cardSwipeHandledRef.current =
      false;

    cardPointerStartXRef.current =
      event.clientX;

    cardPointerStartYRef.current =
      event.clientY;
  }

  function handleServiceCardPointerUp(
    event:
      PointerEvent<HTMLButtonElement>
  ) {
    const startX =
      cardPointerStartXRef.current;

    const startY =
      cardPointerStartYRef.current;

    resetServiceCardPointer();

    if (
      event.pointerType === "mouse" ||
      !expanded ||
      startX === null ||
      startY === null ||
      galleryImages.length <= 1
    ) {
      return;
    }

    const deltaX =
      event.clientX - startX;

    const deltaY =
      event.clientY - startY;

    if (
      !isHorizontalServiceSwipe(
        deltaX,
        deltaY
      )
    ) {
      return;
    }

    /*
     * Puutejärgne click ei tohi pärast
     * pildipühkimist lightbox'i avada.
     */
    cardSwipeHandledRef.current =
      true;

    event.preventDefault();

    /*
     * Mõni brauser ei väljasta pärast
     * pühkimist click-sündmust. Viide
     * vabastatakse ka ajastatud varuteel.
     */
    window.setTimeout(() => {
      cardSwipeHandledRef.current =
        false;
    }, 500);

    if (deltaX < 0) {
      showNextImage();
    } else {
      showPreviousImage();
    }
  }

  function handleServiceCardPointerCancel() {
    resetServiceCardPointer();

    cardSwipeHandledRef.current =
      false;
  }

  function resetServiceLightboxPointer() {
    lightboxPointerStartXRef.current =
      null;

    lightboxPointerStartYRef.current =
      null;
  }

  function handleServiceLightboxPointerDown(
    event:
      PointerEvent<HTMLDivElement>
  ) {
    event.stopPropagation();

    scheduleLightboxControlsHide();

    if (
      event.pointerType === "mouse" ||
      galleryImages.length <= 1
    ) {
      return;
    }

    lightboxPointerStartXRef.current =
      event.clientX;

    lightboxPointerStartYRef.current =
      event.clientY;
  }

  function handleServiceLightboxPointerUp(
    event:
      PointerEvent<HTMLDivElement>
  ) {
    event.stopPropagation();

    const startX =
      lightboxPointerStartXRef.current;

    const startY =
      lightboxPointerStartYRef.current;

    resetServiceLightboxPointer();

    if (
      event.pointerType === "mouse" ||
      startX === null ||
      startY === null ||
      galleryImages.length <= 1
    ) {
      scheduleLightboxControlsHide();
      return;
    }

    const deltaX =
      event.clientX - startX;

    const deltaY =
      event.clientY - startY;

    if (
      isHorizontalServiceSwipe(
        deltaX,
        deltaY
      )
    ) {
      event.preventDefault();

      if (deltaX < 0) {
        showNextImage();
      } else {
        showPreviousImage();
      }
    }

    scheduleLightboxControlsHide();
  }

  function handleServiceLightboxPointerCancel(
    event:
      PointerEvent<HTMLDivElement>
  ) {
    event.stopPropagation();

    resetServiceLightboxPointer();

    scheduleLightboxControlsHide();
  }

  function selectImage(
    imageId: string
  ) {
    setSelectedImageId(imageId);
  }

  function showPreviousImage() {
    scheduleLightboxControlsHide();

    if (
      galleryImages.length <= 1
    ) {
      return;
    }

    setSelectedImageId(
      (currentImageId) => {
        const currentIndex =
          Math.max(
            0,
            galleryImages.findIndex(
              (image) =>
                image.id ===
                currentImageId
            )
          );

        const previousIndex =
          (
            currentIndex -
            1 +
            galleryImages.length
          ) %
          galleryImages.length;

        return (
          galleryImages[
            previousIndex
          ]?.id ||
          currentImageId
        );
      }
    );
  }

  function showNextImage() {
    scheduleLightboxControlsHide();

    if (
      galleryImages.length <= 1
    ) {
      return;
    }

    setSelectedImageId(
      (currentImageId) => {
        const currentIndex =
          Math.max(
            0,
            galleryImages.findIndex(
              (image) =>
                image.id ===
                currentImageId
            )
          );

        const nextIndex =
          (
            currentIndex + 1
          ) %
          galleryImages.length;

        return (
          galleryImages[
            nextIndex
          ]?.id ||
          currentImageId
        );
      }
    );
  }

  useEffect(() => {
    setSelectedImageId(
      galleryImages[0]?.id || ""
    );

    setLightboxOpen(false);
    setLightboxControlsVisible(true);
    clearLightboxControlsTimer();
  }, [
    service.id,
    galleryImages,
  ]);

  useEffect(() => {
    if (!lightboxOpen) {
      clearLightboxControlsTimer();
      setLightboxControlsVisible(true);
      return;
    }

    scheduleLightboxControlsHide();

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        keepLightboxControlsVisible();
        setLightboxOpen(false);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPreviousImage();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNextImage();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      clearLightboxControlsTimer();

      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    lightboxOpen,
    galleryImages,
  ]);

  const imageAreaClass = [
    "group relative block w-full overflow-hidden rounded-[20px] bg-gradient-to-br from-neutral-100 to-neutral-200 outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-black",
    expanded
      ? "h-48 sm:h-52"
      : "h-36",
  ].join(" ");

  if (
    galleryImages.length === 0 ||
    !selectedImage ||
    !selectedDisplayUrl
  ) {
    return (
      <div
        className={imageAreaClass}
        aria-hidden="true"
      />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (
            cardSwipeHandledRef.current
          ) {
            cardSwipeHandledRef.current =
              false;

            return;
          }

          setLightboxControlsVisible(true);
          setLightboxOpen(true);
        }}
        onPointerDown={
          handleServiceCardPointerDown
        }
        onPointerUp={
          handleServiceCardPointerUp
        }
        onPointerCancel={
          handleServiceCardPointerCancel
        }
        style={
          expanded &&
          galleryImages.length > 1
            ? {
                touchAction: "pan-y",
              }
            : undefined
        }
        aria-label={
          `Ava teenuse „${service.title}” pilt suurelt`
        }
        className={imageAreaClass}
      >
        <img
          src={selectedDisplayUrl}
          alt={
            `${service.title}, pilt ${
              selectedImageIndex + 1
            }`
          }
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.015]"
          onError={(event) => {
            event.currentTarget.style.display =
              "none";
          }}
        />

        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1.5 text-[11px] font-black text-white opacity-100 shadow-lg transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
          Suurenda
        </span>

        {galleryImages.length > 1 ? (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-black text-white shadow">
            {selectedImageIndex + 1}/
            {galleryImages.length}
          </span>
        ) : null}
      </button>

      {expanded &&
      galleryImages.length > 1 ? (
        <div
          aria-label={
            `${service.title} galerii pisipildid`
          }
          className="mt-2 flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1"
        >
          {galleryImages.map(
            (image, index) => {
              const selected =
                image.id ===
                selectedImage.id;

              return (
                <button
                  key={image.id}
                  type="button"
                  aria-pressed={selected}
                  aria-label={
                    `Näita pilti ${index + 1} ${galleryImages.length}-st`
                  }
                  onClick={() =>
                    selectImage(image.id)
                  }
                  className={[
                    "h-20 w-20 shrink-0 overflow-hidden rounded-[14px] border-2 bg-neutral-100 p-0.5 outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-black",
                    selected
                      ? "border-black"
                      : "border-transparent opacity-75 hover:opacity-100",
                  ].join(" ")}
                >
                  <img
                    src={getServiceGalleryImageUrl(
                      image,
                      "thumb"
                    )}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    className="h-full w-full rounded-[10px] object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display =
                        "none";
                    }}
                  />
                </button>
              );
            }
          )}
        </div>
      ) : null}

      {lightboxOpen &&
      selectedImage &&
      selectedFullUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            `${service.title} pildigalerii`
          }
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setLightboxOpen(false);
            }
          }}
          onPointerMove={
            scheduleLightboxControlsHide
          }
          onPointerDown={
            scheduleLightboxControlsHide
          }
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm sm:p-6"
        >
          <div className="relative flex h-[calc(100dvh-1.5rem)] max-h-[900px] w-full max-w-6xl min-w-0 flex-col rounded-[28px] bg-neutral-950 p-3 shadow-2xl sm:h-[calc(100dvh-3rem)] sm:p-4">
            <div className="mb-3 flex shrink-0 items-center justify-between gap-3 px-1">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">
                  {service.title}
                </p>

                <p className="mt-0.5 text-xs font-semibold text-white/55">
                  Pilt {selectedImageIndex + 1}
                  {" / "}
                  {galleryImages.length}
                </p>
              </div>

              <button
                type="button"
                autoFocus
                onClick={() =>
                  setLightboxOpen(false)
                }
                aria-label="Sulge pildigalerii"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xl font-black text-black outline-none transition hover:bg-neutral-200 focus-visible:ring-2 focus-visible:ring-white"
              >
                ×
              </button>
            </div>

            <div
              className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[22px] bg-black"
              style={{
                touchAction: "pan-y",
              }}
              onPointerDown={
                handleServiceLightboxPointerDown
              }
              onPointerUp={
                handleServiceLightboxPointerUp
              }
              onPointerCancel={
                handleServiceLightboxPointerCancel
              }
            >
              <img
                src={selectedFullUrl}
                alt={
                  `${service.title}, pilt ${
                    selectedImageIndex + 1
                  }`
                }
                draggable={false}
                className="max-h-full max-w-full select-none object-contain"
                onError={(event) => {
                  event.currentTarget.style.display =
                    "none";
                }}
              />

              {galleryImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={
                      showPreviousImage
                    }
                    onFocus={
                      keepLightboxControlsVisible
                    }
                    onBlur={
                      scheduleLightboxControlsHide
                    }
                    aria-label="Eelmine pilt"
                    className={[
                      "absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl font-black text-black shadow-lg outline-none transition-opacity duration-300 hover:bg-white focus-visible:ring-2 focus-visible:ring-white sm:left-4 sm:h-12 sm:w-12",
                      lightboxControlsVisible
                        ? "pointer-events-auto opacity-100"
                        : "pointer-events-none opacity-0",
                    ].join(" ")}
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    onClick={
                      showNextImage
                    }
                    onFocus={
                      keepLightboxControlsVisible
                    }
                    onBlur={
                      scheduleLightboxControlsHide
                    }
                    aria-label="Järgmine pilt"
                    className={[
                      "absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl font-black text-black shadow-lg outline-none transition-opacity duration-300 hover:bg-white focus-visible:ring-2 focus-visible:ring-white sm:right-4 sm:h-12 sm:w-12",
                      lightboxControlsVisible
                        ? "pointer-events-auto opacity-100"
                        : "pointer-events-none opacity-0",
                    ].join(" ")}
                  >
                    ›
                  </button>
                </>
              ) : null}
            </div>

            {galleryImages.length > 1 ? (
              <div
                aria-label="Pildigalerii valik"
                className="mt-3 flex shrink-0 gap-2 overflow-x-auto overscroll-x-contain pb-1"
              >
                {galleryImages.map(
                  (image, index) => {
                    const selected =
                      image.id ===
                      selectedImage.id;

                    return (
                      <button
                        key={image.id}
                        type="button"
                        aria-pressed={
                          selected
                        }
                        aria-label={
                          `Ava pilt ${index + 1}`
                        }
                        onClick={() =>
                          selectImage(
                            image.id
                          )
                        }
                        className={[
                          "h-16 w-16 shrink-0 overflow-hidden rounded-[12px] border-2 bg-neutral-900 p-0.5 outline-none ring-offset-2 ring-offset-black transition sm:h-20 sm:w-20",
                          selected
                            ? "border-white"
                            : "border-transparent opacity-60 hover:opacity-100",
                        ].join(" ")}
                      >
                        <img
                          src={getServiceGalleryImageUrl(
                            image,
                            "thumb"
                          )}
                          alt=""
                          loading="lazy"
                          draggable={false}
                          className="h-full w-full rounded-[8px] object-cover"
                          onError={(
                            event
                          ) => {
                            event.currentTarget.style.display =
                              "none";
                          }}
                        />
                      </button>
                    );
                  }
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
