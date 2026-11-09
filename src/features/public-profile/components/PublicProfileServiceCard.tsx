"use client";
import Link from "next/link";
import { useRef, type MouseEvent } from "react";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { getCatalogTranslation, localeForLanguage, type TranslationParams } from "../../../../lib/i18n/useTranslation";
import type { Language } from "../../../../lib/i18n/translations";
import { publicUiMessages } from "../../../../lib/i18n/catalogs/publicUi";
import { getPublicServiceImageUrl, type PublicService } from "../../../entities/service/model/public";
import { serviceMediaUrl } from "../../../entities/service/model/publicService";
import { isPlainServiceClick } from "../../service-navigation/model/serviceReturnContext";

function formatCurrency(
  amount: number,
  currency: string,
  uiLanguage: Language
): string {
  try {
    return new Intl.NumberFormat(
      localeForLanguage(uiLanguage),
      {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    ).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function priceLabel(
  service: PublicService, uiLanguage: Language = "en"
): string {
  const t = (key: keyof typeof publicUiMessages.en, params?: TranslationParams) => getCatalogTranslation(uiLanguage, publicUiMessages, key, params);

  if (
    service.priceType ===
      "contact" ||
    service.priceAmount === null
  ) {
    return t("price_by_agreement");
  }

  const amountLabel =
    formatCurrency(
      service.priceAmount,
      service.currency, uiLanguage
    );

  if (
    service.priceType ===
    "from"
  ) {
    return t("price_from", {amount: amountLabel});
  }

  if (
    service.priceType ===
    "hourly"
  ) {
    return `${amountLabel} / h`;
  }

  return amountLabel;
}

function fallbackCategoryLabel(
  value: string | null
): string | null {
  if (!value) {
    return null;
  }

  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function serviceCategoryLabel(
  service: PublicService,
  categoryLabelByCode:
    Map<string, string>, uiLanguage: Language = "en"
): string {
  const t = (key: keyof typeof publicUiMessages.en, params?: TranslationParams) => getCatalogTranslation(uiLanguage, publicUiMessages, key, params);

  const rootLabel =
    service.category
      ? categoryLabelByCode.get(
          service.category
        ) ||
        fallbackCategoryLabel(
          service.category
        )
      : null;

  const childLabel =
    service.subcategory
      ? categoryLabelByCode.get(
          service.subcategory
        ) ||
        fallbackCategoryLabel(
          service.subcategory
        )
      : null;

  return [
    rootLabel,
    childLabel,
  ]
    .filter(Boolean)
    .join(" · ") ||
    t("service");
}

function serviceLocationLabel(
  service: PublicService
): string | null {
  return (
    service.city ||
    service.location ||
    service.country ||
    null
  );
}

export default function ServiceCard({
  service,
  expanded,
  categoryLabelByCode,
  onOpen,
}: {
  service: PublicService;
  expanded: boolean;
  categoryLabelByCode:
    Map<string, string>;
  onOpen: (input: {serviceId: string; cardViewportTop: number}) => void;
}) {
  const { language: uiLanguage, t } = useV2Translation(publicUiMessages);

  const cardRef = useRef<HTMLElement>(null);
  function remember(event: MouseEvent<HTMLAnchorElement>) {
    if (isPlainServiceClick(event)) onOpen({serviceId: service.id,
      cardViewportTop: cardRef.current?.getBoundingClientRect().top ?? 0});
  }
  const categoryLabel =
    serviceCategoryLabel(
      service,
      categoryLabelByCode, uiLanguage
    );

  const locationLabel =
    serviceLocationLabel(service);
  const href = `/v2/service/${service.id}`;
  const image = service.images.find(image => image.isPrimary) ?? service.images[0];
  const imageUrl = serviceMediaUrl(image ? getPublicServiceImageUrl(image) : service.imageUrl);

  return (
    <article ref={cardRef} data-service-card-id={service.id}
      className={[
        "min-w-0 rounded-[24px] border border-black/5 bg-white p-3 shadow-sm",
        expanded
          ? "w-full"
          : "w-[250px] flex-none",
      ].join(" ")}
    >
      <Link href={href} prefetch={false} onClick={remember} className="block overflow-hidden rounded-[20px] bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700" aria-label={service.title}>
        {/* Already processed public media retains its canonical publication endpoint. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {imageUrl ? <img src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className={`w-full object-cover ${expanded ? "aspect-[4/3]" : "h-36"}`} />
          : <span className="flex h-36 items-center justify-center text-sm text-neutral-500">{t("service")}</span>}
      </Link>

      <div className="mt-3 flex min-w-0 items-center justify-between gap-3">
        <span className="max-w-full truncate rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
          {categoryLabel}
        </span>

        {service.images.length > 1 ? (
          <span className="shrink-0 text-[11px] font-black text-neutral-400">
            {service.images.length}  {t("images")} </span>
        ) : null}
      </div>

      <h3
        className={[
          "mt-2 break-words text-base font-black",
          expanded
            ? ""
            : "line-clamp-2",
        ].join(" ")}
      >
        <Link href={href} prefetch={false} onClick={remember} className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">{service.title}</Link>
      </h3>

      {locationLabel ? (
        <p className="mt-1 line-clamp-2 break-words text-[10px] font-bold uppercase leading-4 tracking-[0.12em] text-neutral-400">
          {locationLabel}
        </p>
      ) : null}

      {service.description ? <Link href={href} prefetch={false} onClick={remember} className="mt-2 line-clamp-2 break-words text-sm leading-6 text-neutral-600 hover:text-black">{service.description}</Link> : null}

      <p className="mt-3 break-words text-base font-black text-neutral-900">
        {priceLabel(service, uiLanguage)}
      </p>
    </article>
  );
}

