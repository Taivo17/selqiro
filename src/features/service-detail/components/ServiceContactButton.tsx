"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useConversationActor } from "../../listing-conversation/model/useConversationActor";
import { contactServiceProvider, type ServiceContactCommand } from "../../../entities/service/api/contactServiceProvider";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { serviceEditorMessages } from "../../service-editor/model/serviceEditorMessages";

export default function ServiceContactButton({serviceId}: {serviceId: string}) {
  const context = useConversationActor(), router = useRouter(), {t} = useV2Translation(serviceEditorMessages);
  const pending = useRef<ServiceContactCommand | null>(null), running = useRef(false);
  const [busy, setBusy] = useState(false), [problem, setProblem] = useState<number | null>(null);
  async function contact() {
    const actor = context.actor;
    if (!actor || !context.isCurrent(actor) || running.current) return;
    running.current = true; setBusy(true); setProblem(null);
    const previous = pending.current;
    const command = previous && previous.expectedUserId === actor.expectedUserId && previous.expectedIdentityId === actor.expectedIdentityId && previous.serviceId === serviceId
      ? previous : Object.freeze({expectedUserId: actor.expectedUserId, expectedIdentityId: actor.expectedIdentityId, requestKey: crypto.randomUUID(), serviceId});
    pending.current = command;
    try {const id = await contactServiceProvider(command, actor.signal); if (context.isCurrent(actor)) router.push(`/v2/messages/${id}`);}
    catch {if (context.isCurrent(actor)) setProblem(actor.generation);}
    finally {running.current = false; setBusy(false);}
  }
  const button = "block min-h-12 w-full rounded-full bg-black px-5 py-4 text-center font-bold text-white disabled:opacity-50";
  return <div className="space-y-3">
    {context.anonymous ? <Link className={button} href={`/auth?next=${encodeURIComponent(`/v2/service/${serviceId}`)}`}>{t("signInContact")}</Link>
      : <button type="button" className={button} disabled={busy || context.loading || !context.actor} onClick={() => void contact()}>{t(busy ? "openingConversation" : "contact")}</button>}
    {(problem === context.actor?.generation || context.error) ? <p role="status" className="text-sm text-red-800">{t("contactError")}</p> : null}
  </div>;
}
