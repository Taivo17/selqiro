"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  PublicProductShowcase,
} from "../../../entities/product-showcase/model/public";
import type {
  PublicProfile,
} from "../../../entities/profile/model/types";
import {
  usePublicProfileProductShowcases,
} from "../model/usePublicProfileProductShowcases";

const SHOWCASE_PREVIEW_LIMIT = 5;
const LIGHTBOX_CONTROLS_HIDE_DELAY_MS =
  3000;

function LoadingShowcases() {
  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="flex gap-4">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="w-[250px] flex-none rounded-[24px] border border-black/5 bg-white p-3 shadow-sm"
          >
            <div className="h-36 animate-pulse rounded-[20px] bg-neutral-100" />
            <div className="mt-3 h-4 w-20 animate-pulse rounded-full bg-neutral-100" />
            <div className="mt-3 h-5 w-40 animate-pulse rounded-full bg-neutral-100" />
            <div className="mt-2 h-4 w-full animate-pulse rounded-full bg-neutral-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

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

function ShowcaseInteractiveGallery({
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
          setLightboxControlsVisible(true);
          setLightboxOpen(true);
        }}
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

            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[22px] bg-black">
              <img
                src={selectedFullUrl}
                alt={
                  `${showcase.title}, pilt ${
                    selectedImageIndex + 1
                  }`
                }
                className="max-h-full max-w-full object-contain"
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

function ShowcaseDescription({
  showcaseId,
  description,
  expanded,
}: {
  showcaseId: string;
  description: string;
  expanded: boolean;
}) {
  const [
    descriptionOpen,
    setDescriptionOpen,
  ] = useState(false);

  const [
    descriptionOverflowing,
    setDescriptionOverflowing,
  ] = useState(false);

  const descriptionRef =
    useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    setDescriptionOpen(false);
    setDescriptionOverflowing(false);
  }, [
    showcaseId,
    description,
    expanded,
  ]);

  useEffect(() => {
    if (
      !expanded ||
      descriptionOpen ||
      !description
    ) {
      return;
    }

    const initialElement =
      descriptionRef.current;

    if (!initialElement) {
      return;
    }

    function updateOverflowState() {
      const currentElement =
        descriptionRef.current;

      if (!currentElement) {
        return;
      }

      setDescriptionOverflowing(
        currentElement.scrollHeight >
          currentElement.clientHeight + 1
      );
    }

    const frameId =
      window.requestAnimationFrame(
        updateOverflowState
      );

    const resizeObserver =
      typeof ResizeObserver ===
      "undefined"
        ? null
        : new ResizeObserver(
            updateOverflowState
          );

    resizeObserver?.observe(
      initialElement
    );

    return () => {
      window.cancelAnimationFrame(
        frameId
      );

      resizeObserver?.disconnect();
    };
  }, [
    description,
    expanded,
    descriptionOpen,
  ]);

  if (!description) {
    return null;
  }

  const canToggle =
    expanded &&
    (
      descriptionOverflowing ||
      descriptionOpen
    );

  return (
    <div className="mt-1 min-w-0">
      <p
        ref={descriptionRef}
        className={[
          "break-words text-sm leading-5 text-neutral-500",
          expanded
            ? descriptionOpen
              ? ""
              : "line-clamp-6"
            : "line-clamp-3",
        ].join(" ")}
      >
        {description}
      </p>

      {canToggle ? (
        <button
          type="button"
          aria-expanded={
            descriptionOpen
          }
          onClick={() =>
            setDescriptionOpen(
              (current) => !current
            )
          }
          className="mt-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-black text-neutral-700 shadow-sm transition hover:border-neutral-300"
        >
          {descriptionOpen
            ? "Näita vähem"
            : "Vaata rohkem"}
        </button>
      ) : null}
    </div>
  );
}

function ShowcaseCard({
  showcase,
  expanded,
}: {
  showcase: PublicProductShowcase;
  expanded: boolean;
}) {
  return (
    <article
      className={[
        "min-w-0 rounded-[24px] border border-black/5 bg-white p-3 shadow-sm",
        expanded
          ? "w-full"
          : "w-[250px] flex-none",
      ].join(" ")}
    >
      <ShowcaseInteractiveGallery
        showcase={showcase}
        expanded={expanded}
      />

      <div className="mt-3 flex min-w-0 items-center justify-between gap-3">
        <span className="max-w-full truncate rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
          {showcase.category ||
            "Tootenäidis"}
        </span>

        {showcase.images.length > 1 ? (
          <span className="shrink-0 text-[11px] font-black text-neutral-400">
            {showcase.images.length} pilti
          </span>
        ) : null}
      </div>

      <h3
        className={[
          "mt-2 break-words text-base font-black",
          expanded
            ? ""
            : "line-clamp-2",
        ].join(" ")}
      >
        {showcase.title}
      </h3>

      <ShowcaseDescription
        showcaseId={showcase.id}
        description={showcase.description}
        expanded={expanded}
      />
    </article>
  );
}

export default function
PublicProfileProductShowcasesSection({
  profile,
}: {
  profile: PublicProfile;
}) {
  const {
    showcases,
    loading,
    error,
  } =
    usePublicProfileProductShowcases(
      profile
    );

  const [expanded, setExpanded] =
    useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [
    profile.identityId,
    profile.slug,
  ]);

  const previewShowcases =
    useMemo(
      () =>
        showcases.slice(
          0,
          SHOWCASE_PREVIEW_LIMIT
        ),
      [showcases]
    );

  const canExpand =
    showcases.length >
      SHOWCASE_PREVIEW_LIMIT ||
    showcases.some(
      (showcase) =>
        showcase.images.length > 1
    );

  if (
    !loading &&
    !error &&
    showcases.length === 0
  ) {
    return null;
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex min-w-0 items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-neutral-400">
            Tootenäidised
          </p>

          <h2 className="mt-2 break-words text-2xl font-black tracking-tight md:text-3xl">
            Mida see profiil pakub
          </h2>
        </div>

        {!loading &&
        !error &&
        canExpand ? (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() =>
              setExpanded(
                (current) => !current
              )
            }
            className="shrink-0 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-black shadow-sm transition hover:border-neutral-300"
          >
            {expanded
              ? "Näita vähem"
              : showcases.length >
                  SHOWCASE_PREVIEW_LIMIT
                ? `Vaata kõiki (${showcases.length})`
                : "Vaata lähemalt"}
          </button>
        ) : null}
      </div>

      {loading ? (
        <LoadingShowcases />
      ) : null}

      {!loading && error ? (
        <div className="rounded-[22px] border border-red-100 bg-red-50 p-5">
          <h3 className="font-black text-red-950">
            Tootenäidiseid ei saanud laadida
          </h3>

          <p className="mt-2 text-sm leading-6 text-red-800">
            {error}
          </p>
        </div>
      ) : null}

      {!loading &&
      !error &&
      showcases.length > 0 ? (
        expanded ? (
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            {showcases.map(
              (showcase) => (
                <ShowcaseCard
                  key={showcase.id}
                  showcase={showcase}
                  expanded
                />
              )
            )}
          </div>
        ) : (
          <div className="w-full max-w-full overflow-x-auto overscroll-x-contain pb-2">
            <div className="flex w-max gap-4 px-1">
              {previewShowcases.map(
                (showcase) => (
                  <ShowcaseCard
                    key={showcase.id}
                    showcase={showcase}
                    expanded={false}
                  />
                )
              )}
            </div>
          </div>
        )
      ) : null}
    </section>
  );
}
