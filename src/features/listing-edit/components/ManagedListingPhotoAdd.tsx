"use client";
import {useEffect, useId, useState} from "react";
import {PRIVATE_UPLOAD} from "../../../entities/listing/model/privatePublicationUpload";
import {MANAGED_LISTING_IMAGE_LIMIT, type ManagedListingImagesKey,
  type ManagedListingImagesSnapshot} from "../../../entities/listing/model/managedListingImages";
import type {RunPhotoAddition} from "../model/managedPhotoAdditionSession";
import {useManagedPhotoAddition} from "../model/useManagedPhotoAddition";

type Props = {ownerKey: ManagedListingImagesKey; gallery: ManagedListingImagesSnapshot | null;
  blocked: boolean; runOperation: RunPhotoAddition};
export default function ManagedListingPhotoAdd({ownerKey, gallery, blocked, runOperation}: Props) {
  const {session, view, ready} = useManagedPhotoAddition(ownerKey, runOperation);
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null), inputId = useId();
  const busy = view.phase === "busy", disabled = blocked || !ready || busy;
  const full = !!gallery && gallery.images.length >= MANAGED_LISTING_IMAGE_LIMIT;
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => { if (view.phase === "added" || view.phase === "closed") setFile(null); }, [view.phase]);
  const select = (selected: File | undefined) => {
    setError(null);
    if (!selected) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)
      || selected.size < 1 || selected.size > PRIVATE_UPLOAD.maxSourceBytes) {
      setFile(null); setError("Vali JPEG-, PNG- või WebP-foto, mille suurus on kuni 25 MiB."); return;
    }
    setFile(selected);
  };
  const button = "min-h-11 rounded-full border px-4 py-2 text-sm font-bold disabled:opacity-50";
  const choose = view.phase === "idle" || view.phase === "needs_file";
  return <div className="space-y-3 border-t border-neutral-200 pt-4" aria-label="Foto lisamine" aria-busy={busy}>
    {choose ? <>
      {view.phase === "idle" && full ? <p className="text-sm text-neutral-600">Kuulutusel on 10 fotot.</p> : <>
        <label htmlFor={inputId} className="block text-sm font-bold">{view.phase === "needs_file" ? "Vali sama foto" : "Lisa foto"}</label>
        <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || !gallery}
          onChange={event => { select(event.target.files?.[0]); event.target.value = ""; }}
          className="block max-w-full min-w-0 text-sm file:mr-3 file:min-h-11 file:rounded-full file:border file:border-neutral-300 file:bg-white file:px-4 file:font-bold disabled:opacity-50" />
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
        {view.phase === "idle" ? <button type="button" className={button} disabled={disabled}
          onClick={() => { setFile(null); setError(null); }}>Jäta lisamata</button> : null}
      </div> : null}
    </> : null}
    {view.message ? <p role="status" aria-live="polite" className="text-sm">{view.message}</p> : null}
    {error ? <p role="alert" className="text-sm text-red-800">{error}</p> : null}
    {["resume", "unknown", "needs_attention", "needs_file"].includes(view.phase) ? <div className="flex flex-wrap gap-3">
      {view.phase === "resume" || view.phase === "unknown" ? <button type="button" className={button} disabled={disabled}
        onClick={() => { if (!disabled) void session.current?.resume(); }}>Kontrolli ja jätka lisamist</button> : null}
      <button type="button" className={button} disabled={disabled}
        onClick={() => { if (!disabled) void session.current?.cancel(); }}>Katkesta lisamine</button>
    </div> : null}
    {view.phase === "added" || view.phase === "closed" ? <button type="button" className={button} disabled={disabled || full}
      onClick={() => { if (!disabled) void session.current?.reset(); }}>Lisa järgmine foto</button> : null}
  </div>;
}
