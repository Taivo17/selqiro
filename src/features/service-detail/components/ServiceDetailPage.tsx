"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import PublicPhotoGallery from "../../../shared/media/PublicPhotoGallery";
import { getPublicService } from "../../../entities/service/api/getPublicService";
import { serviceLocationLabel, servicePriceLabel, type PublicServiceOffer } from "../../../entities/service/model/publicService";
import { serviceEditorMessages } from "../../service-editor/model/serviceEditorMessages";
import { useServiceCategories } from "../../service-category-selection/model/useServiceCategories";
import ServiceContactButton from "./ServiceContactButton";
import ServiceReturnBackLink from "../../service-navigation/components/ServiceReturnBackLink";

export default function ServiceDetailPage({serviceId}: {serviceId: string}) {
  const {language, t} = useV2Translation(serviceEditorMessages), categories = useServiceCategories();
  const [state, setState] = useState<{id: string; service: PublicServiceOffer | null; loading: boolean; error: boolean}>({id: serviceId, service: null, loading: true, error: false});
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); let live = true;
    void getPublicService(serviceId, abort.signal).then(service => {
      if (live) setState({id: serviceId, service, loading: false, error: false});
    }).catch(() => {if (live && !abort.signal.aborted) setState({id: serviceId, service: null, loading: false, error: true});});
    return () => {live = false; abort.abort();};
  }, [serviceId, retry]);
  const current = state.id === serviceId ? state : {service: null, loading: true, error: false};
  const service = current.service;
  const categoryLabel = (code: string | null) => {const value = categories.categories.find(item => item.code === code); return value ? language === "et" ? value.labelEt : value.labelEn : code;};
  return <div className="min-w-0 space-y-6">
    <ServiceReturnBackLink serviceId={serviceId} />
    {current.loading ? <p role="status" className="rounded-3xl bg-white p-6">{t("loading")}</p>
      : current.error ? <section role="alert" className="rounded-3xl border border-red-200 bg-white p-6"><p>{t("loadError")}</p><button type="button" className="mt-4 rounded-full border px-5 py-3 font-bold" onClick={() => {setState({id: serviceId, service: null, loading: true, error: false}); setRetry(value => value + 1);}}>{t("retry")}</button></section>
      : !service ? <h1 className="rounded-3xl bg-white p-6 text-2xl font-black">{t("unavailable")}</h1>
      : <>
        <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 rounded-[30px] border border-teal-200 bg-white p-3 sm:p-5"><PublicPhotoGallery title={service.title} photos={service.images.map(image => ({id: image.id, src: image.url}))} /></div>
          <aside className="min-w-0 space-y-6 rounded-[30px] border border-teal-200 bg-white p-6 sm:p-8">
            <p className="text-sm font-bold text-teal-800">{[categoryLabel(service.category), categoryLabel(service.subcategory)].filter(Boolean).join(" · ")}</p>
            <h1 className="break-words text-3xl font-black">{service.title}</h1><p className="text-2xl font-black">{servicePriceLabel(service, language)}</p>
            <div><p>{serviceLocationLabel(service) || t("locationMissing")}</p>{service.city && service.location && service.location !== service.city ? <p className="mt-2 whitespace-pre-line text-sm text-neutral-600">{service.location}</p> : null}</div>
            <div className="space-y-2 border-t border-neutral-100 pt-5"><h2 className="break-words text-lg font-bold">{service.sellerName || t("provider")}</h2>
              <p className="text-sm text-neutral-500">{t(service.sellerType === "business" ? "business" : "privatePerson")}</p>
              {service.sellerSlug ? <Link href={`/v2/profile/${encodeURIComponent(service.sellerSlug)}`} className="inline-flex min-h-10 items-center font-semibold underline">{t("viewProfile")}</Link> : null}</div>
            <ServiceContactButton serviceId={service.id} />
          </aside>
        </div>
        {service.description ? <section className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm sm:p-8"><h2 className="text-2xl font-black">{t("description")}</h2>
          <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-neutral-700">{service.description}</p></section> : null}
      </>}
  </div>;
}
