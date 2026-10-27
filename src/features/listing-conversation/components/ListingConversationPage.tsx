"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";
import { getListingConversation, sendListingMessage } from "../../../entities/conversation/api/managedConversationClient";
import { copyListingMessageCommand, isConversationId, type ConversationView,
  type ListingMessageCommand } from "../../../entities/conversation/model/listingContact";
import { useConversationActor, type ConversationActorContext } from "../model/useConversationActor";

const actorKey = (a: Pick<ConversationActorContext, "expectedUserId" | "expectedIdentityId">) => a.expectedUserId + "/" + a.expectedIdentityId;
export default function ListingConversationPage({ conversationId }: { conversationId: string }) {
  if (!v2IntegrationEnabled() || !isConversationId(conversationId)) return <p>Vestlus ei ole kättesaadav.</p>;
  return <ManagedConversation key={conversationId} conversationId={conversationId} />;
}
function ManagedConversation({ conversationId }: { conversationId: string }) {
  const context = useConversationActor();
  const [view, setView] = useState<ConversationView | null>(null), [reading, setReading] = useState(false);
  const [body, setBody] = useState(""), [draftActor, setDraftActor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [problem, setProblem] = useState<string | null>(null);
  const [unresolved, setUnresolved] = useState(false);
  const attempt = useRef<ListingMessageCommand | null>(null), sending = useRef(false), readVersion = useRef(0);
  const displayedActor = useRef<string | null>(null);
  async function load(actor: ConversationActorContext, before: string | null = null) {
    const version = ++readVersion.current; setReading(true);
    try {
      const result = await getListingConversation(actor.accessToken, { expectedUserId: actor.expectedUserId,
        expectedIdentityId: actor.expectedIdentityId, conversationId, beforeMessageId: before }, actor.signal);
      if (!context.isCurrent(actor) || version !== readVersion.current) return;
      displayedActor.current = actorKey(actor);
      setView(current => before !== null && current && current.identity_id === result.identity_id
        ? Object.freeze({ ...result, messages: Object.freeze([...result.messages, ...current.messages]) }) : result);
      setProblem(null);
    } catch {
      if (context.isCurrent(actor) && version === readVersion.current) {
        setView(null); setProblem("Vestlus ei ole selle konto ja identiteediga kättesaadav.");
      }
    } finally { if (version === readVersion.current) setReading(false); }
  }
  useEffect(() => {
    readVersion.current += 1; displayedActor.current = null; setView(null); setProblem(null);
    if (context.actor) void load(context.actor);
    // The actor object owns an immutable generation and abort signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.actor]);
  async function send() {
    const actor = context.actor;
    if (!actor || !context.isCurrent(actor) || sending.current || !view?.can_send
      || (draftActor !== null && draftActor !== actorKey(actor))) return;
    let command = attempt.current;
    try {
      if (command && (actorKey(command) !== actorKey(actor) || command.message !== body)) return;
      if (!command) command = copyListingMessageCommand({ expectedUserId: actor.expectedUserId,
        expectedIdentityId: actor.expectedIdentityId, requestKey: crypto.randomUUID(), conversationId, message: body, listingId: null });
    } catch { setProblem("Sisesta kuni 5000 märgi pikkune sõnum."); return; }
    attempt.current = command; sending.current = true; setBusy(true); setProblem(null);
    try {
      await sendListingMessage(actor.accessToken, command, actor.signal);
      if (!context.isCurrent(actor)) { setUnresolved(true); return; }
      attempt.current = null; setUnresolved(false); setBody(""); setDraftActor(null);
      await load(actor);
    } catch {
      setUnresolved(true);
      if (context.isCurrent(actor)) setProblem("Saatmise tulemust ei saanud kinnitada. Proovi sama saatmist uuesti; sõnum jääb üheks.");
    } finally { sending.current = false; setBusy(false); }
  }
  const actor = context.actor;
  const changed = draftActor !== null && (!actor || draftActor !== actorKey(actor));
  const visible = actor && displayedActor.current === actorKey(actor) ? view : null;
  return <section className="mx-auto max-w-3xl space-y-5 rounded-[28px] border border-black/5 bg-white p-5 shadow-sm md:p-8">
    <Link href="/v2/messages" className="text-sm font-semibold text-neutral-600">← Vestlused</Link>
    <header className="flex items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold">{visible?.peer_name || "Vestlus"}</h1>
        {visible?.listing ? <Link className="mt-1 block text-sm text-neutral-600" href={"/v2/listing/" + visible.listing.id}>{visible.listing.title || "Kuulutus"}</Link>
          : visible && <p className="mt-1 text-sm text-neutral-500">Kuulutus on kustutatud. Vestluse sõnumid on alles.</p>}</div>
      <button type="button" onClick={() => context.refresh()} disabled={busy || reading} className="rounded-xl border px-3 py-2 text-sm disabled:opacity-50">Värskenda</button>
    </header>
    {(context.loading || reading) && <p role="status" className="text-sm text-neutral-500">Laen vestlust…</p>}
    {context.anonymous && <Link className="block text-sm font-semibold" href={"/auth?next=" + encodeURIComponent("/v2/messages/" + conversationId)}>Vestluse lugemiseks logi sisse</Link>}
    {(problem || context.error) && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{problem || context.error}</p>}
    {visible && <>
      {visible.next_before_message_id && <button type="button" disabled={reading || busy} className="rounded-xl border px-4 py-2 text-sm"
        onClick={() => actor && void load(actor, visible.next_before_message_id)}>Lae varasemad sõnumid</button>}
      <ol className="space-y-3" aria-label="Vestluse sõnumid">
        {visible.messages.map(message => <li key={message.id} className={"flex " + (message.mine ? "justify-end" : "justify-start")}>
          <article className={"max-w-[90%] rounded-2xl px-4 py-3 " + (message.mine ? "bg-[#edf2e8]" : "bg-neutral-100")}>
            <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
            <time dateTime={message.created_at} className="mt-2 block text-xs text-neutral-500">{new Date(message.created_at).toLocaleString("et-EE")}</time>
          </article>
        </li>)}
      </ol>
      {!visible.messages.length && <p className="text-sm text-neutral-500">Alusta vestlust oma sõnumiga.</p>}
      {!visible.can_send && <p className="rounded-xl bg-neutral-100 p-3 text-sm">Selles vestluses ei saa praegu uusi sõnumeid saata.</p>}
    </>}
    {changed && <p className="rounded-xl bg-amber-50 p-3 text-sm">Pooleli olev sõnum kuulub eelmisele identiteedile. Jätkamiseks vaheta tagasi.</p>}
    <form onSubmit={event => { event.preventDefault(); void send(); }} className="space-y-3">
      <label htmlFor="listing-message" className="block text-sm font-semibold">Sinu sõnum</label>
      <textarea id="listing-message" value={changed ? "" : body} rows={4} maxLength={10000}
        disabled={busy || unresolved || changed || !visible?.can_send}
        onChange={event => { setBody(event.target.value); setDraftActor(event.target.value && actor ? actorKey(actor) : null); }}
        className="w-full rounded-2xl border border-neutral-200 p-3 text-sm disabled:bg-neutral-50" />
      <button type="submit" disabled={busy || reading || changed || !visible?.can_send || !body.trim()}
        className="rounded-2xl bg-[#171717] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Saadan…" : unresolved ? "Proovi sama saatmist uuesti" : "Saada sõnum"}
      </button>
    </form>
  </section>;
}
