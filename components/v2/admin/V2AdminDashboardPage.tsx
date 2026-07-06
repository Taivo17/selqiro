"use client";

import { useState } from "react";

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

const cases: AdminCase[] = [
  {
    id: "ST-78421",
    title: "Today's Story flagged by AI",
    type: "Story Review",
    country: "Estonia",
    language: "et",
    risk: "High",
    status: "Needs review",
    age: "5 min",
  },
  {
    id: "REP-1029",
    title: "Listing complaint — possible scam",
    type: "Report",
    country: "Finland",
    language: "fi",
    risk: "High",
    status: "New",
    age: "12 min",
  },
  {
    id: "SRV-4421",
    title: "Service profile unclear claim",
    type: "Service Review",
    country: "Japan",
    language: "ja",
    risk: "Medium",
    status: "AI triaged",
    age: "18 min",
    assigned: "Mari",
  },
  {
    id: "PAY-9902",
    title: "Payment dispute — charge issue",
    type: "Payment",
    country: "Germany",
    language: "de",
    risk: "Medium",
    status: "Waiting provider",
    age: "31 min",
  },
];

const auditItems: AuditItem[] = [
  {
    title: "Energy adjustment added",
    meta: "Wallet: Milline Vedu · +100 Welcome Energy",
    actor: "Admin",
    time: "10:42",
  },
  {
    title: "Story approved",
    meta: "Story ID: ST-78211",
    actor: "Admin",
    time: "10:21",
  },
  {
    title: "Listing hidden",
    meta: "Listing ID: L-99231 · policy violation",
    actor: "Admin",
    time: "09:58",
  },
  {
    title: "AI auto-answer sent",
    meta: "Support case: payment processing time",
    actor: "AI",
    time: "09:05",
  },
];

const signals: Signal[] = [
  {
    title: "Payment checkout error",
    area: "Payments",
    severity: "High",
    trend: "+75%",
    users: "12 users",
  },
  {
    title: "Image upload timeout",
    area: "Listings",
    severity: "Medium",
    trend: "+40%",
    users: "8 users",
  },
  {
    title: "Japanese UI label confusion",
    area: "Localization",
    severity: "Low",
    trend: "+20%",
    users: "5 users",
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
  const cls =
    risk === "High"
      ? "bg-red-50 text-red-700"
      : risk === "Medium"
        ? "bg-amber-50 text-amber-700"
        : "bg-neutral-100 text-neutral-700";

  return (
    <span className={["rounded-full px-3 py-1 text-xs font-black", cls].join(" ")}>
      {risk}
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
            Assigned: {item.assigned}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
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
          <p className="mt-1 text-sm text-neutral-500">{signal.users} affected</p>
        </div>

        <span className={["rounded-full px-3 py-1 text-xs font-black", cls].join(" ")}>
          {signal.severity}
        </span>
      </div>

      <p className="mt-3 text-sm font-black text-neutral-700">
        Trend: {signal.trend}
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
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0].id);
  const selectedCase = cases.find((item) => item.id === selectedCaseId) || cases[0];

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-28 space-y-2 rounded-[30px] border border-black/5 bg-white p-4 shadow-sm">
          <SidebarItem label="Dashboard" active />
          <SidebarItem label="Reports" count="28" />
          <SidebarItem label="Story Review" count="7" />
          <SidebarItem label="Listings Review" count="18" />
          <SidebarItem label="Services Review" count="6" />
          <SidebarItem label="Identities" />
          <SidebarItem label="Energy & Payments" count="4" />
          <SidebarItem label="AI Signals" count="3" />
          <SidebarItem label="Audit Log" />
          <SidebarItem label="Settings" />
        </div>
      </aside>

      <div className="space-y-8">
        <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-emerald-600">
                Admin
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight">
                Moderation dashboard
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-neutral-600">
                Admin on modulaarne juhtumite töölaud. AI teeb esmase sorteerimise,
                inimene lahendab tundlikud ja kahtlased juhtumid.
              </p>
            </div>

            <div className="rounded-[24px] bg-neutral-950 p-5 text-white md:w-[340px]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                Admin põhimõte
              </p>
              <p className="mt-2 text-2xl font-black">Trust first</p>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Piiratud ligipääs, põhjendatud tegevused ja audit log.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Open reports" value="28" helper="-12% today" tone="green" />
          <StatCard label="AI escalations" value="11" helper="needs human" tone="orange" />
          <StatCard label="Story reviews" value="7" helper="pending" tone="orange" />
          <StatCard label="Payment issues" value="4" helper="support" />
          <StatCard label="System alerts" value="2" helper="critical" tone="red" />
        </section>

        <section className="grid gap-8 xl:grid-cols-[1fr_420px]">
          <div className="space-y-8">
            <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.26em] text-neutral-400">
                    AI triage
                  </p>
                  <h2 className="mt-2 text-3xl font-black">First-pass overview</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
                    AI aitab sorteerida juhtumeid, tõlkida avalikku sisu ja tuvastada
                    korduvaid probleeme. Tundlikud otsused jäävad inimesele.
                  </p>
                </div>

                <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                  82% handled or routed
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[24px] bg-emerald-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                    Green
                  </p>
                  <h3 className="mt-2 text-xl font-black">Clear cases</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    AI võib vastata lihtsale küsimusele või suunata õigesse kohta.
                  </p>
                </div>

                <div className="rounded-[24px] bg-amber-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                    Yellow
                  </p>
                  <h3 className="mt-2 text-xl font-black">Uncertain</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    AI eskaleerib adminile koos põhjuse ja kokkuvõttega.
                  </p>
                </div>

                <div className="rounded-[24px] bg-red-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
                    Red
                  </p>
                  <h3 className="mt-2 text-xl font-black">High risk</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    Pettus, maksed, privaatsus või kõrge nähtavusega sisu vajab inimest.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.26em] text-neutral-400">
                    Queue
                  </p>
                  <h2 className="mt-2 text-3xl font-black">Needs human review</h2>
                </div>

                <button className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-black shadow-sm">
                  Vaata kõiki
                </button>
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
                    AI Signals
                  </p>
                  <h2 className="mt-2 text-3xl font-black">Recurring issues</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
                    AI Signals grupeerib korduvad probleemid, et admin ei peaks
                    sama viga kümnete üksikjuhtumitena lahendama.
                  </p>
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
                Case detail
              </p>
              <h2 className="mt-2 text-2xl font-black">{selectedCase.title}</h2>
              <p className="mt-2 text-sm text-neutral-500">
                {selectedCase.type} · {selectedCase.id}
              </p>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl bg-[#fbfbfa] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
                    Ownership
                  </p>
                  <p className="mt-1 font-black">
                    {selectedCase.assigned
                      ? `Handled by ${selectedCase.assigned}`
                      : "Unassigned"}
                  </p>
                  <button className="mt-3 rounded-full bg-black px-4 py-2 text-xs font-black text-white">
                    Võtan käsile
                  </button>
                </div>

                <div className="rounded-2xl bg-[#fbfbfa] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
                    Original
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-700">
                    Originaaltekst kuvatakse siin. See on tõe allikas.
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                    AI translation
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-700">
                    AI tõlge admini töökeelde. Privaatsõnumeid AI Launchis ei tõlgi.
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                    AI recommendation
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-700">
                    Risk: {selectedCase.risk}. Soovitus: vaata seotud objekti ja
                    tee inimese otsus.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <button className="rounded-full bg-black px-5 py-3 text-sm font-black text-white">
                  Ava detailvaade
                </button>
                <button className="rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black">
                  Eskaleeri
                </button>
              </div>
            </section>

            <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
                Energy / maksed
              </p>
              <h2 className="mt-2 text-xl font-black">Adjustment tööriist</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Admin saab Energy’t lisada või eemaldada ainult ledger tehinguna.
                Saldot ei muudeta otse.
              </p>
              <button className="mt-5 w-full rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black shadow-sm">
                Ava Energy juhtum
              </button>
            </section>

            <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
                    Audit log
                  </p>
                  <h2 className="mt-2 text-xl font-black">Viimased tegevused</h2>
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
