"use client";
import {useEffect, useRef, useState, type PointerEvent, type KeyboardEvent} from "react";
import {useV2Translation} from "../../../shared/i18n/V2LanguageProvider";
import ProfileAvatar from "../../../shared/profile-media/ProfileAvatar";
import ProfileCover from "../../../shared/profile-media/ProfileCover";
import {clampAvatarFit, type AvatarFit} from "../../../shared/profile-media/avatarFit";
import {clampCoverFit, DEFAULT_COVER_FIT, dragCoverFit, type CoverFit} from "../../../shared/profile-media/coverFit";
import type {ProfileMediaSlot} from "../../../entities/profile/model/profileMedia";
import type {PreparedProfileImage} from "../model/prepareProfileImage";
import type {ProfileMediaEditorState} from "../model/useProfileMediaEditor";
import {profileMediaMessages} from "../i18n/messages";
import AvatarFitEditor from "./AvatarFitEditor";

const secondary = "inline-flex min-h-11 items-center justify-center rounded-full border border-neutral-300 bg-white px-4 py-2.5 text-sm font-bold transition hover:border-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-default disabled:opacity-50";
const primary = "inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-default disabled:opacity-50";
type FitDraft = {key: string; value: CoverFit};
type AvatarFitDraft = {key: string; source: PreparedProfileImage; value: AvatarFit};

export default function ProfileMediaEditor({state, name, business, onEditingChange}: {
  state: ProfileMediaEditorState; name: string; business: boolean; onEditingChange?: (editing: boolean) => void;
}) {
  const {t} = useV2Translation(profileMediaMessages), {session, view, ready} = state;
  const avatarInput = useRef<HTMLInputElement>(null), coverInput = useRef<HTMLInputElement>(null), frame = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{blob: Blob; url: string} | null>(null);
  const [fitting, setFitting] = useState<FitDraft | null>(null);
  const [avatarFitting, setAvatarFitting] = useState<AvatarFitDraft | null>(null);
  const selectionAttempt = useRef(0), currentSession = useRef(session); currentSession.current = session;
  useEffect(() => () => {++selectionAttempt.current;}, [session]);
  const drag = useRef<{pointerId: number; x: number; y: number; fit: CoverFit; width: number; height: number; imageWidth: number; imageHeight: number} | null>(null);
  const blob = view?.draft?.prepared?.preview ?? null;
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob); setPreview({blob, url});
    return () => {URL.revokeObjectURL(url);};
  }, [blob]);
  const previewUrl = blob && preview?.blob === blob ? preview.url : null;
  const draft = view?.draft, coverDraft = draft?.slot === "cover" ? draft : null;
  const avatarDraft = draft?.slot === "avatar" && draft.action === "set" ? draft : null;
  const avatarKey = `${view?.saved.identity_id ?? ""}:${avatarDraft?.assetId ?? ""}`;
  const activeAvatarFit = avatarFitting?.key === avatarKey && avatarFitting.source === avatarDraft?.avatarSource ? avatarFitting : null;
  const cover = coverDraft?.action === "remove" ? null : coverDraft?.uploaded ?? view?.saved.cover ?? null;
  const coverWidth = coverDraft?.prepared?.width ?? cover?.width ?? null;
  const coverHeight = coverDraft?.prepared?.height ?? cover?.height ?? null;
  const coverKey = `${view?.saved.identity_id ?? ""}:${coverDraft?.assetId ?? cover?.asset_id ?? ""}`;
  const fit = coverDraft?.fit ?? view?.saved ?? DEFAULT_COVER_FIT;
  const activeFit = fitting?.key === coverKey && coverDraft?.action !== "remove" ? fitting : null;
  const canFit = !!coverWidth && !!coverHeight && (!!coverDraft?.prepared || !!cover?.asset_id);
  const locked = !view || !ready || !view.available || view.phase !== "ready";
  const working = !!view && ["preparing", "uploading", "saving", "checking"].includes(view.phase);
  const protectFit = !!activeFit || !!activeAvatarFit;
  useEffect(() => {onEditingChange?.(protectFit); return () => {onEditingChange?.(false);};}, [protectFit, onEditingChange]);
  useEffect(() => {
    if (!protectFit) return;
    const guard = (event: BeforeUnloadEvent) => {event.preventDefault(); event.returnValue = "";};
    window.addEventListener("beforeunload", guard); return () => {window.removeEventListener("beforeunload", guard);};
  }, [protectFit]);

  function choose(slot: ProfileMediaSlot, file: File | undefined) {
    if (!session || !file) return;
    const attempt = ++selectionAttempt.current, previous = session.getSnapshot().draft;
    setFitting(null); setAvatarFitting(null); drag.current = null;
    void session.choose(file, slot, business ? "contain" : "cover").then(() => {
      if (slot !== "avatar" || selectionAttempt.current !== attempt || currentSession.current !== session) return;
      const next = session.getSnapshot();
      const selected = next.draft;
      if (next.phase === "retired" || !selected || selected === previous || selected.slot !== "avatar"
        || selected.action !== "set" || !selected.avatarSource || !selected.avatarFit) return;
      setAvatarFitting({key: `${next.saved.identity_id}:${selected.assetId ?? ""}`, source: selected.avatarSource,
        value: clampAvatarFit(selected.avatarFit)});
    });
  }
  function clearFitting() {
    ++selectionAttempt.current; drag.current = null; setFitting(null); setAvatarFitting(null);
  }
  function openAvatarFit() {
    if (!avatarDraft?.avatarSource || !avatarDraft.avatarFit || locked || protectFit) return;
    setAvatarFitting({key: avatarKey, source: avatarDraft.avatarSource, value: clampAvatarFit(avatarDraft.avatarFit)});
  }
  async function applyAvatarFit() {
    if (!session || !activeAvatarFit || locked) return;
    const selectedFit = activeAvatarFit;
    if (await session.fitAvatar(selectedFit.value)) {
      if (currentSession.current !== session) return;
      setAvatarFitting(current => current === selectedFit ? null : current);
    }
  }
  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!activeFit || locked || !coverWidth || !coverHeight || event.button !== 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.preventDefault();
    drag.current = {pointerId: event.pointerId, x: event.clientX, y: event.clientY, fit: activeFit.value,
      width: bounds.width, height: bounds.height, imageWidth: coverWidth, imageHeight: coverHeight};
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!activeFit || locked || !start || event.pointerId !== start.pointerId) return;
    const value = dragCoverFit(start.fit, event.clientX - start.x, event.clientY - start.y,
      start.imageWidth, start.imageHeight, start.width, start.height);
    setFitting({key: coverKey, value});
  }
  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function keyboardMove(event: KeyboardEvent<HTMLDivElement>) {
    if (!activeFit || locked || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 50 : 10;
    setFitting({key: coverKey, value: clampCoverFit({...activeFit.value,
      focus_x: activeFit.value.focus_x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0),
      focus_y: activeFit.value.focus_y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0)})});
  }
  function controls(slot: ProfileMediaSlot) {
    if (!view || !session) return null;
    const selected = draft?.slot === slot, other = !!draft && !selected;
    return <div className="flex flex-wrap gap-2">
      <button type="button" className={secondary} disabled={locked || other || protectFit}
        onClick={() => (slot === "avatar" ? avatarInput : coverInput).current?.click()}>
        {t(view.saved[slot] ? "change" : "choose")}
      </button>
      {view.saved[slot] ? <button type="button" className={secondary} disabled={locked || other || protectFit || (selected && draft?.action === "remove")}
        onClick={() => {clearFitting(); session.remove(slot);}}>{t("remove")}</button> : null}
      {slot === "avatar" && avatarDraft?.avatarSource && avatarDraft.avatarFit ? <button type="button" className={secondary}
        disabled={locked || other || protectFit} onClick={openAvatarFit}>{t("fit")}</button> : null}
      {slot === "cover" && canFit ? <button type="button" className={secondary} disabled={locked || other || protectFit}
        onClick={() => setFitting({key: coverKey, value: clampCoverFit(fit)})}>{t("fit")}</button> : null}
    </div>;
  }
  function draftActions(slot: ProfileMediaSlot) {
    if (!draft || draft.slot !== slot || !view || !session || protectFit) return null;
    return <div className="mt-4 space-y-3">
      <p className="text-sm leading-6 text-neutral-600">{t(draft.action === "remove" ? "removalPending" : "unsaved")}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primary} disabled={locked} onClick={() => void session.save()}>
          {t(view.phase === "uploading" ? "uploading" : view.phase === "saving" ? "saving"
            : draft.action === "remove" ? "saveRemoval" : slot === "cover" ? "saveCover" : "save")}
        </button>
        <button type="button" className={secondary} disabled={working || view.phase === "uncertain"}
          onClick={() => {clearFitting(); session.cancel();}}>{t("cancel")}</button>
      </div>
    </div>;
  }
  const notice = state.error ?? view?.notice;
  return <section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="profile-media-heading">
    <h2 id="profile-media-heading" className="text-xl font-black">{t("title")}</h2>
    <p className="mt-2 text-sm leading-6 text-neutral-600">{t("intro")}</p>
    <p className="mt-1 text-sm leading-6 text-neutral-600">{t("formats")}</p>
    {/* Keep the native input mounted and enabled during a file-picker focus refresh. */}
    <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" hidden
      onChange={event => {const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; choose("avatar", file);}} />
    <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" hidden
      onChange={event => {const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; choose("cover", file);}} />
    {!view || !session ? <div className="mt-5">
      <p role={state.error ? "alert" : "status"} className="text-sm text-neutral-600">{t(state.error ?? "loading")}</p>
      {state.error ? <button type="button" className={`${secondary} mt-3`} onClick={state.refresh}>{t("retry")}</button> : null}
    </div> : <>
      <div className="mt-6 rounded-2xl border border-neutral-200 p-4 sm:p-5">
        <h3 className="text-base font-bold">{t(business ? "logo" : "avatar")}</h3>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{t("avatarHelp")}</p>
        {activeAvatarFit ? <AvatarFitEditor key={avatarKey} source={activeAvatarFit.source} value={activeAvatarFit.value}
          disabled={locked} busy={view.phase === "preparing"}
          onChange={value => setAvatarFitting(current => current?.key === activeAvatarFit.key && current.source === activeAvatarFit.source ? {...current, value} : current)}
          onApply={() => void applyAvatarFit()} onCancel={() => setAvatarFitting(null)}/>
        : <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
          <ProfileAvatar name={name} url={draft?.slot === "avatar" && draft.action === "remove" ? null : view.saved.avatar?.url}
            localPreview={draft?.slot === "avatar" && draft.action === "set" ? previewUrl : null} className="h-24 w-24 border border-neutral-200 text-3xl" />
          <div className="min-w-0 flex-1">{controls("avatar")}{draftActions("avatar")}
            {view.saved.avatar && !avatarDraft ? <p className="mt-3 text-xs leading-5 text-neutral-500">{t("avatarSavedHelp")}</p> : null}
          </div>
        </div>}
      </div>
      <div className="mt-5 rounded-2xl border border-neutral-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-bold">{t("cover")}</h3>
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">{t("optional")}</span></div>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{t("coverHelp")}</p>
        <div ref={frame} className={`mt-4 overflow-hidden rounded-2xl ${activeFit ? "cursor-grab touch-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 active:cursor-grabbing" : ""}`}
          style={activeFit ? {touchAction: "none"} : undefined} tabIndex={activeFit ? 0 : undefined}
          role={activeFit ? "group" : undefined} aria-label={t("coverPreview")}
          onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={keyboardMove}>
          <ProfileCover url={coverDraft?.action === "remove" ? null : cover?.url} fit={activeFit?.value ?? fit}
            localPreview={coverDraft?.action === "set" ? previewUrl : null} className="h-56 w-full" />
        </div>
        {activeFit ? <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
          <h4 className="font-bold">{t("fitTitle")}</h4><p className="mt-2 text-sm leading-6 text-neutral-600">{t("fitHelp")}</p>
          <div className="mt-4 space-y-4">
            {(["zoom", "focus_x", "focus_y"] as const).map(field => <label key={field} className="block text-sm font-semibold">
              <span className="flex justify-between gap-3"><span>{t(field === "zoom" ? "zoom" : field === "focus_x" ? "horizontal" : "vertical")}</span>
                <span className="font-normal tabular-nums">{Math.round(activeFit.value[field] / 10)}%</span></span>
              <input type="range" min={field === "zoom" ? 1000 : 0} max={field === "zoom" ? 2000 : 1000} step={10}
                value={activeFit.value[field]} disabled={locked} className="mt-3 block min-h-8 w-full accent-emerald-700"
                onChange={event => setFitting({key: coverKey, value: clampCoverFit({...activeFit.value, [field]: Number(event.target.value)})})}/>
            </label>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={secondary} disabled={locked} onClick={() => setFitting({key: coverKey, value: DEFAULT_COVER_FIT})}>{t("reset")}</button>
            <button type="button" className={primary} disabled={locked} onClick={() => {session.position(activeFit.value); setFitting(null);}}>{t("apply")}</button>
            <button type="button" className={secondary} onClick={() => setFitting(null)}>{t("cancelFit")}</button>
          </div>
        </div> : <div className="mt-4">{controls("cover")}{draftActions("cover")}</div>}
      </div>
      {draft ? <p className="mt-4 text-xs leading-5 text-neutral-500">{t("busyOther")}</p> : null}
      {view.phase === "preparing" ? <div className="mt-4 flex flex-wrap items-center gap-3">
        <p role="status" className="text-sm text-neutral-600">{t("preparing")}</p>
        <button type="button" className={secondary} onClick={() => {clearFitting(); session.cancel();}}>{t("cancel")}</button>
      </div> : !ready && !state.error ? <p role="status" className="mt-4 text-sm text-neutral-600">{t("loading")}</p> : null}
      {notice ? <div role={notice === "saved" || notice === "removed" ? "status" : "alert"}
        className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${notice === "saved" || notice === "removed" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
        <p>{t(notice)}</p>
        {view.phase === "uncertain" ? <button type="button" className={`${secondary} mt-3`} disabled={!ready} onClick={() => void session.check()}>{t("check")}</button> : null}
        {view.phase === "conflict" ? <button type="button" className={`${secondary} mt-3`} disabled={!ready} onClick={() => {
          if (!view.draft || window.confirm(t("reloadConfirm"))) {clearFitting(); void session.reload();}
        }}>{t("reload")}</button> : null}
        {state.error || !view.available ? <button type="button" className={`${secondary} mt-3`} onClick={state.refresh}>{t("retry")}</button> : null}
      </div> : null}
    </>}
  </section>;
}
