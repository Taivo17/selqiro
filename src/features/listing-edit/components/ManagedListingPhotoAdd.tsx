"use client";
import {useEffect, useId, useRef, useState} from "react";
import {PRIVATE_UPLOAD} from "../../../entities/listing/model/privatePublicationUpload";
import {MANAGED_LISTING_IMAGE_LIMIT, type ManagedListingImagesKey,
  type ManagedListingImagesSnapshot} from "../../../entities/listing/model/managedListingImages";
import type {ManagedPhotoAdditionSession, RunPhotoAddition} from "../model/managedPhotoAdditionSession";
import {useManagedPhotoAddition} from "../model/useManagedPhotoAddition";

type Props = {ownerKey: ManagedListingImagesKey; gallery: ManagedListingImagesSnapshot | null;
  blocked: boolean; runOperation: RunPhotoAddition};
type PendingSelection = {file: File; controller: ManagedPhotoAdditionSession; version: number};
export default function ManagedListingPhotoAdd({ownerKey, gallery, blocked, runOperation}: Props) {
  const {session, view, ready} = useManagedPhotoAddition(ownerKey, runOperation);
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null), inputId = useId();
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const input = useRef<HTMLInputElement | null>(null), selection = useRef(0);
  const picker = useRef<ManagedPhotoAdditionSession | null>(null);
  const preparing = useRef<PendingSelection | null>(null);
  const busy = view.phase === "busy", disabled = blocked || !ready || busy;
  const full = !!gallery && gallery.images.length >= MANAGED_LISTING_IMAGE_LIMIT;
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => { if (view.phase === "added" || view.phase === "closed") setFile(null); }, [view.phase]);
  useEffect(() => () => { ++selection.current; }, []);
  useEffect(() => {
    if (!pending) return;
    const {controller, version, file: selected} = pending;
    if (session.current !== controller || selection.current !== version) {
      setPending(null); return;
    }
    // A focus refresh may start before native input change. Retain the local
    // choice, but wait for the existing owner guard before touching its journal.
    if (disabled || !gallery || full || preparing.current === pending) return;
    preparing.current = pending;
    void (async () => {
      if (controller.view.phase === "added" || controller.view.phase === "closed") await controller.reset();
      if (session.current === controller && selection.current === version
        && ["idle", "needs_file"].includes(controller.view.phase)) setFile(selected);
      setPending(current => current === pending ? null : current);
      if (preparing.current === pending) preparing.current = null;
    })();
  }, [pending, disabled, gallery, full, session]);
  const discardSelection = () => {
    ++selection.current; setPending(null); setFile(null); setError(null);
  };
  const openPicker = () => {
    if (disabled || pending || !gallery || full || !session.current) return;
    setError(null);
    picker.current = session.current;
    // Keep the native picker inside this user gesture. Reset is asynchronous
    // and remains guarded; it runs only after a real selection, never on cancel.
    input.current?.click();
  };
  const select = (selected: File | undefined) => {
    const controller = picker.current; picker.current = null;
    if (!selected || !controller || session.current !== controller || !ready || busy) return;
    const version = ++selection.current;
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)
      || selected.size < 1 || selected.size > PRIVATE_UPLOAD.maxSourceBytes) {
      setFile(null); setPending(null); setError("Vali JPEG-, PNG- või WebP-foto, mille suurus on kuni 25 MiB."); return;
    }
    setFile(null); setPending({file: selected, controller, version});
  };
  const button = "min-h-11 rounded-full border px-4 py-2 text-sm font-bold disabled:opacity-50";
  const choose = view.phase === "idle" || view.phase === "needs_file";
  return <div className="space-y-3 border-t border-neutral-200 pt-4" aria-label="Foto lisamine" aria-busy={busy}>
    {/* The guarded visible button opens this input. Keep it enabled so a passive
        owner refresh cannot suppress the native selection's change event. */}
    <input ref={input} id={inputId} type="file" accept="image/jpeg,image/png,image/webp"
      hidden aria-label="Vali kuulutusele lisatav foto"
      onChange={event => { const selected = event.target.files?.[0]; event.target.value = ""; select(selected); }} />
    {choose ? <>
      {view.phase === "idle" && full ? <p className="text-sm text-neutral-600">Kuulutusel on 10 fotot.</p> : <>
        <p className="text-sm font-bold">{view.phase === "needs_file" ? "Vali sama foto" : "Lisa foto"}</p>
        <button type="button" className={button} disabled={disabled || !!pending || !gallery || full}
          aria-controls={inputId} onClick={openPicker}>
          {view.phase === "needs_file" ? "Vali sama algne foto" : file ? "Vali teine foto" : "Vali foto"}
        </button>
        <p className="text-sm text-neutral-600">Lisa üks foto korraga. Kuni 10 fotot, iga foto kuni 25 MiB. Praegune põhipilt jääb alles.</p>
      </>}
      {preview && file ? <div className="flex flex-wrap items-center gap-3">
        {/* A local object URL is revoked when selection or owner context changes. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Lisatava foto eelvaade" className="h-28 w-36 rounded-xl object-contain" />
        <button type="button" className={button + " bg-black text-white"} disabled={disabled || !gallery || full}
          onClick={() => { if (!disabled && gallery && file) {
            if (view.phase === "needs_file") void session.current?.resume(file);
            else void session.current?.start(gallery, file);
          } }}>{view.phase === "needs_file" ? "Jätka foto lisamist" : "Lisa kuulutusele"}</button>
        {view.phase === "idle" ? <button type="button" className={button}
          onClick={discardSelection}>Jäta lisamata</button> : null}
      </div> : null}
    </> : null}
    {pending ? <div className="space-y-2">
      <p role="status" aria-live="polite" className="text-sm">{full
        ? "Kuulutusel on 10 fotot. Valitud fotot ei ole lisatud."
        : "Foto on valitud, kuid seda ei ole veel lisatud."}</p>
      <button type="button" className={button} onClick={discardSelection}>Jäta lisamata</button>
    </div> : !error && view.message ? <p role="status" aria-live="polite" className="text-sm">{view.message}</p> : null}
    {error ? <p role="alert" className="text-sm text-red-800">{error}</p> : null}
    {["resume", "unknown", "needs_attention", "needs_file"].includes(view.phase) ? <div className="flex flex-wrap gap-3">
      {view.phase === "resume" || view.phase === "unknown" ? <button type="button" className={button} disabled={disabled}
        onClick={() => { if (!disabled) void session.current?.resume(); }}>Kontrolli ja jätka lisamist</button> : null}
      <button type="button" className={button} disabled={disabled}
        onClick={() => { if (!disabled) void session.current?.cancel(); }}>Katkesta lisamine</button>
    </div> : null}
    {view.phase === "added" || view.phase === "closed" ? <>
      {full && !pending ? <p className="text-sm text-neutral-600">Kuulutusel on 10 fotot.</p> : null}
      <button type="button" className={button} disabled={disabled || !!pending || !gallery || full}
        aria-controls={inputId} onClick={openPicker}>Lisa järgmine foto</button>
    </> : null}
  </div>;
}
