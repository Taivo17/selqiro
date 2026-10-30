"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";
import { isConversationId } from "../../../entities/conversation/model/listingContact";
import { listingConversationHref } from "../model/listingConversationNavigation";
import { useListingConversation } from "../model/useListingConversation";
import ConversationListingCard from "./ConversationListingCard";

type Props = { conversationId: string; originListingId?: string | null };
export default function ListingConversationPage({ conversationId, originListingId = null }: Props) {
  if (!v2IntegrationEnabled() || !isConversationId(conversationId)
    || (originListingId !== null && !isConversationId(originListingId))) return <p>Vestlus ei ole kättesaadav.</p>;
  return <Suspense fallback={<p role="status">Laen vestlust…</p>}>
    <ConversationLocation conversationId={conversationId} originListingId={originListingId} />
  </Suspense>;
}

function ConversationLocation({ conversationId, originListingId = null }: Props) {
  // Native history consumption updates this URL hook without replacing the
  // server page. Re-entering the same listing must arm a fresh attachment.
  const params = useSearchParams();
  const listingIds = params?.getAll("listing");
  const currentOrigin = listingIds
    ? listingIds.length === 1 && isConversationId(listingIds[0]) ? listingIds[0] : null
    : originListingId;
  return <ManagedConversation key={conversationId} conversationId={conversationId} originListingId={currentOrigin} />;
}

function ManagedConversation({ conversationId, originListingId = null }: Props) {
  const state = useListingConversation(conversationId, originListingId);
  const { context, visible, busy, reading, changed, unresolved } = state;
  const draftDisabled = busy || unresolved || changed || !visible?.can_send;
  return <section className="mx-auto max-w-3xl space-y-5 rounded-[28px] border border-black/5 bg-white p-5 shadow-sm md:p-8">
    <Link href="/v2/messages" className="text-sm font-semibold text-neutral-600">← Vestlused</Link>
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0"><h1 className="break-words text-2xl font-bold">{visible?.peer_name || "Vestlus"}</h1>
        {visible?.listing ? <Link className="mt-1 block break-words text-sm font-semibold text-neutral-700 underline underline-offset-2"
          href={"/v2/listing/" + visible.listing.id} prefetch={false}>Vaata kuulutust · {visible.listing.title || "Kuulutus"}</Link>
          : visible && <p className="mt-1 text-sm text-neutral-500">Seotud kuulutus pole enam kättesaadav. Vestluse sõnumid on alles.</p>}</div>
      <button type="button" onClick={() => context.refresh()} disabled={busy || reading}
        className="shrink-0 rounded-xl border px-3 py-2 text-sm disabled:opacity-50">Värskenda</button>
    </header>
    {(context.loading || reading) && <p role="status" className="text-sm text-neutral-500">Laen vestlust…</p>}
    {context.anonymous && <Link className="block text-sm font-semibold"
      href={"/auth?next=" + encodeURIComponent(listingConversationHref(conversationId, originListingId))}>Vestluse lugemiseks logi sisse</Link>}
    {(state.problem || context.error) && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{state.problem || context.error}</p>}
    {visible && <>
      {visible.next_before_message_id && <button type="button" disabled={reading || busy}
        className="rounded-xl border px-4 py-2 text-sm" onClick={state.loadEarlier}>Lae varasemad sõnumid</button>}
      <ol className="space-y-3" aria-label="Vestluse sõnumid">
        {visible.messages.map(message => <li key={message.id} className={"flex " + (message.mine ? "justify-end" : "justify-start")}>
          <article className={"min-w-0 max-w-[90%] space-y-3 rounded-2xl px-4 py-3 " + (message.mine ? "bg-[#edf2e8]" : "bg-neutral-100")}>
            <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
            {message.listing && <div className="w-80 max-w-full"><ConversationListingCard listing={message.listing} /></div>}
            <time dateTime={message.created_at} className="block text-xs text-neutral-500">{new Date(message.created_at).toLocaleString("et-EE")}</time>
          </article>
        </li>)}
      </ol>
      {!visible.messages.length && <p className="text-sm text-neutral-500">Alusta vestlust oma sõnumiga.</p>}
      {!visible.can_send && <p className="rounded-xl bg-neutral-100 p-3 text-sm">Selles vestluses ei saa praegu uusi sõnumeid saata.</p>}
    </>}
    {changed && <p className="rounded-xl bg-amber-50 p-3 text-sm">Pooleli olev sõnum kuulub eelmisele identiteedile. Jätkamiseks vaheta tagasi.</p>}
    {state.incomingListingId && !changed && <div role="status" className="space-y-2 rounded-xl bg-amber-50 p-3 text-sm">
      <p>Avatud on teine kuulutus. Pooleli olev sõnum ja selle kuulutusekaart on alles.</p>
      <button type="button" onClick={state.acceptIncomingListing} disabled={busy || unresolved || !visible}
        className="font-semibold underline underline-offset-2 disabled:opacity-50">Tühjenda pooleli sõnum ja lisa uus kuulutus</button>
    </div>}
    <form onSubmit={event => { event.preventDefault(); void state.send(); }} className="space-y-3">
      <label htmlFor="listing-message" className="block text-sm font-semibold">Sinu sõnum</label>
      {state.attachmentRequested && visible && <div className="space-y-2 rounded-2xl border border-neutral-200 p-3" aria-label="Sõnumiga kaasnev kuulutus">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold">Sõnumiga läheb kaasa</span>
          <button type="button" onClick={state.removeAttachment} disabled={busy || unresolved || changed}
            className="text-neutral-600 underline underline-offset-2 disabled:opacity-50" aria-label="Eemalda kuulutusekaart">Eemalda</button>
        </div>
        {state.attachment && <ConversationListingCard listing={state.attachment} />}
        {state.attachmentUnavailable && <p role="status" className="text-sm text-neutral-600">
          Seda kuulutust ei saa praegu sõnumiga kaasa saata. Võid kaardi eemaldada ja saata tavalise sõnumi.
        </p>}
        {!state.attachment && reading && <p className="text-sm text-neutral-500">Laen kuulutust…</p>}
      </div>}
      <textarea id="listing-message" value={state.body} rows={4} maxLength={10000} disabled={draftDisabled}
        onChange={event => state.changeBody(event.target.value)}
        className="w-full rounded-2xl border border-neutral-200 p-3 text-sm disabled:bg-neutral-50" />
      <button type="submit" disabled={!state.canSend}
        className="rounded-2xl bg-[#171717] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Saadan…" : unresolved ? "Proovi sama saatmist uuesti" : "Saada sõnum"}
      </button>
    </form>
  </section>;
}
