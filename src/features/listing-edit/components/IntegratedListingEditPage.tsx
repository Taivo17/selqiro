"use client";
import {useEffect, useState} from "react";
import Link from "next/link";
import {useManagedListing} from "../model/useManagedListing";
import {ListingEditSession, type ListingEditSessionState} from "../model/listingEditSession";
import {listingEditApi} from "../../../entities/listing/api/listingEditClient";
import type {PublicationActor} from "../../../entities/listing/model/publicationJourney";
import {ACTIVE_IDENTITY_CHANGED_EVENT} from "../../v2-shell/model/useV2IdentitySwitcher";
import {supabaseBrowserClient} from "../../../shared/supabase/browserClient";
import {selectListingPriceKind} from "../model/listingPriceDraft";
import type {ListingPriceKind} from "../../../entities/listing/model/listingPriceInput";
import {LISTING_CURRENCIES} from "../../../shared/currency/listingCurrencies.generated";
import ManagedOwnerImage from "./ManagedOwnerImage";

function BoundEditor({actor, listingId, blocked}: {actor: PublicationActor; listingId: string; blocked: boolean}) {
  const [session, setSession] = useState<ListingEditSession | null>(null);
  const [state, setState] = useState<ListingEditSessionState | null>(null);
  useEffect(() => {
    const session = new ListingEditSession({...actor, listingId}, listingEditApi);
    const unsubscribe = session.subscribe(() => setState(session.getSnapshot()));
    setSession(session); setState(session.getSnapshot());
    session.setContext(actor); void session.load();
    const drop = () => session.setContext(null);
    const auth = supabaseBrowserClient.auth.onAuthStateChange((_event, next) => { if (next?.user.id !== actor.userId) drop(); }).data.subscription;
    window.addEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, drop);
    return () => { unsubscribe(); drop(); auth.unsubscribe(); window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, drop); session.dispose(); };
  }, [listingId, actor]);
  if (!state || !session) return <p role="status">Laadin kuulutuse andmeid…</p>;
  const draft = state.draft, price = draft?.price;
  if (!draft || !price) return <p role="status">{state.message || "Laadin kuulutuse andmeid…"}</p>;
  const className = "mt-2 w-full rounded-xl border border-neutral-300 p-3 font-normal";
  return <section className="space-y-5 rounded-[30px] border bg-white p-6" aria-label="Kuulutuse andmed">
    <h2 className="text-2xl font-black">Muuda kuulutust</h2>
    <fieldset disabled={blocked || !session.canEdit()} className="space-y-4">
      <label className="block font-bold">Pealkiri<input className={className} value={draft.title} maxLength={140}
        onChange={e => session.change({...draft, title: e.target.value})} /></label>
      <label className="block font-bold">Kirjeldus<textarea className={className} value={draft.description} maxLength={5000} rows={7}
        onChange={e => session.change({...draft, description: e.target.value})} /></label>
      <label className="block font-bold">Seisukord<select className={className} value={draft.condition ?? ""}
        onChange={e => session.change({...draft, condition: e.target.value})}>
        <option value="">Vali seisukord</option><option value="new">Uus</option><option value="used">Kasutatud</option><option value="damaged">Kahjustatud</option>
      </select></label>
      <label className="block font-bold">Hinna liik<select className={className} value={price.kind ?? "legacy"}
        onChange={e => session.change({...draft, price: selectListingPriceKind(price, e.target.value as ListingPriceKind)})}>
        {price.kind === null ? <option value="legacy">Olemasolev hinnatekst</option> : null}
        <option value="fixed">Kindel hind</option><option value="free">Tasuta</option><option value="negotiable">Kokkuleppel</option><option value="unspecified">Hinda ei lisa</option>
      </select></label>
      {price.kind === null ? <p>{price.legacyText}</p> : null}
      {price.kind === "fixed" ? <div className="grid gap-4 sm:grid-cols-2">
        <label className="block font-bold">Summa<input type="text" inputMode="decimal" className={className} value={price.amountInput} maxLength={64}
          onChange={e => session.change({...draft, price: {...price, amountInput: e.target.value}})} /></label>
        <label className="block font-bold">Valuuta<select className={className} value={price.currencyInput}
          onChange={e => session.change({...draft, price: {...price, currencyInput: e.target.value}})}>
          <option value="">Vali valuuta</option>{LISTING_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
        </select></label>
      </div> : null}
    </fieldset>
    <p role="status" aria-live="polite">{state.message}</p>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={blocked || !session.canSave()} onClick={() => { if (!blocked) void session.save(); }} className="rounded-full bg-black px-5 py-3 font-bold text-white disabled:opacity-50">{state.work === "saving" ? "Salvestan…" : "Salvesta muudatused"}</button>
      <button type="button" disabled={blocked || state.work !== "idle"} onClick={() => { if (!blocked) void session.reviewSaved(); }} className="rounded-full border px-5 py-3 font-bold">Kontrolli salvestatud versiooni</button>
    </div>
    {state.reviewed ? <div className="space-y-2 rounded-2xl bg-neutral-50 p-4">
      <p className="font-bold">Salvestatud versioon: {state.reviewed.basics.title}</p>
      <p className="whitespace-pre-wrap">{state.reviewed.basics.description}</p>
      <p>{state.reviewed.price.kind === "fixed" ? `${state.reviewed.price.amount} ${state.reviewed.price.currency}` : state.reviewed.price.kind === null ? state.reviewed.price.legacy_text : {free: "Tasuta", negotiable: "Kokkuleppel", unspecified: "Hind täpsustamata"}[state.reviewed.price.kind]}</p>
      <button type="button" disabled={blocked} className="font-bold underline" onClick={() => { if (!blocked) session.useReviewed(true); }}>Asenda minu sisestus selle versiooniga</button>
    </div> : null}
  </section>;
}
export default function IntegratedListingEditPage({listingId}: {listingId: string}) {
  const owner = useManagedListing(listingId), [confirm, setConfirm] = useState<string | null>(null);
  const confirmationScope = owner.actor && owner.receipt ? [owner.actor.userId, owner.actor.identityId,
    listingId, owner.receipt.attempt_id, owner.receipt.request_key].join(":") : null;
  useEffect(() => { setConfirm(null); }, [confirmationScope]);
  const blocked = owner.loading || owner.busy || owner.error !== null;
  if (owner.loading && !owner.actor) return <p role="status">Kontrollin kuulutuse haldusõigust…</p>;
  return <div className="space-y-6">
    <Link href="/v2/my-area" className="font-bold underline">Tagasi Minu alasse</Link>
    {owner.error ? <p role="alert">{owner.error}</p> : null}
    {owner.loading ? <p role="status">Kontrollin kuulutuse seisu. Sinu sisestus on alles.</p> : null}
    {owner.receipt?.state === "published" && owner.actor ? <>
      <BoundEditor key={`${owner.actor.userId}:${owner.actor.identityId}:${listingId}`} actor={owner.actor} listingId={listingId} blocked={blocked} />
      <section className="space-y-4 rounded-[30px] border bg-white p-6"><h2 className="text-2xl font-black">Avaldatud pildid</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{owner.images.map(source => <ManagedOwnerImage key={source} source={source} actor={owner.actor!} className="aspect-[4/3] w-full rounded-xl object-contain" />)}</div>
        <p className="text-sm text-neutral-600">Selle kuulutuse pilte praegu muuta ei saa.</p>
      </section>
      {owner.receipt.files_remaining > 0 ? <section className="space-y-3 rounded-[30px] border bg-white p-6" aria-label="Algfailide koristamine">
        <h2 className="text-xl font-black">Algfailide koristamine</h2>
        <p>Avaldatud veebipildid jäävad kuulutusse. Üleslaaditud algfailide lõppkoristust ootab {owner.receipt.files_remaining} faili.</p>
        {owner.cleanupState === "needs_attention" ? <p role="status">Algfailide koristamine vajab täiendavat kontrolli. Töö seis on salvestatud.</p> : null}
        <button type="button" disabled={blocked} onClick={() => { void owner.cleanup(); }}
          className="rounded-full border px-5 py-3 font-bold disabled:opacity-50">{owner.busy ? "Kontrollin algfailide koristamist…" : "Jätka algfailide koristamist"}</button>
      </section> : null}
      <section className="space-y-3 rounded-[30px] border bg-white p-6"><h2 className="text-xl font-black">Eemalda kuulutus</h2>
        <p>Kuulutuse eemaldamisel kustutatakse selle sisu ja hallatavad pildifailid. Vestlustes säilib sinu kirjutatud tekst.</p>
        <button type="button" disabled={blocked} onClick={() => setConfirm(confirmationScope)} className="rounded-full border border-red-200 px-5 py-3 font-bold text-red-800">Kustuta kuulutus</button>
        {confirm !== null && confirm === confirmationScope ? <div role="alertdialog" aria-label="Kinnita kuulutuse kustutamine" className="space-y-3 rounded-xl border p-4">
          <p>Kas kustutad selle kuulutuse lõplikult?</p>
          <button type="button" disabled={blocked} onClick={() => { if (!blocked && confirm === confirmationScope) { setConfirm(null); void owner.remove(); } }} className="mr-5 font-bold underline">Jah, kustuta lõplikult</button>
          <button type="button" onClick={() => setConfirm(null)}>Jäta alles</button>
        </div> : null}
      </section>
    </> : owner.receipt ? <section className="space-y-3 rounded-[30px] border bg-white p-6" role="status">
      <h1 className="text-2xl font-black">{owner.receipt.state === "deleted" ? "Kuulutus ja pildid on kustutatud" : "Kuulutuse sisu on eemaldatud"}</h1>
      {owner.receipt.state === "deleting" ? <p>Piltide lõppkoristus on pooleli. Kontrollimist või koristamist vajab {owner.receipt.files_remaining} faili.</p> : null}
      {owner.receipt.state === "deleting" && owner.cleanupState === "needs_attention" ? <p>Piltide koristamine vajab täiendavat kontrolli. Failide lõplik kustutamine ei ole veel kinnitatud; töö seis on salvestatud.</p> : null}
      {owner.receipt.state === "deleting" ? <button type="button" disabled={blocked} onClick={() => { void owner.cleanup(); }}
        className="rounded-full border px-5 py-3 font-bold disabled:opacity-50">{owner.busy ? "Koristan pilte…" : "Jätka piltide koristamist"}</button> : null}
    </section> : <p>Selle aktiivse identiteedi hallatavat avaldamist ei leitud.</p>}
    <button type="button" disabled={owner.busy} onClick={owner.refresh} className="rounded-full border px-5 py-3 font-bold">Kontrolli seisu</button>
  </div>;
}
