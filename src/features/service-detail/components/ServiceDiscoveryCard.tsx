"use client";
import Link from "next/link";
import type { MouseEvent } from "react";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { serviceEditorMessages } from "../../service-editor/model/serviceEditorMessages";
import { serviceLocationLabel, servicePriceLabel, type PublicServiceOffer } from "../../../entities/service/model/publicService";
import ProviderMenu from "../../viewer-provider-controls/components/ProviderMenu";

export default function ServiceDiscoveryCard({service, categoryLabel, onRemember}: {
  service: PublicServiceOffer; categoryLabel: string;
  onRemember: (event: MouseEvent<HTMLAnchorElement>, serviceId: string) => void;
}) {
  const {language, t} = useV2Translation(serviceEditorMessages);
  return <article data-service-card-id={service.id} className="relative min-w-0 rounded-[26px] border border-black/5 bg-white p-3 shadow-sm">
    <Link href={`/v2/service/${service.id}`} prefetch={false} onClick={event => onRemember(event, service.id)} aria-label={t("openService", {title: service.title})}
      className="group block rounded-[20px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600">
      {/* Already processed media retains the endpoint's publication checks. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {service.images[0] ? <img src={service.images[0].url} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-[20px] object-cover" referrerPolicy="no-referrer" />
        : <div className="flex aspect-[4/3] items-center justify-center rounded-[20px] bg-neutral-100 text-neutral-500">{t("noImage")}</div>}
      <div className="space-y-2 px-1 pb-2 pt-4"><p className="text-xs font-bold text-teal-800">{categoryLabel}</p>
        <h3 className="break-words text-xl font-black group-hover:underline">{service.title}</h3><p className="line-clamp-2 break-words text-sm leading-6 text-neutral-600">{service.description}</p>
        <p className="text-sm text-neutral-500">{service.sellerName}</p><p className="text-sm text-neutral-500">{serviceLocationLabel(service) || t("locationMissing")}</p>
        <p className="pt-2 text-xl font-black">{servicePriceLabel(service, language)}</p></div>
    </Link>
    <div className="absolute right-4 top-4 z-10"><ProviderMenu target={{type: "service", id: service.id}} name={service.sellerName} /></div>
  </article>;
}
