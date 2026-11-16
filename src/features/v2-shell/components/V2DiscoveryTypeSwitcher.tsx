"use client";
import Link from "next/link";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { getOfferTheme } from "../../../shared/marketplace/offerTheme";
import { shellUiMessages } from "../../../../lib/i18n/catalogs/shellUi";
export type V2DiscoveryType = "products" | "services" | "jobs";
const items = [
  {id: "products",kind: "listing",label: "listings",href: "/v2/products"},
  {id: "services",kind: "service",label: "services",href: "/v2/services"},
  {id: "jobs",kind: "job",label: "jobs",href: "/v2/jobs"},
] as const;
const base = "flex min-h-14 min-w-0 items-center justify-center rounded-[18px] border px-2 py-2 text-center text-sm font-black transition focus-visible:outline-none focus-visible:ring-2";
export default function V2DiscoveryTypeSwitcher({active}: {active: V2DiscoveryType}) {
  const {t} = useV2Translation(shellUiMessages);
  return <nav aria-label={t("choose_content_type")} className="rounded-[26px] border border-black/5 bg-white p-2 shadow-sm">
    <div className="grid min-w-0 grid-cols-3 gap-2">{items.map(item => <Link key={item.id} href={item.href} aria-current={active === item.id ? "page" : undefined}
      className={`${base} ${active === item.id ? getOfferTheme(item.kind).activeTab : `border-transparent hover:bg-neutral-100 focus-visible:ring-neutral-400/30 ${getOfferTheme(item.kind).text}`}`}>{t(item.label)}</Link>)}</div>
  </nav>;
}
