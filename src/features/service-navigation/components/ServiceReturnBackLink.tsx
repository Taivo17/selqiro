"use client";
import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { getCatalogTranslation } from "../../../../lib/i18n/useTranslation";
import { listingPresentationMessages } from "../../../../lib/i18n/catalogs/listingPresentation";
import { serviceEditorMessages } from "../../service-editor/model/serviceEditorMessages";
import { isPlainServiceClick, prepareServiceSourceReturn, readServiceDetailReturn, type ServiceReturnContext } from "../model/serviceReturnContext";

export default function ServiceReturnBackLink({serviceId}: {serviceId: string}) {
  const {language, t} = useV2Translation(serviceEditorMessages);
  const [saved, setSaved] = useState<{id: string; context: ServiceReturnContext | null} | null>(null);
  useEffect(() => {
    const read = () => setSaved({id: serviceId, context: readServiceDetailReturn(serviceId)});
    read(); window.addEventListener?.("popstate", read);
    return () => window.removeEventListener?.("popstate", read);
  }, [serviceId]);
  const context = saved?.id === serviceId ? saved.context : null;
  function remember(event: MouseEvent<HTMLAnchorElement>) {
    if (!isPlainServiceClick(event)) return;
    const current = readServiceDetailReturn(serviceId);
    if (current) prepareServiceSourceReturn(current);
  }
  return <Link href={context?.sourceUrl ?? "/v2/services"} scroll={!context} onClick={remember}
    className="inline-flex min-h-11 items-center font-bold underline">
    {context?.source === "public-profile" ? getCatalogTranslation(language, listingPresentationMessages, "back_profile") : `← ${t("backServices")}`}
  </Link>;
}
