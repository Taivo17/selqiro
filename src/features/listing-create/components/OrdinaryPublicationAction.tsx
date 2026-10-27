"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getMyRequiredPublicationPolicyStatus } from "../../../entities/publication-policy/api/getMyRequiredPublicationPolicyStatus";
import { acceptPublicationPolicy } from "../../../entities/publication-policy/api/acceptPublicationPolicy";
import type { PublicationPolicyStatus } from "../../../entities/publication-policy/model/types";
import { buildOrdinaryListingInput } from "../model/ordinaryListingInput";
import type { OrdinaryListingFieldState } from "../model/ordinaryListingFields";
import { awaitPublicationReadiness, type useOrdinaryPublication } from "../model/useOrdinaryPublication";

type Props = {controller: ReturnType<typeof useOrdinaryPublication>; fields: OrdinaryListingFieldState;
  title: string; description: string; files: readonly File[]; onNew: () => void;
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

export default function OrdinaryPublicationAction({controller: c, fields, title, description, files, onNew, onSubmittingChange}: Props) {
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
      else { setPolicyState("error"); setMessage("Kehtivaid avaldamistingimusi ei leitud. Laadi tingimused uuesti."); }
    }).catch(() => {
      if (active && c.epoch.current === epoch) {
        setPolicyState("error"); setMessage("Avaldamistingimusi ei saanud laadida. Proovi uuesti; sisestatud andmed ja pildid jäävad alles.");
      }
    });
    return () => { active = false; submission.current = null; onSubmittingChange(false); };
  }, [c.actor, c.enabled, c.epoch, onSubmittingChange, policyReload]);
  if (!c.enabled) return null;
  const busy = c.view.phase === "busy" || accepting;
  const needsAcceptance = policies?.some(p => !p.accepted) ?? true;
  const ready = !!c.actor && policyState === "ready" && !!policies?.some(p => p.policyKey === "marketplace-general") && (!needsAcceptance || checked);
  const submit = async (resume: boolean) => {
    if (submission.current || busy || !ready || c.contextError || !c.actor || !policies || !c.session.current) return;
    const epoch = c.epoch.current, session = c.session.current, actor = c.actor;
    setMessage(null);
    let input;
    // Keep the selected bytes from this click across policy acceptance awaits.
    const capturedFiles = files.map(file => file.slice(0, file.size, "application/octet-stream"));
    try { if (!resume) input = buildOrdinaryListingInput(fields, title, description); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Kontrolli vormi välju."); return; }
    // Block a second click synchronously, before React renders the busy state.
    const operation = {};
    submission.current = operation; setAccepting(true); onSubmittingChange(true);
    const current = () => submission.current === operation && c.epoch.current === epoch && c.session.current === session;
    try {
      setMessage("Kontrollin kehtivaid avaldamistingimusi…");
      const reviewed = await readPolicies();
      if (!current()) return;
      setPolicies(reviewed);
      if (!reviewed.some(p => p.policyKey === "marketplace-general")) {
        setChecked(false); setPolicyState("error"); setMessage("Kehtivaid avaldamistingimusi ei leitud. Laadi tingimused uuesti."); return;
      }
      if (policySnapshot(reviewed) !== policySnapshot(policies) || (reviewed.some(p => !p.accepted) && !checked)) {
        setChecked(false); setMessage("Avaldamistingimused muutusid. Loe kehtivaid tingimusi ja kinnita avaldamine uuesti."); return;
      }
      const missing = reviewed.filter(p => !p.accepted);
      for (const policy of missing) {
        if (!current()) return;
        setMessage("Salvestan nõustumist avaldamistingimustega…");
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
          setPolicyState("error"); setMessage("Kehtivaid avaldamistingimusi ei leitud. Laadi tingimused uuesti."); return;
        }
        setPolicyState("ready");
        if (policySnapshot(fresh) !== policySnapshot(reviewed) || fresh.some(p => !p.accepted)) {
          setMessage("Avaldamistingimused muutusid või nõustumine jäi pooleli. Vaata all olevaid tingimusi ja kinnita avaldamine uuesti."); return;
        }
      }
      setMessage(null);
      if (resume) await session.resume(capturedFiles); else if (input) await session.start(input, capturedFiles);
    } catch {
      if (current()) {
        setPolicies(null); setChecked(false); setPolicyState("loading");
        setMessage("Avaldamise ettevalmistamise tulemus jäi kinnitamata. Kontrollin salvestatud nõustumisi; kuulutust automaatselt ei avaldata.");
        // A lost acceptance response is uncertain, not a failed remote write.
        // Read once to reconcile; even a successful read requires another click.
        try {
          const fresh = await readPolicies();
          if (!current()) return;
          setPolicies(fresh);
          setPolicyState(fresh.some(p => p.policyKey === "marketplace-general") ? "ready" : "error");
          setMessage("Avaldamine jäi ootele. Kontrolli all olevaid tingimusi ja kinnita avaldamine uuesti; sisestatud andmed ja pildid on alles.");
        } catch {
          if (current()) {
            setPolicyState("error");
            setMessage("Nõustumise värsket olekut ei saanud kontrollida. Laadi tingimused uuesti; sisestatud andmed ja pildid on alles.");
          }
        }
      }
    } finally {
      if (submission.current === operation) {
        submission.current = null; setAccepting(false); onSubmittingChange(false);
      }
    }
  };
  const terminal = ["published", "closed"].includes(c.view.phase);
  return <section className="space-y-4 rounded-[30px] border border-amber-200 bg-white p-6" aria-label="Kuulutuse avaldamine">
    <h2 className="text-xl font-black">Kuulutuse avaldamine</h2>
    {!terminal && policyState === "loading" ? <p role="status" className="text-sm text-neutral-600">Laadin avaldamistingimusi…</p> : null}
    {c.view.snapshot?.payload && c.view.phase !== "editing" ? <div className="rounded-2xl bg-neutral-50 p-4">
      <p className="text-xs text-neutral-600">Selle avaldamise salvestatud andmed</p>
      <p className="font-bold">{c.view.snapshot.payload.basics.title}</p>
      <p className="text-sm">{c.view.snapshot.payload.price.kind === "fixed"
        ? `${c.view.snapshot.payload.price.amount} ${c.view.snapshot.payload.price.currency}`
        : {free: "Tasuta", negotiable: "Kokkuleppel", unspecified: "Hind täpsustamata"}[c.view.snapshot.payload.price.kind]}</p>
      <p className="text-sm">{c.view.snapshot.slots.length} pilti</p>
    </div> : null}
    {!terminal && policies ? <div className="space-y-3">
      {policies.map(p => <details key={p.policyDocumentId} className="rounded-xl border border-neutral-200 p-3">
        <summary className="cursor-pointer font-semibold">{p.title} · {p.policyVersion}{p.accepted ? " · kinnitatud" : ""}</summary>
        <p className="mt-2 text-sm">{p.summary}</p><p className="mt-2 whitespace-pre-wrap text-sm">{p.bodyText}</p>
      </details>)}
      {needsAcceptance ? <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={checked} disabled={busy}
        onChange={e => setChecked(e.target.checked)} className="mt-1" />Olen tutvunud nende avaldamistingimustega ja nõustun nendega.</label> : null}
    </div> : null}
    <p role="status" aria-live="polite" className="text-sm">{c.contextError || message || c.view.message}</p>
    {!terminal && c.contextError ? <button type="button" disabled={busy}
      className="rounded-full border px-5 py-3 font-bold disabled:opacity-50"
      onClick={c.retryContext}>Kontrolli identiteeti uuesti</button> : null}
    {!terminal && policyState === "error" ? <button type="button" disabled={busy || !c.actor}
      className="rounded-full border px-5 py-3 font-bold disabled:opacity-50"
      onClick={() => { if (!submission.current) setPolicyReload(value => value + 1); }}>Laadi tingimused uuesti</button> : null}
    {c.view.phase === "published" && c.view.receipt ? <div className="flex flex-wrap gap-4">
      <Link href={`/v2/listing/${c.view.receipt.listing_id}`} className="font-bold underline">Vaata kuulutust</Link>
      <Link href="/v2/my-area" className="font-bold underline">Ava Minu ala</Link>
    </div> : null}
    {terminal ? <button type="button" disabled={busy} className="rounded-full border px-5 py-3 font-bold disabled:opacity-50"
      onClick={() => { c.session.current?.reset(); onNew(); }}>Lisa järgmine kuulutus</button> : <div className="flex flex-wrap gap-3">
      {c.view.phase !== "needs_attention" ? <button type="button" disabled={busy || !ready || !!c.contextError} onClick={() => { void submit(c.view.phase !== "editing"); }}
        className="rounded-full bg-black px-6 py-3 font-bold text-white disabled:opacity-50">
        {busy ? "Palun oota…" : c.view.phase === "editing" ? "Avalda kuulutus" : "Kontrolli ja jätka"}
      </button> : null}
      {c.view.phase !== "editing" ? <button type="button" disabled={busy} className="rounded-full border px-5 py-3 font-bold"
        onClick={() => setCancelOpen(true)}>Katkesta avaldamine</button> : null}
    </div>}
    {cancelOpen && !terminal ? <div role="alertdialog" aria-label="Katkesta see avaldamine" className="space-y-3 rounded-2xl border p-4">
      <p>Kas sulged selle avaldamiskatse? Saadetud piltide koristamist kontrollitakse serveris.</p>
      <button type="button" disabled={busy} className="mr-4 font-bold underline" onClick={() => { setCancelOpen(false); void c.session.current?.cancel(); }}>Jah, katkesta</button>
      <button type="button" onClick={() => setCancelOpen(false)}>Jätka praeguse katsega</button>
    </div> : null}
  </section>;
}
