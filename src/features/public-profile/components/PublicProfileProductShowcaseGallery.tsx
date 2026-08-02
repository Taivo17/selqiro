"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import type {
  PublicProductShowcase,
} from "../../../entities/product-showcase/model/public";

const LIGHTBOX_CONTROLS_HIDE_DELAY_MS =
  3000;

const SHOWCASE_SWIPE_MIN_DISTANCE =
  55;

const SHOWCASE_SWIPE_AXIS_RATIO =
  1.25;

type ShowcaseImage =
  PublicProductShowcase["images"][number];

function getShowcaseImageUrl(
  image: ShowcaseImage,
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

export default function PublicProfileProductShowcaseGallery({
  showcase,
  expanded,
}: {
  showcase: PublicProductShowcase;
  expanded: boolean;
}) {
  const [
    selectedImageId,
    setSelectedImageId,
  ] = useState(
    showcase.images[0]?.id || ""
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
      showcase.images.findIndex(
        (image) =>
          image.id ===
          selectedImageId
      )
    );

  const selectedImage =
    showcase.images[
      selectedImageIndex
    ] ||
    showcase.images[0] ||
    null;

  const selectedDisplayUrl =
    selectedImage
      ? getShowcaseImageUrl(
          selectedImage,
          "display"
        )
      : "";

  const selectedFullUrl =
    selectedImage
      ? getShowcaseImageUrl(
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

  function isHorizontalShowcaseSwipe(
    deltaX: number,
    deltaY: number
  ): boolean {
    const horizontalMove =
      Math.abs(deltaX);

    const verticalMove =
      Math.abs(deltaY);

    return (
      horizontalMove >=
        SHOWCASE_SWIPE_MIN_DISTANCE &&
      horizontalMove >
        verticalMove *
          SHOWCASE_SWIPE_AXIS_RATIO
    );
  }

  function resetShowcaseCardPointer() {
    cardPointerStartXRef.current =
      null;

    cardPointerStartYRef.current =
      null;
  }

  function handleShowcaseCardPointerDown(
    event:
      PointerEvent<HTMLButtonElement>
  ) {
    if (
      event.pointerType === "mouse" ||
      !expanded ||
      showcase.images.length <= 1
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

  function handleShowcaseCardPointerUp(
    event:
      PointerEvent<HTMLButtonElement>
  ) {
    const startX =
      cardPointerStartXRef.current;

    const startY =
      cardPointerStartYRef.current;

    resetShowcaseCardPointer();

    if (
      event.pointerType === "mouse" ||
      !expanded ||
      startX === null ||
      startY === null ||
      showcase.images.length <= 1
    ) {
      return;
    }

    const deltaX =
      event.clientX - startX;

    const deltaY =
      event.clientY - startY;

    if (
      !isHorizontalShowcaseSwipe(
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
     * pühkimist click-sündmust. Sellisel
     * juhul ei tohi blokeerimisviide jääda
     * järgmise tavavajutuseni aktiivseks.
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

  function handleShowcaseCardPointerCancel() {
    resetShowcaseCardPointer();

    cardSwipeHandledRef.current =
      false;
  }

  function resetShowcaseLightboxPointer() {
    lightboxPointerStartXRef.current =
      null;

    lightboxPointerStartYRef.current =
      null;
  }

  function handleShowcaseLightboxPointerDown(
    event:
      PointerEvent<HTMLDivElement>
  ) {
    event.stopPropagation();

    scheduleLightboxControlsHide();

    if (
      event.pointerType === "mouse" ||
      showcase.images.length <= 1
    ) {
      return;
    }

    lightboxPointerStartXRef.current =
      event.clientX;

    lightboxPointerStartYRef.current =
      event.clientY;
  }

  function handleShowcaseLightboxPointerUp(
    event:
      PointerEvent<HTMLDivElement>
  ) {
    event.stopPropagation();

    const startX =
      lightboxPointerStartXRef.current;

    const startY =
      lightboxPointerStartYRef.current;

    resetShowcaseLightboxPointer();

    if (
      event.pointerType === "mouse" ||
      startX === null ||
      startY === null ||
      showcase.images.length <= 1
    ) {
      scheduleLightboxControlsHide();
      return;
    }

    const deltaX =
      event.clientX - startX;

    const deltaY =
      event.clientY - startY;

    if (
      isHorizontalShowcaseSwipe(
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

  function handleShowcaseLightboxPointerCancel(
    event:
      PointerEvent<HTMLDivElement>
  ) {
    event.stopPropagation();

    resetShowcaseLightboxPointer();

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
      showcase.images.length <= 1
    ) {
      return;
    }

    setSelectedImageId(
      (currentImageId) => {
        const currentIndex =
          Math.max(
            0,
            showcase.images.findIndex(
              (image) =>
                image.id ===
                currentImageId
            )
          );

        const previousIndex =
          (
            currentIndex -
            1 +
            showcase.images.length
          ) %
          showcase.images.length;

        return (
          showcase.images[
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
      showcase.images.length <= 1
    ) {
      return;
    }

    setSelectedImageId(
      (currentImageId) => {
        const currentIndex =
          Math.max(
            0,
            showcase.images.findIndex(
              (image) =>
                image.id ===
                currentImageId
            )
          );

        const nextIndex =
          (
            currentIndex + 1
          ) %
          showcase.images.length;

        return (
          showcase.images[
            nextIndex
          ]?.id ||
          currentImageId
        );
      }
    );
  }

  useEffect(() => {
    setSelectedImageId(
      showcase.images[0]?.id || ""
    );

    setLightboxOpen(false);
    setLightboxControlsVisible(true);
    clearLightboxControlsTimer();
  }, [showcase.id]);

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
    showcase.images,
  ]);

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
          handleShowcaseCardPointerDown
        }
        onPointerUp={
          handleShowcaseCardPointerUp
        }
        onPointerCancel={
          handleShowcaseCardPointerCancel
        }
        style={
          expanded &&
          showcase.images.length > 1
            ? {
                touchAction: "pan-y",
              }
            : undefined
        }
        aria-label={
          `Ava tootenäidise „${showcase.title}” pilt suurelt`
        }
        className={[
          "group relative block w-full overflow-hidden rounded-[20px] bg-neutral-100 outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-black",
          expanded
            ? "h-52 sm:h-56"
            : "h-36",
        ].join(" ")}
      >
        {selectedDisplayUrl ? (
          <img
            src={selectedDisplayUrl}
            alt={
              `${showcase.title}, pilt ${
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
        ) : null}

        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1.5 text-[11px] font-black text-white opacity-100 shadow-lg transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
          Suurenda
        </span>

        {showcase.images.length > 1 ? (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-black text-white shadow">
            {selectedImageIndex + 1}/
            {showcase.images.length}
          </span>
        ) : null}
      </button>

      {expanded &&
      showcase.images.length > 1 ? (
        <div
          aria-label={
            `${showcase.title} galerii pisipildid`
          }
          className="mt-2 flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1"
        >
          {showcase.images.map(
            (image, index) => {
              const selected =
                image.id ===
                selectedImage?.id;

              return (
                <button
                  key={image.id}
                  type="button"
                  aria-pressed={selected}
                  aria-label={
                    `Näita pilti ${index + 1} ${showcase.images.length}-st`
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
                    src={getShowcaseImageUrl(
                      image,
                      "thumb"
                    )}
                    alt=""
                    loading="lazy"
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
            `${showcase.title} pildigalerii`
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
                  {showcase.title}
                </p>

                <p className="mt-0.5 text-xs font-semibold text-white/55">
                  Pilt {selectedImageIndex + 1}
                  {" / "}
                  {showcase.images.length}
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
                handleShowcaseLightboxPointerDown
              }
              onPointerUp={
                handleShowcaseLightboxPointerUp
              }
              onPointerCancel={
                handleShowcaseLightboxPointerCancel
              }
            >
              <img
                src={selectedFullUrl}
                alt={
                  `${showcase.title}, pilt ${
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

              {showcase.images.length > 1 ? (
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

            {showcase.images.length > 1 ? (
              <div
                aria-label="Pildigalerii valik"
                className="mt-3 flex shrink-0 gap-2 overflow-x-auto overscroll-x-contain pb-1"
              >
                {showcase.images.map(
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
                          src={getShowcaseImageUrl(
                            image,
                            "thumb"
                          )}
                          alt=""
                          loading="lazy"
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
