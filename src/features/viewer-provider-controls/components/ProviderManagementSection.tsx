"use client";
import Link from "next/link";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { providerControlMessages } from "../model/providerControlMessages";
import ProviderControlsBoundary, {useProviderControlsContext} from "./ProviderControlsBoundary";
import ProviderControlList from "./ProviderControlList";

function Content() {
  const {t} = useV2Translation(providerControlMessages), controls = useProviderControlsContext();
  return <section id="my-area-provider-controls" className="min-w-0 scroll-mt-28 space-y-6 rounded-[30px] border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
    <header><h2 className="text-2xl font-black">{t("management")}</h2><p className="mt-3 text-sm leading-6 text-neutral-600">{t("managementHelp")}</p></header>
    {controls?.account.anonymous ? <Link href="/auth?next=%2Fv2%2Fmy-area%23my-area-provider-controls" className="inline-flex min-h-11 items-center font-bold underline">{t("signIn")}</Link>
      : <><ProviderControlList kind="hidden" /><hr className="border-neutral-200" /><ProviderControlList kind="blocked" /></>}
  </section>;
}
export default function ProviderManagementSection() {return <ProviderControlsBoundary><Content /></ProviderControlsBoundary>;}
