"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingEditMessages, translateListingEditMessage } from "../model/listingEditMessages";
import {useEffect, useState} from "react";
import Link from "next/link";
import {useManagedListing} from "../model/useManagedListing";
import {ListingEditSession, type ListingEditSessionState} from "../model/listingEditSession";
import {listingEditApi} from "../../../entities/listing/api/listingEditClient";
import type {PublicationActor} from "../../../entities/listing/model/publicationJourney";
import {ACTIVE_IDENTITY_CHANGED_EVENT, ACTIVE_IDENTITY_CHANGING_EVENT} from "../../v2-shell/model/identityEvents";
import {supabaseBrowserClient} from "../../../shared/supabase/browserClient";
import {selectListingPriceKind} from "../model/listingPriceDraft";
import type {ListingPriceKind} from "../../../entities/listing/model/listingPriceInput";
import {LISTING_CURRENCIES} from "../../../shared/currency/listingCurrencies.generated";
import ManagedListingImagePicker from "./ManagedListingImagePicker";
import ManagedListingPhotoAdd from "./ManagedListingPhotoAdd";
import RetiredListingImageCleanup from "./RetiredListingImageCleanup";
import ManagedListingStoreCategoryCard from "./ManagedListingStoreCategoryCard";

function BoundEditor({actor, listingId, blocked}: {actor: PublicationActor; listingId: string; blocked: boolean}) {
  const { language, t } = useV2Translation(listingEditMessages);

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
    window.addEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, drop);
    return () => { unsubscribe(); drop(); auth.unsubscribe(); window.removeEventListener(ACTIVE_IDENTITY_CHANGED_EVENT, drop);
      window.removeEventListener(ACTIVE_IDENTITY_CHANGING_EVENT, drop); session.dispose(); };
  }, [listingId, actor]);
  if (!state || !session) return <p role="status">{t("loadingListing")}</p>;
  const draft = state.draft, price = draft?.price;
  if (!draft || !price) return <p role="status">{state.message ? translateListingEditMessage(language, state.message) : t("loadingListing")}</p>;
  const className = "mt-2 w-full rounded-xl border border-neutral-300 p-3 font-normal";
  return <section className="space-y-5 rounded-[30px] border bg-white p-6" aria-label={t("listingDetails")}>
    <h2 className="text-2xl font-black">{t("editListing")}</h2>
    <fieldset disabled={blocked || !session.canEdit()} className="space-y-4">
      <label className="block font-bold">{t("title")}<input className={className} value={draft.title} maxLength={140}
        onChange={e => session.change({...draft, title: e.target.value})} /></label>
      <label className="block font-bold">{t("description")}<textarea className={className} value={draft.description} maxLength={5000} rows={7}
        onChange={e => session.change({...draft, description: e.target.value})} /></label>
      <label className="block font-bold">{t("condition")}<select className={className} value={draft.condition ?? ""}
        onChange={e => session.change({...draft, condition: e.target.value})}>
        <option value="">{t("selectCondition")}</option><option value="new">{t("new")}</option><option value="used">{t("used")}</option><option value="damaged">{t("damaged")}</option>
      </select></label>
      <label className="block font-bold">{t("priceKind")}<select className={className} value={price.kind ?? "legacy"}
        onChange={e => session.change({...draft, price: selectListingPriceKind(price, e.target.value as ListingPriceKind)})}>
        {price.kind === null ? <option value="legacy">{t("legacyPrice")}</option> : null}
        <option value="fixed">{t("fixedPrice")}</option><option value="free">{t("free")}</option><option value="negotiable">{t("negotiable")}</option><option value="unspecified">{t("noPrice")}</option>
      </select></label>
      {price.kind === null ? <p>{price.legacyText}</p> : null}
      {price.kind === "fixed" ? <div className="grid gap-4 sm:grid-cols-2">
        <label className="block font-bold">{t("amount")}<input type="text" inputMode="decimal" className={className} value={price.amountInput} maxLength={64}
          onChange={e => session.change({...draft, price: {...price, amountInput: e.target.value}})} /></label>
        <label className="block font-bold">{t("currency")}<select className={className} value={price.currencyInput}
          onChange={e => session.change({...draft, price: {...price, currencyInput: e.target.value}})}>
          <option value="">{t("selectCurrency")}</option>{LISTING_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} — {new Intl.DisplayNames([language], { type: "currency" }).of(c.code) || c.name}</option>)}
        </select></label>
      </div> : null}
    </fieldset>
    <p role="status" aria-live="polite">{translateListingEditMessage(language, state.message)}</p>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={blocked || !session.canSave()} onClick={() => { if (!blocked) void session.save(); }} className="rounded-full bg-black px-5 py-3 font-bold text-white disabled:opacity-50">{state.work === "saving" ? t("saving") : t("saveChanges")}</button>
      <button type="button" disabled={blocked || state.work !== "idle"} onClick={() => { if (!blocked) void session.reviewSaved(); }} className="rounded-full border px-5 py-3 font-bold">{t("checkSaved")}</button>
    </div>
    {state.reviewed ? <div className="space-y-2 rounded-2xl bg-neutral-50 p-4">
      <p className="font-bold">{t("savedVersion", { title: state.reviewed.basics.title ?? "" })}</p>
      <p className="whitespace-pre-wrap">{state.reviewed.basics.description}</p>
      <p>{state.reviewed.price.kind === "fixed" ? `${state.reviewed.price.amount} ${state.reviewed.price.currency}` : state.reviewed.price.kind === null ? state.reviewed.price.legacy_text : {free: t("free"), negotiable: t("negotiable"), unspecified: t("priceUnspecified")}[state.reviewed.price.kind]}</p>
      <button type="button" disabled={blocked} className="font-bold underline" onClick={() => { if (!blocked) session.useReviewed(true); }}>{t("replaceWithSaved")}</button>
    </div> : null}
  </section>;
}
function ListingDeleteSection({blocked, onRemove}: {blocked: boolean; onRemove: () => void}) {
  const { language, t } = useV2Translation(listingEditMessages);

  const [confirm, setConfirm] = useState(false);
  return <section className="space-y-3 rounded-[30px] border bg-white p-6"><h2 className="text-xl font-black">{t("removeListing")}</h2>
    <p>{t("removeListingHelp")}</p>
    <button type="button" disabled={blocked} onClick={() => setConfirm(true)} className="rounded-full border border-red-200 px-5 py-3 font-bold text-red-800">{t("deleteListing")}</button>
    {confirm ? <div role="alertdialog" aria-label={t("confirmDeleteListing")} className="space-y-3 rounded-xl border p-4">
      <p>{t("deleteListingQuestion")}</p>
      <button type="button" disabled={blocked} onClick={() => { if (!blocked) { setConfirm(false); onRemove(); } }} className="mr-5 font-bold underline">{t("yesDelete")}</button>
      <button type="button" onClick={() => setConfirm(false)}>{t("keep")}</button>
    </div> : null}
  </section>;
}
export default function IntegratedListingEditPage({listingId}: {listingId: string}) {
  const { language, t } = useV2Translation(listingEditMessages);

  const owner = useManagedListing(listingId);
  const confirmationScope = owner.actor && owner.receipt ? [owner.actor.userId, owner.actor.identityId,
    listingId, owner.receipt.attempt_id, owner.receipt.request_key].join(":") : null;
  const blocked = owner.loading || owner.busy || owner.error !== null;
  if (owner.loading && !owner.actor) return <p role="status">{t("checkingOwnership")}</p>;
  return <div className="space-y-6">
    <Link href="/v2/my-area" className="font-bold underline">{t("backToMyArea")}</Link>
    {owner.error ? <p role="alert">{translateListingEditMessage(language, owner.error)}</p> : null}
    {owner.loading ? <p role="status">{t("checkingListing")}</p> : null}
    {owner.receipt?.state === "published" && owner.actor ? <>
      <BoundEditor key={`${owner.actor.userId}:${owner.actor.identityId}:${listingId}`} actor={owner.actor} listingId={listingId} blocked={blocked} />
      <ManagedListingImagePicker actor={owner.actor} gallery={owner.gallery} fallbackImages={owner.images}
        preloadingImage={owner.preloadingImage}
        blocked={blocked} error={owner.imageError} message={owner.imageMessage} busyOrdinal={owner.primaryBusyOrdinal}
        removalBusyOrdinal={owner.removalBusyOrdinal} canRemove={owner.receipt.files_remaining === 0}
        onSelect={ordinal => { void owner.setPrimary(ordinal); }} onRemove={command => { void owner.removeImage(command); }}
        onRefresh={owner.refresh}>
        <ManagedListingPhotoAdd key={confirmationScope} ownerKey={{...owner.actor, listingId, attemptId: owner.receipt.attempt_id}}
          gallery={owner.gallery} blocked={blocked || owner.imageError !== null} runOperation={owner.runPhotoAddition} />
      </ManagedListingImagePicker>
      <ManagedListingStoreCategoryCard key={`store-categories:${owner.actor.userId}:${owner.actor.identityId}:${listingId}`}
        actor={owner.actor} listingId={listingId} blocked={blocked} />
      {owner.receipt.files_remaining > 0 ? <section className="space-y-3 rounded-[30px] border bg-white p-6" aria-label={t("sourceCleanup")}>
        <h2 className="text-xl font-black">{t("sourceCleanup")}</h2>
        <p>{t("sourceCleanupPending", { count: owner.receipt.files_remaining })}</p>
        {owner.cleanupState === "needs_attention" ? <p role="status">{t("sourceCleanupAttention")}</p> : null}
        <button type="button" disabled={blocked} onClick={() => { void owner.cleanup(); }}
          className="rounded-full border px-5 py-3 font-bold disabled:opacity-50">{owner.busy ? t("checking") : t("checkCleanup")}</button>
      </section> : null}
      <ListingDeleteSection key={confirmationScope} blocked={blocked} onRemove={() => { void owner.remove(); }} />
    </> : owner.receipt ? <section className="space-y-3 rounded-[30px] border bg-white p-6" role="status">
      <h1 className="text-2xl font-black">{owner.receipt.state === "deleted" ? t("listingDeleted") : t("listingContentRemoved")}</h1>
      {owner.receipt.state === "deleting" ? <p>{t("deletedCleanupPending", { count: owner.receipt.files_remaining })}</p> : null}
      {owner.receipt.state === "deleting" && owner.cleanupState === "needs_attention" ? <p>{t("cleanupAttention")}</p> : null}
      {owner.receipt.state === "deleting" ? <button type="button" disabled={blocked} onClick={() => { void owner.cleanup(); }}
        className="rounded-full border px-5 py-3 font-bold disabled:opacity-50">{owner.busy ? t("checking") : t("checkCleanup")}</button> : null}
    </section> : <p>{t("managedListingMissing")}</p>}
    {owner.receipt ? <RetiredListingImageCleanup status={owner.retiredCleanup} loading={owner.retiredCleanupLoading}
      error={owner.retiredCleanupError} blocked={blocked} onCleanup={() => { void owner.cleanup(); }} onRefresh={owner.refresh} /> : null}
    <button type="button" disabled={owner.busy} onClick={owner.refresh} className="rounded-full border px-5 py-3 font-bold">{t("checkStatus")}</button>
  </div>;
}
