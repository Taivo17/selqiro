"use client";
import Link from "next/link";
import { useEffect, useRef, type MouseEvent } from "react";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { profileEditorMessages } from "../i18n/messages";
import { PROFILE_LIMITS, type ProfileEditorField } from "../model/profileEditor";
import { useProfileEditor } from "../model/useProfileEditor";

const panel = "rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-7";
const input = "mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 disabled:bg-neutral-50 disabled:text-neutral-600 aria-invalid:border-red-600";
const secondary = "inline-flex min-h-11 items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-bold transition hover:border-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-50";

export default function ProfileEditorPage() {
  const {t} = useV2Translation(profileEditorMessages);
  const editor = useProfileEditor(), {view, session, ready} = editor;
  const formRef = useRef<HTMLFormElement>(null);
  const busy = view?.phase === "saving" || view?.phase === "checking";
  const protectDraft = !!view && (view.dirty || busy || view.phase === "uncertain");
  useEffect(() => {
    if (!protectDraft) return;
    const onUnload = (event: BeforeUnloadEvent) => {event.preventDefault(); event.returnValue = "";};
    window.addEventListener("beforeunload", onUnload);
    return () => {window.removeEventListener("beforeunload", onUnload);};
  }, [protectDraft]);
  useEffect(() => {
    if (view?.notice === "invalid") formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [view?.errors, view?.notice]);
  const leave = (event: MouseEvent<HTMLAnchorElement>) => {
    if (protectDraft && !window.confirm(t("leaveConfirm"))) event.preventDefault();
  };
  const heading = <div>
    <Link href="/v2/my-area" onClick={leave} className="text-sm font-bold text-emerald-800 underline underline-offset-4">{t("back")}</Link>
    <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{t("title")}</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">{t("intro")}</p>
  </div>;
  if (editor.context.anonymous) return <section className={`${panel} mx-auto max-w-3xl`}>
    <h1 className="text-2xl font-black">{t("signInTitle")}</h1>
    <Link className={`${secondary} mt-5`} href="/auth?next=%2Fv2%2Fmy-area%2Fprofile">{t("signIn")}</Link>
  </section>;
  if (!view || !session) return <section className={`${panel} mx-auto max-w-3xl`}>
    {heading}
    <p role={editor.error ? "alert" : "status"} className="mt-6 text-sm text-neutral-600">{t(editor.error ?? "loading")}</p>
    {editor.error ? <button type="button" onClick={editor.refresh} className={`${secondary} mt-4`}>{t("retry")}</button> : null}
  </section>;
  const disabled = !ready || !view.available || view.phase !== "ready";
  const business = view.saved.identity_type === "business";
  const publicHref = view.saved.slug ? `/v2/profile/${encodeURIComponent(view.saved.slug)}` : null;
  const textField = (field: Exclude<ProfileEditorField, "location_visibility" | "bio">,
    label: "name" | "website" | "country" | "city" | "address", help: "nameHelp" | "websiteHelp" | "countryHelp" | "cityHelp" | "addressHelp",
    required = false) => <div>
      <label htmlFor={`profile-${field}`} className="text-sm font-bold">{t(label)}{required ? " *" : ""}</label>
      <input id={`profile-${field}`} name={field} value={view.draft[field]} disabled={disabled} required={required}
        type={field === "website_url" ? "url" : "text"} autoComplete="off" spellCheck={field !== "website_url"}
        aria-invalid={!!view.errors[field]} aria-describedby={`profile-${field}-help${view.errors[field] ? ` profile-${field}-error` : ""}`}
        onChange={event => session.edit(field, event.target.value)} className={input}/>
      <p id={`profile-${field}-help`} className="mt-2 text-sm leading-5 text-neutral-600">{t(help)}</p>
      {view.errors[field] ? <p id={`profile-${field}-error`} className="mt-2 text-sm font-semibold text-red-700">{t(view.errors[field])}</p> : null}
    </div>;
  const notice = editor.error ?? view.notice;
  return <div className="mx-auto w-full max-w-3xl space-y-6 pb-8">
    <section className={panel}>
      {heading}
      <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">{t("editingAs")}</p>
        <p className="mt-2 break-words text-xl font-black">{view.saved.display_name}</p>
        <dl className="mt-4 space-y-4 text-sm">
          <div><dt className="font-bold">{t("profileType")}</dt><dd className="mt-1 text-neutral-700">{t(business ? "business" : "private")}</dd></div>
          <div><dt className="font-bold">{t("publicLink")}</dt><dd className="mt-1 break-all text-neutral-700">
            {publicHref ? <Link href={publicHref} onClick={leave} className="font-semibold text-emerald-800 underline underline-offset-4">/{view.saved.slug}</Link> : t("linkMissing")}
          </dd></div>
        </dl>
      </div>
    </section>
    {notice ? <div role={notice === "saved" || notice === "checked" ? "status" : "alert"}
      className={`rounded-2xl border p-4 text-sm leading-6 ${notice === "saved" || notice === "checked" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
      <p>{t(notice)}</p>
      {editor.error || !view.available ? <button type="button" onClick={editor.refresh} className={`${secondary} mt-3`}>{t("retry")}</button> : null}
      {view.phase === "uncertain" ? <button type="button" disabled={!ready} onClick={() => void session.check()} className={`${secondary} mt-3`}>{t("checkResult")}</button> : null}
      {view.phase === "conflict" ? <button type="button" disabled={!ready} onClick={() => {
        if (!view.dirty || window.confirm(t("reloadConfirm"))) void session.reload();
      }} className={`${secondary} mt-3`}>{t("reload")}</button> : null}
    </div> : null}
    <form ref={formRef} noValidate onSubmit={event => {event.preventDefault(); void session.save();}} className="space-y-6">
      <section className={`${panel} space-y-5`}>
        <h2 className="text-xl font-black">{t("details")}</h2>
        {textField("display_name", "name", "nameHelp", true)}
        <div>
          <label htmlFor="profile-bio" className="text-sm font-bold">{t("bio")}</label>
          <textarea id="profile-bio" name="bio" rows={5} value={view.draft.bio} disabled={disabled}
            aria-invalid={!!view.errors.bio} aria-describedby={`profile-bio-help profile-bio-count${view.errors.bio ? " profile-bio-error" : ""}`}
            onChange={event => session.edit("bio", event.target.value)} className={`${input} resize-y`}/>
          <p id="profile-bio-help" className="mt-2 text-sm leading-5 text-neutral-600">{t("bioHelp")}</p>
          <p id="profile-bio-count" className="mt-1 text-right text-xs text-neutral-500">{t("count", {count: Array.from(view.draft.bio).length, limit: PROFILE_LIMITS.bio})}</p>
          {view.errors.bio ? <p id="profile-bio-error" className="mt-2 text-sm font-semibold text-red-700">{t(view.errors.bio)}</p> : null}
        </div>
        {textField("website_url", "website", "websiteHelp")}
      </section>
      <section className={`${panel} space-y-5`}>
        <h2 className="text-xl font-black">{t("location")}</h2>
        <p className="text-sm leading-6 text-neutral-600">{t(business ? "businessLocationHelp" : "privateLocationHelp")}</p>
        <div className="grid gap-5 sm:grid-cols-2">
          {textField("country", "country", "countryHelp", view.draft.location_visibility === "exact")}
          {textField("city", "city", "cityHelp", view.draft.location_visibility === "exact")}
        </div>
        <div>
          <label htmlFor="profile-visibility" className="text-sm font-bold">{t("visibility")}</label>
          <select id="profile-visibility" name="location_visibility" value={view.draft.location_visibility} disabled={disabled}
            aria-invalid={!!view.errors.location_visibility} onChange={event => session.edit("location_visibility", event.target.value)} className={input}>
            <option value="hidden">{t("hidden")}</option>
            <option value="city">{t("cityVisible")}</option>
            {business ? <option value="exact">{t("exactVisible")}</option> : null}
          </select>
        </div>
        {business ? textField("address_text", "address", "addressHelp", view.draft.location_visibility === "exact") : null}
        {business && view.draft.location_visibility === "exact" ? <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">{t("exactNotice")}</p> : null}
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={disabled || (!view.dirty && view.saved.revision !== null)}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-default disabled:opacity-50">
          {t(view.phase === "saving" ? "saving" : "save")}
        </button>
        {publicHref ? <Link href={publicHref} onClick={leave} className={secondary}>{t("viewPublic")}</Link> : null}
        <p role="status" className="w-full text-sm text-neutral-600">
          {view.phase === "checking" ? t("checking") : !ready ? t("rechecking") : view.dirty ? t("unsaved") : ""}
        </p>
      </div>
    </form>
  </div>;
}
