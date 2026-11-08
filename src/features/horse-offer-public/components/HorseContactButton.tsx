"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConversationActor } from "../../listing-conversation/model/useConversationActor";
import { contactHorseSeller, type HorseContactCommand } from "../../../entities/horse-offer/api/contactHorseSeller";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { horsePublicMessages } from "../../../../lib/i18n/catalogs/horsePublic";

export default function HorseContactButton({ offerId }: { offerId: string }) {
 const { t } = useV2Translation(horsePublicMessages), context = useConversationActor(), router = useRouter();
 const pending = useRef<HorseContactCommand | null>(null), running = useRef(false);
 const [busy, setBusy] = useState(false), [problem, setProblem] = useState<number | null>(null);
 const style = "block w-full rounded-full bg-black px-6 py-4 text-center font-bold text-white disabled:opacity-50";
 async function contact() {
  const actor = context.actor;
  if (!actor || !context.isCurrent(actor) || running.current) return;
  running.current = true; setBusy(true); setProblem(null);
  const old = pending.current;
  const command = old && old.expectedUserId === actor.expectedUserId && old.expectedIdentityId === actor.expectedIdentityId && old.offerId === offerId
   ? old : Object.freeze({ expectedUserId: actor.expectedUserId, expectedIdentityId: actor.expectedIdentityId, requestKey: crypto.randomUUID(), offerId });
  pending.current = command;
  try { const id = await contactHorseSeller(command, actor.signal);
   if (context.isCurrent(actor)) router.push("/v2/messages/" + id);
  } catch { if (context.isCurrent(actor)) setProblem(actor.generation); }
  finally { running.current = false; setBusy(false); }
 }
 return <div className="space-y-3">
  {context.anonymous ? <Link className={style} href={"/auth?next=" + encodeURIComponent("/v2/horse-offer/" + offerId)}>{t("sign_in")}</Link>
   : <button type="button" className={style} disabled={busy || context.loading || !context.actor} onClick={() => void contact()}>{busy ? t("opening") : t("contact")}</button>}
  {(problem === context.actor?.generation || context.error) && <p role="status" className="text-sm text-red-800">{t("contact_error")}</p>}
 </div>;
}
