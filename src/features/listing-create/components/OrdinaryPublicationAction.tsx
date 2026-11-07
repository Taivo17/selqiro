"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingCreateMessages, translateListingCreateMessage } from "../model/listingCreateMessages";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getMyRequiredPublicationPolicyStatus } from "../../../entities/publication-policy/api/getMyRequiredPublicationPolicyStatus";
import { acceptPublicationPolicy } from "../../../entities/publication-policy/api/acceptPublicationPolicy";
import type { PublicationPolicyStatus } from "../../../entities/publication-policy/model/types";
import { buildOrdinaryListingInput } from "../model/ordinaryListingInput";
import type { OrdinaryListingFieldState } from "../model/ordinaryListingFields";
import { awaitPublicationReadiness, type useOrdinaryPublication } from "../model/useOrdinaryPublication";

type Props = {controller: ReturnType<typeof useOrdinaryPublication>; fields: OrdinaryListingFieldState;
  title: string; description: string; files: readonly File[]; onNew: (requestKey: string) => void;
  onCaptureSubmission: () => (requestKey: string) => void;
  onSubmittingChange: (submitting: boolean) => void};

// A policy read may fail without discarding the listing form. Late responses are
// ignored by the actor/operation guards below; a timeout never retries a write.
async function readPolicies(): Promise<PublicationPolicyStatus[]> {
  return awaitPublicationReadiness(
    getMyRequiredPublicationPolicyStatus({contentType: "listing", countryCode: null, locale: "et-EE"})
  );
}
function policySnapshot(policies: readonly PublicationPolicyStatus[]): string {
  return JSON.stringify(policies.map(p => [p.policyKey, p.policyDocumentId, p.policyVersion, p.contentHash]).sort());
}

export default function OrdinaryPublicationAction({controller: c, fields, title, description, files, onNew, onCaptureSubmission, onSubmittingChange}: Props) {
  const { language, t } = useV2Translation(listingCreateMessages);

  const [policies, setPolicies] = useState<PublicationPolicyStatus[] | null>(null);
  const [policyState, setPolicyState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [policyReload, setPolicyReload] = useState(0);
  const [checked, setChecked] = useState(false), [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState<string | null>(null), [cancelOpen, setCancelOpen] = useState(false);
  const submission = useRef<object | null>(null);
  useEffect(() => {
    let active = true;
    const epoch = c.epoch.current;
    setPolicies(null); setChecked(false); setAccepting(false); setMessage(null); setCancelOpen(false);
    submission.current = null; onSubmittingChange(false);
    setPolicyState(c.enabled && c.actor ? "loading" : "idle");
    if (c.enabled && c.actor) void readPolicies().then(value => {
      if (!active || c.epoch.current !== epoch) return;
      setPolicies(value);
      if (value.some(p => p.policyKey === "marketplace-general")) setPolicyState("ready");
      else { setPolicyState("error"); setMessage("policiesMissing"); }
    }).catch(() => {
      if (active && c.epoch.current === epoch) {
        setPolicyState("error"); setMessage("policiesLoadFailed");
      }
    });
    return () => { active = false; submission.current = null; onSubmittingChange(false); };
  }, [c.actor, c.enabled, c.epoch, onSubmittingChange, policyReload]);
  if (!c.enabled) return null;
  const busy = c.view.phase === "busy" || accepting;
  const needsAcceptance = policies?.some(p => !p.accepted) ?? true;
  const ready = !!c.actor && c.contextReady && c.canAct(c.actor) && policyState === "ready" && !!policies?.some(p => p.policyKey === "marketplace-general") && (!needsAcceptance || checked);
  const submit = async (resume: boolean) => {
    if (submission.current || busy || !ready || c.contextError || !c.actor || !policies || !c.session.current) return;
    const epoch = c.epoch.current, session = c.session.current, actor = c.actor;
    setMessage(null);
    let input;
    // Keep the selected bytes from this click across policy acceptance awaits.
    const capturedFiles = files.map(file => file.slice(0, file.size, "application/octet-stream"));
    const markSubmitted = onCaptureSubmission();
    try { if (!resume) input = buildOrdinaryListingInput(fields, title, description); }
    catch (error) { setMessage(error instanceof Error ? error.message : "checkForm"); return; }
    // Block a second click synchronously, before React renders the busy state.
    const operation = {};
    submission.current = operation; setAccepting(true); onSubmittingChange(true);
    const current = () => submission.current === operation && c.epoch.current === epoch && c.session.current === session && c.canAct(actor);
    try {
      setMessage("checkingPolicies");
      const reviewed = await readPolicies();
      if (!current()) return;
      setPolicies(reviewed);
      if (!reviewed.some(p => p.policyKey === "marketplace-general")) {
        setChecked(false); setPolicyState("error"); setMessage("policiesMissing"); return;
      }
      if (policySnapshot(reviewed) !== policySnapshot(policies) || (reviewed.some(p => !p.accepted) && !checked)) {
        setChecked(false); setMessage("policiesChanged"); return;
      }
      const missing = reviewed.filter(p => !p.accepted);
      for (const policy of missing) {
        if (!current()) return;
        setMessage("savingAcceptance");
        await awaitPublicationReadiness(acceptPublicationPolicy({policyDocumentId: policy.policyDocumentId, policyVersion: policy.policyVersion,
          contentHash: policy.contentHash, identityId: actor.identityId}));
      }
      if (!current()) return;
      if (missing.length > 0) {
        // Keep the real server acceptance state, including partial success. A new
        // policy snapshot needs another explicit review/click before publishing.
        const fresh = await readPolicies();
        if (!current()) return;
        setPolicies(fresh); setChecked(false);
        if (!fresh.some(p => p.policyKey === "marketplace-general")) {
          setPolicyState("error"); setMessage("policiesMissing"); return;
        }
        setPolicyState("ready");
        if (policySnapshot(fresh) !== policySnapshot(reviewed) || fresh.some(p => !p.accepted)) {
          setMessage("acceptanceIncomplete"); return;
        }
      }
      setMessage(null);
      if (resume) await session.resume(capturedFiles); else if (input) await session.start(input, capturedFiles, markSubmitted);
    } catch {
      if (current()) {
        setPolicies(null); setChecked(false); setPolicyState("loading");
        setMessage("preparationUnconfirmed");
        // A lost acceptance response is uncertain, not a failed remote write.
        // Read once to reconcile; even a successful read requires another click.
        try {
          const fresh = await readPolicies();
          if (!current()) return;
          setPolicies(fresh);
          setPolicyState(fresh.some(p => p.policyKey === "marketplace-general") ? "ready" : "error");
          setMessage("publicationWaiting");
        } catch {
          if (current()) {
            setPolicyState("error");
            setMessage("acceptanceCheckFailed");
          }
        }
      }
    } finally {
      if (submission.current === operation) {
        submission.current = null; setAccepting(false); onSubmittingChange(false);
      }
    }
  };
  const startNext = async () => {
    if (submission.current || busy || !c.actor || !c.canAct(c.actor) || !c.session.current) return;
    const session = c.session.current, operation = {};
    submission.current = operation; setAccepting(true); onSubmittingChange(true);
    try {
      // onNew is bound to this identity's entry and the completed request key.
      // It must run at reset's commit even if a harmless focus read is pending.
      await session.reset(onNew);
    } finally {
      if (submission.current === operation) {
        submission.current = null; setAccepting(false); onSubmittingChange(false);
      }
    }
  };
  const terminal = ["published", "closed"].includes(c.view.phase);
  return <section className="space-y-4 rounded-[30px] border border-amber-200 bg-white p-6" aria-label={t("listingPublication")}>
    <h2 className="text-xl font-black">{t("listingPublication")}</h2>
    {!terminal && policyState === "loading" ? <p role="status" className="text-sm text-neutral-600">{t("loadingPolicies")}</p> : null}
    {c.view.snapshot?.payload && c.view.phase !== "editing" ? <div className="rounded-2xl bg-neutral-50 p-4">
      <p className="text-xs text-neutral-600">{t("savedPublicationDetails")}</p>
      <p className="font-bold">{c.view.snapshot.payload.basics.title}</p>
      <p className="text-sm">{c.view.snapshot.payload.price.kind === "fixed"
        ? `${c.view.snapshot.payload.price.amount} ${c.view.snapshot.payload.price.currency}`
        : {free: t("priceFree"), negotiable: t("priceByAgreement"), unspecified: t("priceNotSpecified")}[c.view.snapshot.payload.price.kind]}</p>
      <p className="text-sm">{t("imageCount", { count: c.view.snapshot.slots.length })}</p>
    </div> : null}
    {!terminal && policies ? <div className="space-y-3">
      {language === "en" && policies.some(p => p.locale === "et-EE") ? <p className="text-sm text-neutral-600">{t("policyEstonianNotice")}</p> : null}
      {policies.map(p => <details key={p.policyDocumentId} className="rounded-xl border border-neutral-200 p-3">
        <summary className="cursor-pointer font-semibold"><span lang={p.locale === "et-EE" ? "et" : p.locale}>{p.title} · {p.policyVersion}</span>{p.accepted ? t("acceptedSuffix") : ""}</summary>
        <p lang={p.locale === "et-EE" ? "et" : p.locale} className="mt-2 text-sm">{p.summary}</p><p lang={p.locale === "et-EE" ? "et" : p.locale} className="mt-2 whitespace-pre-wrap text-sm">{p.bodyText}</p>
      </details>)}
      {needsAcceptance ? <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={checked} disabled={busy}
        onChange={e => setChecked(e.target.checked)} className="mt-1" />{t("acceptTerms")}</label> : null}
    </div> : null}
    <p role="status" aria-live="polite" className="text-sm">{translateListingCreateMessage(language, c.contextError || message || c.view.message, c.contextError || message ? undefined : c.view.messageParams)}</p>
    {!terminal && c.contextError ? <button type="button" disabled={busy}
      className="rounded-full border px-5 py-3 font-bold disabled:opacity-50"
      onClick={c.retryContext}>{t("checkIdentity")}</button> : null}
    {!terminal && policyState === "error" ? <button type="button" disabled={busy || !c.actor}
      className="rounded-full border px-5 py-3 font-bold disabled:opacity-50"
      onClick={() => { if (!submission.current) setPolicyReload(value => value + 1); }}>{t("reloadTerms")}</button> : null}
    {c.view.phase === "published" && c.view.receipt ? <div className="flex flex-wrap gap-4">
      <Link href={`/v2/listing/${c.view.receipt.listing_id}`} className="font-bold underline">{t("viewListing")}</Link>
      <Link href="/v2/my-area" className="font-bold underline">{t("openMyArea")}</Link>
    </div> : null}
    {terminal ? <button type="button" disabled={busy || !c.contextReady} className="rounded-full border px-5 py-3 font-bold disabled:opacity-50"
      onClick={() => { void startNext(); }}>{t("addNextListing")}</button> : <div className="flex flex-wrap gap-3">
      {c.view.phase !== "needs_attention" ? <button type="button" disabled={busy || !ready || !!c.contextError} onClick={() => { void submit(c.view.phase !== "editing"); }}
        className="rounded-full bg-black px-6 py-3 font-bold text-white disabled:opacity-50">
        {busy ? t("pleaseWait") : c.view.phase === "editing" ? t("publishListing") : t("checkContinue")}
      </button> : null}
      {c.view.phase !== "editing" ? <button type="button" disabled={busy || !c.contextReady} className="rounded-full border px-5 py-3 font-bold"
        onClick={() => { if (c.actor && c.canAct(c.actor)) setCancelOpen(true); }}>{t("cancelPublication")}</button> : null}
    </div>}
    {cancelOpen && !terminal ? <div role="alertdialog" aria-label={t("cancelThisPublication")} className="space-y-3 rounded-2xl border p-4">
      <p>{t("confirmCancel")}</p>
      <button type="button" disabled={busy || !c.contextReady} className="mr-4 font-bold underline" onClick={() => { if (c.actor && c.canAct(c.actor)) { setCancelOpen(false); void c.session.current?.cancel(); } }}>{t("yesCancel")}</button>
      <button type="button" onClick={() => setCancelOpen(false)}>{t("continueAttempt")}</button>
    </div> : null}
  </section>;
}
