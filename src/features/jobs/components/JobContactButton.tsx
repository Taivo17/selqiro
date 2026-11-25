"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef,useState } from "react";
import { contactJob,type JobContactCommand } from "../../../entities/job/api/jobClient";
import { useConversationActor } from "../../listing-conversation/model/useConversationActor";
import { offerConversationHref } from "../../listing-conversation/model/listingConversationNavigation";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { jobMessages } from "../model/jobMessages";
import { jobButton } from "./jobStyles";
export default function JobContactButton({jobId,identityId}: {jobId: string;identityId: string}) {
  const context = useConversationActor(), router = useRouter(), {t} = useV2Translation(jobMessages);
  const pending = useRef<JobContactCommand | null>(null), running = useRef(false), target = useRef(jobId); target.current = jobId;
  const [busy,setBusy] = useState(false), [problem,setProblem] = useState<number | null>(null);
  async function contact() {
    const actor = context.actor; if (!actor || !context.isCurrent(actor) || running.current) return;
    running.current = true; setBusy(true); setProblem(null);
    const previous = pending.current;
    const command = previous && previous.actor.userId === actor.expectedUserId && previous.actor.identityId === actor.expectedIdentityId && previous.jobId === jobId
      ? previous : Object.freeze({actor: {userId: actor.expectedUserId,identityId: actor.expectedIdentityId},requestKey: crypto.randomUUID(),jobId});
    pending.current = command;
    try {const id = await contactJob(command,actor.signal); if (context.isCurrent(actor) && target.current === command.jobId) router.push(offerConversationHref(id, { type: "job", id: command.jobId, entryKey: crypto.randomUUID() }));}
    catch {if (context.isCurrent(actor) && target.current === command.jobId) setProblem(actor.generation);}
    finally {running.current = false; setBusy(false);}
  }
  if (context.actor?.expectedIdentityId === identityId) return <Link href={`/v2/my-area/jobs/${jobId}/edit`} className={`${jobButton} w-full`}>{t("manage")}</Link>;
  return <div className="space-y-3">
    {context.anonymous ? <Link href={`/auth?next=${encodeURIComponent(`/v2/job/${jobId}`)}`} className={`${jobButton} w-full`}>{t("signInContact")}</Link>
      : <button type="button" className={`${jobButton} w-full`} disabled={busy || context.loading || !context.actor} onClick={() => void contact()}>{t(busy ? "openingConversation" : "contact")}</button>}
    {problem === context.actor?.generation || context.error ? <p role="status" className="text-sm leading-6 text-red-800">{t("contactError")}</p> : null}
  </div>;
}
