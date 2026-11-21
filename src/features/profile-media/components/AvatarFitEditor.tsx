"use client";
import {useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent} from "react";
import {useV2Translation} from "../../../shared/i18n/V2LanguageProvider";
import {clampAvatarFit, type AvatarFit} from "../../../shared/profile-media/avatarFit";
import {DEFAULT_COVER_FIT, dragCoverFit} from "../../../shared/profile-media/coverFit";
import {coverImageStyle} from "../../../shared/profile-media/ProfileCover";
import type {PreparedProfileImage} from "../model/prepareProfileImage";
import {profileMediaMessages} from "../i18n/messages";

const secondary = "inline-flex min-h-11 items-center justify-center rounded-full border border-neutral-300 bg-white px-4 py-2.5 text-sm font-bold transition hover:border-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-default disabled:opacity-50";
const primary = "inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-default disabled:opacity-50";

/** Fits only the bounded, oriented local selection. Saved remote pictures are never fetched here. */
export default function AvatarFitEditor({source, value, disabled, busy, onChange, onApply, onCancel}: {
  source: PreparedProfileImage; value: AvatarFit; disabled: boolean; busy: boolean;
  onChange: (value: AvatarFit) => void; onApply: () => void; onCancel: () => void;
}) {
  const {t} = useV2Translation(profileMediaMessages), id = useId();
  const frame = useRef<HTMLDivElement>(null), selectedMode = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{blob: Blob; url: string} | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const drag = useRef<{pointerId: number; x: number; y: number; fit: AvatarFit; width: number; height: number} | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(source.preview); setPreview({blob: source.preview, url});
    return () => {URL.revokeObjectURL(url);};
  }, [source.preview]);
  useEffect(() => {selectedMode.current?.focus();}, []);
  useEffect(() => {drag.current = null;}, [source, disabled, value.mode]);
  const previewUrl = preview?.blob === source.preview ? preview.url : null;
  const fill = value.mode === "cover";

  function update(next: Partial<AvatarFit>) {onChange(clampAvatarFit({...value, ...next}));}
  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (disabled || !fill || !previewUrl || event.button !== 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    event.preventDefault(); event.currentTarget.focus();
    drag.current = {pointerId: event.pointerId, x: event.clientX, y: event.clientY, fit: value,
      width: bounds.width, height: bounds.height};
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (disabled || !fill || !start || start.pointerId !== event.pointerId) return;
    const position = dragCoverFit(start.fit, event.clientX - start.x, event.clientY - start.y,
      source.width, source.height, start.width, start.height);
    onChange(clampAvatarFit({...position, mode: "cover"}));
  }
  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function keyboardMove(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled || !fill || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 50 : 10;
    update({focus_x: value.focus_x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0),
      focus_y: value.focus_y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0)});
  }

  return <div className="mt-4 rounded-2xl bg-neutral-50 p-4" aria-busy={busy}>
    <h4 className="font-bold">{t("fitTitle")}</h4>
    <p id={`${id}-help`} className="mt-2 text-sm leading-6 text-neutral-600">{t("avatarFitHelp")}</p>
    <fieldset className="mt-4 min-w-0" disabled={disabled}>
      <legend className="text-sm font-semibold">{t("avatarDisplay")}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {(["cover", "contain"] as const).map(mode => <label key={mode}
          className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-semibold ${value.mode === mode ? "border-emerald-700 text-emerald-800" : "border-neutral-300 text-neutral-700"}`}>
          <input ref={value.mode === mode ? selectedMode : undefined} type="radio" name={`${id}-display`} value={mode}
            checked={value.mode === mode} className="accent-emerald-700" onChange={() => update({mode})}/>
          {t(mode === "cover" ? "avatarFill" : "avatarWhole")}
        </label>)}
      </div>
    </fieldset>
    <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
      <div ref={frame} className={`relative isolate shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 ${fill ? "cursor-grab touch-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 active:cursor-grabbing" : ""}`}
        style={{width: "min(100%, 240px)", aspectRatio: "1 / 1", ...(fill ? {touchAction: "none"} : {})}}
        tabIndex={fill ? 0 : undefined} role="group" aria-label={t("avatarPreview")} aria-describedby={`${id}-help`}
        aria-disabled={disabled || undefined} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag}
        onPointerCancel={endDrag} onLostPointerCapture={() => {drag.current = null;}} onKeyDown={keyboardMove}>
        {previewUrl && failed !== previewUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={previewUrl} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none"
            style={fill ? {...coverImageStyle(value), objectFit: "cover"} : {objectFit: "contain"}}
            onError={() => setFailed(previewUrl)}/>
          : null}
      </div>
      <div className="min-w-0 flex-1">
        {fill ? <div className="space-y-4">
          {(["zoom", "focus_x", "focus_y"] as const).map(field => <label key={field} className="block text-sm font-semibold">
            <span className="flex justify-between gap-3"><span>{t(field === "zoom" ? "zoom" : field === "focus_x" ? "horizontal" : "vertical")}</span>
              <span className="font-normal tabular-nums">{Math.round(value[field] / 10)}%</span></span>
            <input type="range" min={field === "zoom" ? 1000 : 0} max={field === "zoom" ? 2000 : 1000} step={10}
              value={value[field]} disabled={disabled} aria-valuetext={`${Math.round(value[field] / 10)}%`}
              className="mt-3 block min-h-8 w-full accent-emerald-700" onChange={event => update({[field]: Number(event.target.value)})}/>
          </label>)}
        </div> : <p className="text-sm leading-6 text-neutral-600">{t("avatarWholeHelp")}</p>}
      </div>
    </div>
    {previewUrl && failed === previewUrl ? <p role="alert" className="mt-3 text-sm text-amber-900">{t("decodeError")}</p> : null}
    <div className="mt-5 flex flex-wrap gap-2">
      {fill ? <button type="button" className={secondary} disabled={disabled}
        onClick={() => onChange(clampAvatarFit({...DEFAULT_COVER_FIT, mode: value.mode}))}>{t("reset")}</button> : null}
      <button type="button" className={primary} disabled={disabled || !previewUrl || failed === previewUrl} onClick={onApply}>
        {t(busy ? "preparing" : "apply")}
      </button>
      <button type="button" className={secondary} disabled={busy} onClick={onCancel}>{t("cancelFit")}</button>
    </div>
  </div>;
}
