"use client";
import Link from "next/link";
import { useAuth } from "../../../../lib/useAuth";
import { serviceUuid } from "../../../entities/service/model/publicService";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { serviceEditorMessages } from "../model/serviceEditorMessages";
import ServiceEditor from "./ServiceEditor";

export default function ServiceEditorPage({serviceId = null}: {serviceId?: string | null}) {
  const {user, loading, error, retry} = useAuth(), {t} = useV2Translation(serviceEditorMessages);
  const id = serviceId?.trim().toLowerCase() ?? null, route = id ? `/v2/my-area/services/${id}/edit` : "/v2/services/new";
  if (loading) return <p role="status" className="p-6">{t("loading")}</p>;
  if (error) return <section role="alert" className="rounded-3xl bg-white p-6"><p>{t("identityUnavailable")}</p><button className="mt-4 font-bold underline" type="button" onClick={retry}>{t("retry")}</button></section>;
  if (!user) return <section className="rounded-3xl bg-white p-6"><h1 className="text-2xl font-black">{t("signIn")}</h1><Link className="mt-5 inline-flex rounded-full bg-black px-6 py-3 font-bold text-white" href={`/auth?next=${encodeURIComponent(route)}`}>{t("signInButton")}</Link></section>;
  if (id && !serviceUuid(id)) return <section className="rounded-3xl bg-white p-6"><h1 className="text-2xl font-black">{t("invalidAddress")}</h1><Link href="/v2/my-area#my-area-services" className="mt-4 inline-block font-bold underline">{t("myArea")}</Link></section>;
  return <ServiceEditor key={`${user.id}:${id ?? "create"}`} userId={user.id} serviceId={id} />;
}
