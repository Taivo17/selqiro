"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";
import { contactListingSeller } from "../../../entities/conversation/api/managedConversationClient";
import { isConversationId, ListingContactError, type ListingContactCommand } from "../../../entities/conversation/model/listingContact";
import { contactDiagnostic, formatContactDiagnostic } from "../../../entities/conversation/model/contactDiagnostic";
import { useConversationActor } from "../model/useConversationActor";

export default function ListingContactButton(props: { listingId: string; className?: string }) {
  return v2IntegrationEnabled() ? <EnabledListingContactButton {...props} /> : null;
}
function EnabledListingContactButton({ listingId, className }: { listingId: string; className?: string }) {
  const router = useRouter(), context = useConversationActor();
  const pending = useRef<ListingContactCommand | null>(null), inFlight = useRef(false);
  const [busy, setBusy] = useState(false), [problem, setProblem] = useState<{ generation: number; text: string } | null>(null);
  async function contact() {
    const actor = context.actor;
    if (!actor || !context.isCurrent(actor) || inFlight.current || !isConversationId(listingId)) return;
    inFlight.current = true; setBusy(true); setProblem(null);
    const old = pending.current;
    const command = old && old.expectedUserId === actor.expectedUserId && old.expectedIdentityId === actor.expectedIdentityId
      && old.listingId === listingId ? old : Object.freeze({ expectedUserId: actor.expectedUserId,
        expectedIdentityId: actor.expectedIdentityId, requestKey: crypto.randomUUID(), listingId });
    pending.current = command;
    try {
      const receipt = await contactListingSeller(actor.accessToken, command, actor.signal);
      if (context.isCurrent(actor)) router.push("/v2/messages/" + receipt.conversation_id);
    } catch (error) {
      const diagnostic = error instanceof ListingContactError ? error.diagnostic
        ?? contactDiagnostic(error.code === "response" ? "browser_response" : "browser_request", error.code)
        : contactDiagnostic("browser_request", "outcome_unknown");
      if (context.isCurrent(actor)) setProblem({ generation: actor.generation,
        text: "Vestlust ei saanud praegu avada. Tõrkekood: " + formatContactDiagnostic(diagnostic) + "." });
    } finally { inFlight.current = false; setBusy(false); }
  }
  const style = className ?? "block w-full rounded-2xl bg-[#171717] px-5 py-4 text-center font-semibold text-white disabled:opacity-50";
  const currentProblem = context.actor && problem?.generation === context.actor.generation ? problem.text : null;
  return <div className="space-y-2">
    {!context.loading && context.anonymous && isConversationId(listingId)
      ? <Link href={"/auth?next=" + encodeURIComponent("/v2/listing/" + listingId)} className={style}>Logi sisse, et kirjutada müüjale</Link>
      : <button type="button" className={style}
      disabled={busy || context.loading || !context.actor || !isConversationId(listingId)} onClick={() => void contact()}>
      {busy ? "Avan vestlust…" : "Kirjuta müüjale"}
    </button>}
    {(currentProblem || context.error) && <p role="status" className="text-sm text-neutral-600">{currentProblem || context.error}</p>}
  </div>;
}
