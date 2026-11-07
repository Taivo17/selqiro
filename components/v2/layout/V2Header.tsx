"use client";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";
import { getCatalogTranslation, type TranslationParams } from "@/lib/i18n/useTranslation";
import type { Language } from "@/lib/i18n/translations";
import { shellUiMessages } from "@/lib/i18n/catalogs/shellUi";


import Link from "next/link";
import V2AccountActions from "../../../src/features/v2-shell/components/V2AccountActions";
import V2LanguageSelect from "@/src/shared/i18n/V2LanguageSelect";

const desktopNavigationItems = (uiLanguage: Language) => { const t = (key: keyof typeof shellUiMessages.en, params?: TranslationParams) => getCatalogTranslation(uiLanguage, shellUiMessages, key, params); return [
  { id: "home", label: t("home"), href: "/v2" },
  { id: "listings", label: t("listings"), href: "/v2/products" },
  { id: "services", label: t("services"), href: "/v2/services" },
  { id: "jobs", label: t("jobs"), href: "/v2" },
  { id: "news", label: t("news"), href: "/v2" },
]; };

export default function V2Header({ authReturnHref }: { authReturnHref?: string }) {
  const { language: uiLanguage, t } = useV2Translation(shellUiMessages);

  return (
    <header data-v2-header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto grid w-full min-w-0 max-w-7xl grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-3 sm:px-5 sm:py-4 xl:grid-cols-[auto_minmax(0,1fr)_auto]">
        <Link
          href="/v2"
          className="shrink-0 text-2xl font-black tracking-tight"
        >
          Selqiro
        </Link>

        <div className="col-span-2 row-start-2 flex min-w-0 items-center justify-end gap-3 md:justify-between xl:col-span-1 xl:col-start-2 xl:row-start-1">
        <nav className="hidden min-w-0 items-center gap-1 md:flex" aria-label={t("main_navigation")}>
          {desktopNavigationItems(uiLanguage).map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="whitespace-nowrap rounded-full px-2 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-black"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <V2LanguageSelect />
        </div>

        <div className="col-start-2 row-start-1 min-w-0 justify-self-end xl:col-start-3">
          <V2AccountActions authReturnHref={authReturnHref} />
        </div>
      </div>
    </header>
  );
}
