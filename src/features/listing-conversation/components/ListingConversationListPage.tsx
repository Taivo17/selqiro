"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";
import { listListingConversations } from "../../../entities/conversation/api/managedConversationClient";
import type { ConversationList } from "../../../entities/conversation/model/listingContact";
import { useConversationActor, type ConversationActorContext } from "../model/useConversationActor";

export default function ListingConversationListPage() {
  return v2IntegrationEnabled() ? <ManagedConversationList /> : <p>Vestlused ei ole kättesaadavad.</p>;
}
function ManagedConversationList() {
  const context = useConversationActor(), generation = useRef(0);
  const [list, setList] = useState<ConversationList | null>(null), [reading, setReading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  async function load(actor: ConversationActorContext, before: string | null = null) {
    const version = ++generation.current; setReading(true);
    try {
      const value = await listListingConversations(actor.accessToken, { expectedUserId: actor.expectedUserId,
        expectedIdentityId: actor.expectedIdentityId, beforeConversationId: before }, actor.signal);
      if (context.isCurrent(actor) && version === generation.current) {
        setList(current => before && current ? Object.freeze({ ...value, conversations: Object.freeze([...current.conversations, ...value.conversations]) }) : value);
        setProblem(null);
      }
    } catch { if (context.isCurrent(actor) && version === generation.current) { setList(null); setProblem("Vestlusi ei saanud laadida."); } }
    finally { if (version === generation.current) setReading(false); }
  }
  useEffect(() => {
    generation.current += 1; setList(null); setProblem(null);
    if (context.actor) void load(context.actor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.actor]);
  const visible = context.actor && list?.actor_user_id === context.actor.expectedUserId && list.identity_id === context.actor.expectedIdentityId ? list : null;
  return <section className="mx-auto max-w-3xl space-y-5 rounded-[28px] border border-black/5 bg-white p-5 shadow-sm md:p-8">
    <header className="flex items-center justify-between gap-4"><h1 className="text-2xl font-bold">Vestlused</h1>
      <button type="button" onClick={context.refresh} disabled={reading} className="rounded-xl border px-3 py-2 text-sm">Värskenda</button></header>
    {(reading || context.loading) && <p role="status">Laen vestlusi…</p>}
    {context.anonymous && <Link className="block text-sm font-semibold" href="/auth?next=%2Fv2%2Fmessages">Vestluste lugemiseks logi sisse</Link>}
    {(context.error || problem) && <p role="alert" className="text-sm text-amber-900">{context.error || problem}</p>}
    {visible?.conversations.map(item => <Link key={item.conversation_id} href={"/v2/messages/" + item.conversation_id}
      className="block rounded-2xl border border-neutral-200 p-4 hover:bg-neutral-50">
      <strong>{item.peer_name || "Vestlus"}</strong><p className="mt-1 text-sm text-neutral-600">{item.listing_title || "Vestluse sõnumid"}</p>
    </Link>)}
    {visible && !visible.conversations.length && <p className="text-neutral-600">Selle identiteediga pole veel vestlusi.</p>}
    {visible?.next_before_conversation_id && <button type="button" disabled={reading} className="rounded-xl border px-4 py-2 text-sm"
      onClick={() => context.actor && void load(context.actor, visible.next_before_conversation_id)}>Lae rohkem vestlusi</button>}
  </section>;
}
