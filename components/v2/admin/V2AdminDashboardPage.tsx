"use client";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";
import { demoUi, type DemoTranslate } from "@/lib/i18n/catalogs/demoUi";


import { useState } from "react";

const riskMessageKeys = { Low: "riskLow", Medium: "riskMedium", High: "riskHigh" } as const;

type AdminCase = {
  id: string;
  title: string;
  type: string;
  country: string;
  language: string;
  risk: "Low" | "Medium" | "High";
  status: string;
  assigned?: string;
  age: string;
};

type AuditItem = {
  title: string;
  meta: string;
  actor: string;
  time: string;
};

type Signal = {
  title: string;
  area: string;
  severity: "Low" | "Medium" | "High";
  trend: string;
  users: string;
};

const getCases = (t: DemoTranslate): AdminCase[] => [
  {
    id: "ST-78421",
    title: t("storyFlagged"),
    type: t("storyReview"),
    country: t("estonia"),
    language: "et",
    risk: "High",
    status: t("needsReview"),
    age: "5 min",
  },
  {
    id: "REP-1029",
    title: t("listingComplaint"),
    type: t("report"),
    country: t("finland"),
    language: "fi",
    risk: "High",
    status: t("new"),
    age: "12 min",
  },
  {
    id: "SRV-4421",
    title: t("serviceClaim"),
    type: t("serviceReview"),
    country: t("japan"),
    language: "ja",
    risk: "Medium",
    status: t("aiTriaged"),
    age: "18 min",
    assigned: "Mari",
  },
  {
    id: "PAY-9902",
    title: t("paymentDispute"),
    type: t("payment"),
    country: t("germany"),
    language: "de",
    risk: "Medium",
    status: t("waitingProvider"),
    age: "31 min",
  },
];

const getAuditItems = (t: DemoTranslate): AuditItem[] => [
  {
    title: t("energyAdjustmentAdded"),
    meta: t("welcomeEnergy"),
    actor: t("admin"),
    time: "10:42",
  },
  {
    title: t("storyApproved"),
    meta: t("storyId"),
    actor: t("admin"),
    time: "10:21",
  },
  {
    title: t("listingHidden"),
    meta: t("listingViolation"),
    actor: t("admin"),
    time: "09:58",
  },
  {
    title: t("aiAnswer"),
    meta: t("paymentSupport"),
    actor: "AI",
    time: "09:05",
  },
];

const getSignals = (t: DemoTranslate): Signal[] => [
  {
    title: t("checkoutError"),
    area: t("payments"),
    severity: "High",
    trend: "+75%",
    users: t("users12"),
  },
  {
    title: t("uploadTimeout"),
    area: t("listingsAdmin"),
    severity: "Medium",
    trend: "+40%",
    users: t("users8"),
  },
  {
    title: t("japaneseLabel"),
    area: t("localization"),
    severity: "Low",
    trend: "+20%",
    users: t("users5"),
  },
];

function SidebarItem({
  label,
  count,
  active,
}: {
  label: string;
  count?: string;
  active?: boolean;
}) {
  return (
    <button
      className={[
        "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold transition",
        active
          ? "bg-black text-white"
          : "text-neutral-700 hover:bg-neutral-100 hover:text-black",
      ].join(" ")}
    >
      <span>{label}</span>
      {count ? (
        <span
          className={[
            "rounded-full px-2 py-0.5 text-xs",
            active ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500",
          ].join(" ")}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function StatCard({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "neutral" | "green" | "orange" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-700 bg-emerald-50"
      : tone === "orange"
        ? "text-amber-700 bg-amber-50"
        : tone === "red"
          ? "text-red-700 bg-red-50"
          : "text-neutral-700 bg-neutral-100";

  return (
    <article className="rounded-[26px] border border-black/5 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-neutral-500">{label}</p>
      <p className="mt-3 text-4xl font-black">{value}</p>
      <span className={["mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black", toneClass].join(" ")}>
        {helper}
      </span>
    </article>
  );
}

function RiskBadge({ risk }: { risk: AdminCase["risk"] }) {
  const { t } = useV2Translation(demoUi);
  const cls =
    risk === "High"
      ? "bg-red-50 text-red-700"
      : risk === "Medium"
        ? "bg-amber-50 text-amber-700"
        : "bg-neutral-100 text-neutral-700";

  return (
    <span className={["rounded-full px-3 py-1 text-xs font-black", cls].join(" ")}>
      {t(riskMessageKeys[risk])}
    </span>
  );
}

function CaseRow({
  item,
  active,
  onClick,
}: {
  item: AdminCase;
  active: boolean;
  onClick: () => void;
}) {
  const { t } = useV2Translation(demoUi);
  return (
    <button
      onClick={onClick}
      className={[
        "w-full rounded-[22px] border p-4 text-left transition",
        active
          ? "border-black bg-black text-white"
          : "border-black/5 bg-white hover:border-neutral-300",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={[
              "text-xs font-bold uppercase tracking-[0.18em]",
              active ? "text-white/45" : "text-neutral-400",
            ].join(" ")}
          >
            {item.type} · {item.id}
          </p>
          <h3 className="mt-2 font-black">{item.title}</h3>
          <p className={["mt-1 text-sm", active ? "text-white/60" : "text-neutral-500"].join(" ")}>
            {item.country} · {item.language} · {item.age}
          </p>
        </div>

        <RiskBadge risk={item.risk} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={[
            "rounded-full px-3 py-1 text-xs font-bold",
            active ? "bg-white/10 text-white" : "bg-neutral-100 text-neutral-600",
          ].join(" ")}
        >
          {item.status}
        </span>

        {item.assigned ? (
          <span
            className={[
              "rounded-full px-3 py-1 text-xs font-bold",
              active ? "bg-white/10 text-white" : "bg-blue-50 text-blue-700",
            ].join(" ")}
          >
             {t("assignedPrefix")} {item.assigned}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
  const { t } = useV2Translation(demoUi);
  const cls =
    signal.severity === "High"
      ? "bg-red-50 text-red-700"
      : signal.severity === "Medium"
        ? "bg-amber-50 text-amber-700"
        : "bg-blue-50 text-blue-700";

  return (
    <article className="rounded-[22px] border border-black/5 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
            {signal.area}
          </p>
          <h3 className="mt-2 font-black">{signal.title}</h3>
          <p className="mt-1 text-sm text-neutral-500">{signal.users}  {t("affectedSuffix")}</p>
        </div>

        <span className={["rounded-full px-3 py-1 text-xs font-black", cls].join(" ")}>
          {t(riskMessageKeys[signal.severity])}
        </span>
      </div>

      <p className="mt-3 text-sm font-black text-neutral-700">
         {t("trendPrefix")} {signal.trend}
      </p>
    </article>
  );
}

function AuditRow({ item }: { item: AuditItem }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div>
        <h3 className="font-black">{item.title}</h3>
        <p className="mt-1 text-sm text-neutral-500">{item.meta}</p>
      </div>

      <div className="text-right">
        <p className="text-sm font-black">{item.actor}</p>
        <p className="text-xs text-neutral-400">{item.time}</p>
      </div>
    </div>
  );
}

export default function V2AdminDashboardPage() {
  const { t } = useV2Translation(demoUi);
  const cases = getCases(t);
  const auditItems = getAuditItems(t);
  const signals = getSignals(t);
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0].id);
  const selectedCase = cases.find((item) => item.id === selectedCaseId) || cases[0];

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-28 space-y-2 rounded-[30px] border border-black/5 bg-white p-4 shadow-sm">
          <SidebarItem label={t("dashboard")} active />
          <SidebarItem label={t("reports")} count="28" />
          <SidebarItem label={t("storyReview")} count="7" />
          <SidebarItem label={t("listingsReview")} count="18" />
          <SidebarItem label={t("servicesReview")} count="6" />
          <SidebarItem label={t("identities")} />
          <SidebarItem label={t("energyPayments")} count="4" />
          <SidebarItem label={t("aiSignals")} count="3" />
          <SidebarItem label={t("auditLog")} />
          <SidebarItem label={t("settings")} />
        </div>
      </aside>

      <div className="space-y-8">
        <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-emerald-600">
                 {t("admin")} </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight">
                 {t("moderationDashboard")} </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-neutral-600">
                 {t("adminDescription")} </p>
            </div>

            <div className="rounded-[24px] bg-neutral-950 p-5 text-white md:w-[340px]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                 {t("adminPrinciple")} </p>
              <p className="mt-2 text-2xl font-black">{t("trustFirst")}</p>
              <p className="mt-2 text-sm leading-6 text-white/65">
                 {t("adminAccess")} </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label={t("openReports")} value="28" helper={t("todayChange")} tone="green" />
          <StatCard label={t("aiEscalations")} value="11" helper={t("needsHuman")} tone="orange" />
          <StatCard label={t("storyReviews")} value="7" helper={t("pending")} tone="orange" />
          <StatCard label={t("paymentIssues")} value="4" helper={t("support")} />
          <StatCard label={t("systemAlerts")} value="2" helper={t("critical")} tone="red" />
        </section>

        <section className="grid gap-8 xl:grid-cols-[1fr_420px]">
          <div className="space-y-8">
            <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.26em] text-neutral-400">
                     {t("aiTriage")} </p>
                  <h2 className="mt-2 text-3xl font-black">{t("firstPassOverview")}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
                     {t("aiTriageDescription")} </p>
                </div>

                <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                   {t("handled82")} </span>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[24px] bg-emerald-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                     {t("green")} </p>
                  <h3 className="mt-2 text-xl font-black">{t("clearCases")}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                     {t("clearCasesDescription")} </p>
                </div>

                <div className="rounded-[24px] bg-amber-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                     {t("yellow")} </p>
                  <h3 className="mt-2 text-xl font-black">{t("uncertain")}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                     {t("uncertainDescription")} </p>
                </div>

                <div className="rounded-[24px] bg-red-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
                     {t("red")} </p>
                  <h3 className="mt-2 text-xl font-black">{t("highRisk")}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                     {t("highRiskDescription")} </p>
                </div>
              </div>
            </section>

            <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.26em] text-neutral-400">
                     {t("queue")} </p>
                  <h2 className="mt-2 text-3xl font-black">{t("needsHumanReview")}</h2>
                </div>

                <button className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-black shadow-sm">
                   {t("viewAll")} </button>
              </div>

              <div className="space-y-3">
                {cases.map((item) => (
                  <CaseRow
                    key={item.id}
                    item={item}
                    active={selectedCaseId === item.id}
                    onClick={() => setSelectedCaseId(item.id)}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.26em] text-neutral-400">
                     {t("aiSignals")} </p>
                  <h2 className="mt-2 text-3xl font-black">{t("recurringIssues")}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
                     {t("aiSignalsDescription")} </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {signals.map((signal) => (
                  <SignalCard key={signal.title} signal={signal} />
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
                 {t("caseDetail")} </p>
              <h2 className="mt-2 text-2xl font-black">{selectedCase.title}</h2>
              <p className="mt-2 text-sm text-neutral-500">
                {selectedCase.type} · {selectedCase.id}
              </p>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl bg-[#fbfbfa] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
                     {t("ownership")} </p>
                  <p className="mt-1 font-black">
                    {selectedCase.assigned
                      ? t("handledBy", { name: selectedCase.assigned })
                      : t("unassigned")}
                  </p>
                  <button className="mt-3 rounded-full bg-black px-4 py-2 text-xs font-black text-white">
                     {t("takeCase")} </button>
                </div>

                <div className="rounded-2xl bg-[#fbfbfa] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
                     {t("original")} </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-700">
                     {t("originalDescription")} </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                     {t("aiTranslation")} </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-700">
                     {t("aiTranslationDescription")} </p>
                </div>

                <div className="rounded-2xl bg-amber-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                     {t("aiRecommendation")} </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-700">
                    {t("riskRecommendation", { risk: t(riskMessageKeys[selectedCase.risk]) })}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <button className="rounded-full bg-black px-5 py-3 text-sm font-black text-white">
                   {t("openDetails")} </button>
                <button className="rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black">
                   {t("escalate")} </button>
              </div>
            </section>

            <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
                 {t("energyPaymentsHeading")} </p>
              <h2 className="mt-2 text-xl font-black">{t("adjustmentTool")}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                 {t("adjustmentDescription")} </p>
              <button className="mt-5 w-full rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black shadow-sm">
                 {t("openEnergyCase")} </button>
            </section>

            <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
                     {t("auditLogHeading")} </p>
                  <h2 className="mt-2 text-xl font-black">{t("recentActivity")}</h2>
                </div>
              </div>

              <div className="divide-y divide-black/5">
                {auditItems.map((item) => (
                  <AuditRow key={`${item.title}-${item.time}`} item={item} />
                ))}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}
