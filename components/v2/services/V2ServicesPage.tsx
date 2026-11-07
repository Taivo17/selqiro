"use client";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";
import { demoUi, type DemoTranslate } from "@/lib/i18n/catalogs/demoUi";


import { useState } from "react";
import V2DiscoveryTypeSwitcher from "../../../src/features/v2-shell/components/V2DiscoveryTypeSwitcher";

type Service = {
  id: string;
  title: string;
  provider: string;
  description: string;
  area: string;
  distance: string;
  price?: string;
  badge?: string;
  cta: string;
  details: string[];
};

const getFeaturedServices = (t: DemoTranslate): Service[] => [
  {
    id: "featuredServices-0",
    title: t("towing"),
    provider: "Paide Puksiirabi",
    description: t("towingDescription"),
    area: t("gonsiori"),
    distance: t("temporaryLocation"),
    price: t("from45"),
    badge: "LIVE",
    cta: t("askHelp"),
    details: [
      t("towingUntilDescription"),
      t("towingVehicles"),
      t("towingPrice"),
    ],
  },
  {
    id: "featuredServices-1",
    title: t("gardenMaintenance"),
    provider: "Milline Vedu",
    description: t("gardenMaintenanceDescription"),
    area: t("paideArea"),
    distance: "~12 km",
    badge: t("featured"),
    cta: t("contact"),
    details: [
      t("maintainMowers"),
      t("maintenancePrice"),
      t("inspectionAppointment"),
    ],
  },
  {
    id: "featuredServices-2",
    title: t("carRepair"),
    provider: "Autoteenindus Paide",
    description: t("carRepairDescription"),
    area: "Paide",
    distance: "~2.4 km",
    price: t("priceByAgreement"),
    badge: t("nearYou"),
    cta: t("write"),
    details: [
      t("generalMaintenance"),
      t("describeCarIssue"),
      t("priceAfterAssessment"),
    ],
  },
];

const getQuickUpdates = (t: DemoTranslate): Service[] => [
  {
    id: "quickUpdates-0",
    title: t("towQuickTitle"),
    provider: "Paide Puksiirabi",
    description:
      t("towQuickDescription"),
    area: t("gonsiori"),
    distance: t("until16"),
    badge: t("quickUpdate"),
    cta: t("askHelp"),
    details: [
      t("usualArea"),
      t("temporaryVisibility"),
      t("temporaryExpiry"),
    ],
  },
  {
    id: "quickUpdates-1",
    title: t("gardenQuickTitle"),
    provider: "Milline Vedu",
    description:
      t("gardenQuickDescription"),
    area: t("paideArea"),
    distance: "~12 km",
    badge: t("quickUpdate"),
    cta: t("write"),
    details: [
      t("quickLink"),
      t("quickHistory"),
    ],
  },
];

const getNormalServices = (t: DemoTranslate): Service[] => [
  {
    id: "normalServices-0",
    title: t("electrical"),
    provider: "Paide Elektritööd OÜ",
    description: t("electricalDescription"),
    area: "Paide",
    distance: "~0.6 km",
    cta: t("contact"),
    details: [
      t("electricalDetails"),
      t("priceBeforeStart"),
    ],
  },
  {
    id: "normalServices-1",
    title: t("cleaning"),
    provider: "Kodupuhas OÜ",
    description: t("cleaningDescription"),
    area: "Paide",
    distance: "~0.8 km",
    price: t("from35"),
    cta: t("write"),
    details: [
      t("cleaningDetails"),
      t("cleaningPrice"),
    ],
  },
  {
    id: "normalServices-2",
    title: "Aiahaldjas OÜ",
    provider: "Aiateenused",
    description: t("gardenDescription"),
    area: "Paide",
    distance: "~1.1 km",
    cta: t("contact"),
    details: [
      t("gardenDetails"),
      t("gardenPrice"),
    ],
  },
  {
    id: "normalServices-3",
    title: t("vehicleTransport"),
    provider: "Milline Vedu",
    description: t("transportDescription"),
    area: "Järvamaa",
    distance: "~15 km",
    cta: t("write"),
    details: [
      t("transportDetails"),
      t("transportPrice"),
    ],
  },
];

function PlaceholderImage({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "rounded-[22px] bg-gradient-to-br from-neutral-100 to-neutral-200",
        className,
      ].join(" ")}
    />
  );
}

function SectionHeader({
  eyebrow,
  title,
  helper,
  action,
}: {
  eyebrow: string;
  title: string;
  helper?: string;
  action?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="inline-flex rounded-full border border-teal-200 bg-teal-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-teal-700">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-black">{title}</h2>
        {helper ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
            {helper}
          </p>
        ) : null}
      </div>

      {action ? (
        <button className="hidden rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-black text-teal-700 shadow-sm transition hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 md:inline-flex">
          {action}
        </button>
      ) : null}
    </div>
  );
}

function ServiceCard({
  service,
  onOpen,
}: {
  service: Service;
  onOpen: (service: Service) => void;
}) {
  const { t } = useV2Translation(demoUi);
  return (
    <article className="rounded-[26px] border border-black/5 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <PlaceholderImage className="h-36" />

      <div className="mt-4 flex items-center justify-between gap-3">
        {service.badge ? (
          <span className="rounded-full border border-teal-200 bg-teal-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-teal-700">
            {service.badge}
          </span>
        ) : (
          <span className="inline-flex rounded-full border border-teal-200 bg-teal-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-teal-700">
             {t("service")} </span>
        )}

        <button className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-bold text-neutral-500">
          ♡
        </button>
      </div>

      <h3 className="mt-3 text-lg font-black">{service.title}</h3>
      <p className="mt-1 text-sm font-semibold text-neutral-500">
        {service.provider}
      </p>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        {service.description}
      </p>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-neutral-700">{service.area}</p>
          <p className="text-xs text-neutral-400">{service.distance}</p>
        </div>

        {service.price ? (
          <p className="text-sm font-black">{service.price}</p>
        ) : null}
      </div>

      <button
        onClick={() => onOpen(service)}
        className="mt-5 w-full rounded-full bg-black px-5 py-3 text-sm font-black text-white"
      >
         {t("viewService")} </button>
    </article>
  );
}

function QuickUpdateCard({
  service,
  onOpen,
}: {
  service: Service;
  onOpen: (service: Service) => void;
}) {
  return (
    <article className="min-w-[280px] rounded-[24px] border border-teal-200 bg-white p-5 shadow-sm md:min-w-[360px]">
      <span className="rounded-full border border-teal-200 bg-teal-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-teal-700">
        {service.badge}
      </span>

      <h3 className="mt-3 text-lg font-black">{service.title}</h3>
      <p className="mt-1 text-sm font-semibold text-neutral-500">
        {service.provider}
      </p>
      <p className="mt-3 text-sm leading-6 text-neutral-600">
        {service.description}
      </p>

      <div className="mt-4 rounded-2xl bg-[#fbfbfa] p-4">
        <p className="text-sm font-black">{service.area}</p>
        <p className="mt-1 text-xs text-neutral-500">{service.distance}</p>
      </div>

      <button
        onClick={() => onOpen(service)}
        className="mt-4 w-full rounded-full bg-black px-5 py-3 text-sm font-black text-white"
      >
        {service.cta}
      </button>
    </article>
  );
}

function ServiceModal({
  service,
  onClose,
}: {
  service: Service | null;
  onClose: () => void;
}) {
  const { t } = useV2Translation(demoUi);
  if (!service) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <button
        aria-label={t("close")}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <article className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[34px] border border-teal-200 bg-white p-5 shadow-2xl md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex rounded-full border border-teal-200 bg-teal-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-teal-700">
               {t("serviceDetail")} </p>
            <h2 className="mt-2 text-3xl font-black">{service.title}</h2>
            <p className="mt-1 text-sm font-semibold text-neutral-500">
              {service.provider}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-black"
          >
             {t("close")} </button>
        </div>

        <PlaceholderImage className="mt-6 h-64" />

        <p className="mt-5 text-base leading-8 text-neutral-700">
          {service.description}
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-[#fbfbfa] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
               {t("area")} </p>
            <p className="mt-1 font-black">{service.area}</p>
          </div>

          <div className="rounded-2xl bg-[#fbfbfa] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
               {t("distanceTime")} </p>
            <p className="mt-1 font-black">{service.distance}</p>
          </div>

          <div className="rounded-2xl bg-[#fbfbfa] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
               {t("price")} </p>
            <p className="mt-1 font-black">{service.price || t("byAgreement")}</p>
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-black/5 bg-[#fbfbfa] p-5">
          <h3 className="font-black">{t("moreInformation")}</h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-600">
            {service.details.map((detail) => (
              <li key={detail}>• {detail}</li>
            ))}
          </ul>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <button className="rounded-full bg-black px-5 py-3 text-sm font-black text-white">
            {service.cta}
          </button>
          <button className="rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black">
             {t("message")} </button>
        </div>
      </article>
    </div>
  );
}

export default function V2ServicesPage() {
  const { t } = useV2Translation(demoUi);
  const featuredServices = getFeaturedServices(t);
  const quickUpdates = getQuickUpdates(t);
  const normalServices = getNormalServices(t);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const selectedService = [...featuredServices, ...quickUpdates, ...normalServices].find(service => service.id === selectedServiceId) ?? null;
  const openService = (service: Service) => setSelectedServiceId(service.id);

  return (
    <div className="space-y-8">
      <V2DiscoveryTypeSwitcher active="services" />

      <section className="rounded-[34px] border border-black/5 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-teal-200 bg-teal-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-teal-700">
               {t("services")} </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
               {t("findNearbyService")} </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
               {t("serviceSearchDescription")} </p>
          </div>

          <div className="rounded-[22px] bg-neutral-950 px-5 py-4 text-white md:w-[300px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
               {t("location")} </p>
            <p className="mt-1 text-xl font-black">{t("paideEstonia")}</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <input
            placeholder={t("searchService")}
            className="h-12 rounded-full border border-neutral-200 bg-white px-5 text-sm outline-none transition placeholder:text-neutral-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
          />

          <button className="rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm font-bold shadow-sm">
             {t("locationPaide")} </button>

          <button className="rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm font-bold shadow-sm">
             {t("filters")} </button>

          <button className="rounded-full border border-teal-300 bg-teal-100 px-4 py-3 text-sm font-black text-teal-950 shadow-sm">
             {t("nearYou")} </button>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[34px] border border-teal-200 bg-teal-50 p-6 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-teal-500 before:content-[''] md:p-8">
        <SectionHeader
          eyebrow={t("nearYou")}
          title={t("featuredServices")}
          helper={t("featuredServiceExplanation")}
          action={t("viewAll")}
        />

        <div className="grid gap-4 md:grid-cols-3">
          {featuredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onOpen={openService}
            />
          ))}
        </div>
      </section>

      {quickUpdates.length > 0 ? (
        <section className="relative overflow-hidden rounded-[34px] border border-teal-200 bg-teal-50 p-6 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-teal-500 before:content-[''] md:p-8">
          <SectionHeader
            eyebrow={t("activeInformation")}
            title={t("quickUpdatesNearby")}
            helper={t("quickUpdateExplanation")}
            action={t("viewAll")}
          />

          <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-2">
            {quickUpdates.map((service) => (
              <QuickUpdateCard
                key={service.id}
                service={service}
                onOpen={openService}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="relative overflow-hidden rounded-[34px] border border-teal-200 bg-teal-50 p-6 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-teal-500 before:content-[''] md:p-8">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-teal-200 bg-teal-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-teal-700">
               {t("results")} </p>
            <h2 className="mt-2 text-3xl font-black">{t("servicesNearby")}</h2>
          </div>

          <p className="text-sm font-semibold text-neutral-500">{t("shown24")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {normalServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onOpen={openService}
            />
          ))}
        </div>
      </section>

      <ServiceModal
        service={selectedService}
        onClose={() => setSelectedServiceId(null)}
      />
    </div>
  );
}
