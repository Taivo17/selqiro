"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { publicUiMessages } from "../../../lib/i18n/catalogs/publicUi";
import { useV2Translation } from "../i18n/V2LanguageProvider";

export type PublicGalleryPhoto = Readonly<{
  id: string;
  src: string;
  thumbnailSrc?: string | null;
  fullSrc?: string | null;
}>;

type Props = {
  title: string;
  photos: readonly PublicGalleryPhoto[];
  className?: string;
};

/** Presentation only: sources come from each listing's existing public read contract. */
export default function PublicPhotoGallery({ title, photos, className = "" }: Props) {
  const { t } = useV2Translation(publicUiMessages);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const gestureRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const selectedIndex = Math.max(0, photos.findIndex(photo => photo.id === selectedId));
  const photo = photos[selectedIndex];
  const viewerOpen = expanded && !!photo;
  const multiple = photos.length > 1;

  useEffect(() => {
    if (!viewerOpen || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    // A modal dialog keeps keyboard focus inside the viewer and the page behind it inert.
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, [viewerOpen]);

  function move(direction: -1 | 1) {
    if (!multiple) return;
    setSelectedId(previous => {
      const current = Math.max(0, photos.findIndex(item => item.id === previous));
      return photos[(current + direction + photos.length) % photos.length].id;
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!multiple || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "ArrowLeft") move(-1);
    else if (event.key === "ArrowRight") move(1);
    else setSelectedId(photos[event.key === "Home" ? 0 : photos.length - 1].id);
  }

  function startGesture(event: PointerEvent<HTMLElement>) {
    gestureRef.current = null;
    suppressClickRef.current = false;
    if (event.pointerType === "mouse") return;
    if (!event.isPrimary) { suppressClickRef.current = true; return; }
    gestureRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function finishGesture(event: PointerEvent<HTMLElement>) {
    const start = gestureRef.current;
    gestureRef.current = null;
    if (!start || event.pointerId !== start.id) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    // Scrolling or swiping must never also activate the image button.
    suppressClickRef.current = Math.abs(dx) > 10 || Math.abs(dy) > 10;
    if (Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(dy) * 1.25) move(dx < 0 ? 1 : -1);
  }

  function cancelGesture() {
    gestureRef.current = null;
    suppressClickRef.current = true;
  }

  const navigation = (large = false) => multiple ? (
    <div className="pointer-events-none absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between sm:inset-x-4">
      {([-1, 1] as const).map(direction => (
        <button key={direction} type="button" aria-label={t(direction === -1 ? "previous_image" : "next_image")}
          onPointerDown={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()}
          onClick={event => { event.stopPropagation(); move(direction); }}
          className={"pointer-events-auto flex shrink-0 items-center justify-center rounded-full bg-white/95 font-black text-neutral-950 shadow-md hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500 "
            + (large ? "h-12 w-12 text-3xl" : "h-11 w-11 text-2xl")}>
          <span aria-hidden="true">{direction === -1 ? "‹" : "›"}</span>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <section className={`min-w-0 ${className}`} aria-label={t("gallery_title", { title })} onKeyDown={handleKeyDown}>
      {photo ? <>
        <div className="relative overflow-hidden rounded-[26px] bg-neutral-100">
          <button type="button" aria-haspopup="dialog" aria-label={t("enlarge_image_of_count", { index: selectedIndex + 1, count: photos.length })}
            className="block w-full cursor-zoom-in rounded-[26px] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-amber-500"
            style={{ touchAction: "pan-y pinch-zoom" }}
            onPointerDown={startGesture} onPointerUp={finishGesture} onPointerCancel={cancelGesture}
            onClick={event => {
              if (suppressClickRef.current && event.detail !== 0) {
                suppressClickRef.current = false;
                event.preventDefault();
                return;
              }
              setExpanded(true);
            }}>
            <img src={photo.src} alt={t("image_alt", { title, index: selectedIndex + 1 })} draggable={false}
              className="aspect-[4/3] max-h-[620px] w-full select-none rounded-[26px] object-contain object-center" />
            <span aria-hidden="true" className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-2 text-xs font-bold shadow-sm">
              {t("enlarge")}
            </span>
          </button>
          {navigation()}
          {multiple ? <span aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/65 px-3 py-2 text-xs font-semibold text-white">
            {selectedIndex + 1} / {photos.length}
          </span> : null}
        </div>
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {t("image_of_count", { index: selectedIndex + 1, count: photos.length })}
        </p>
        {multiple ? <div className="mt-4 flex max-w-full gap-3 overflow-x-auto overscroll-x-contain pb-3 pr-2"
          aria-label={t("gallery_thumbnails", { title })}>
          {photos.map((item, index) => <button type="button" key={item.id} aria-label={t("show_image_of_count", { index: index + 1, count: photos.length })}
            aria-pressed={index === selectedIndex} onClick={() => setSelectedId(item.id)}
            className={"h-20 w-24 shrink-0 rounded-[18px] border-2 p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 md:w-28 "
              + (index === selectedIndex ? "border-amber-500 bg-amber-50" : "border-transparent hover:border-neutral-300")}>
            <img src={item.thumbnailSrc || item.src} alt="" loading="lazy" draggable={false}
              className="h-full w-full rounded-[14px] object-cover object-[center_40%]" />
          </button>)}
        </div> : null}
      </> : <div className="flex aspect-[4/3] w-full items-center justify-center rounded-[26px] bg-neutral-100 text-neutral-500">
        {t("no_image")}
      </div>}

      {viewerOpen ? <dialog ref={dialogRef} aria-label={t("gallery_title", { title })} aria-modal="true"
        className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-black/95 p-3 text-white open:flex open:flex-col sm:p-5"
        onCancel={event => { event.preventDefault(); setExpanded(false); }} onClose={() => setExpanded(false)}
        onKeyDown={handleKeyDown} onClick={event => { if (event.target === event.currentTarget) setExpanded(false); }}>
        <div className="flex shrink-0 items-center justify-between gap-4 pb-3">
          <p className="text-sm font-semibold" role="status" aria-live="polite" aria-atomic="true">{t("image_of_count", { index: selectedIndex + 1, count: photos.length })}</p>
          <button ref={closeRef} type="button" onClick={() => setExpanded(false)} aria-label={t("close_image")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-3xl font-bold text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center" style={{ touchAction: "pan-y pinch-zoom" }}
          onPointerDown={startGesture} onPointerUp={finishGesture} onPointerCancel={cancelGesture}
          onClick={event => { if (event.target === event.currentTarget && !suppressClickRef.current) setExpanded(false); }}>
          <img src={photo.fullSrc || photo.src} alt={t("image_alt", { title, index: selectedIndex + 1 })} draggable={false}
            className="max-h-full max-w-full select-none object-contain" />
          {navigation(true)}
        </div>
      </dialog> : null}
    </section>
  );
}
