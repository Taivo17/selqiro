"use client";

import Link from "next/link";
import type {
  EnergyLedgerEntry,
  EnergyWallet,
} from "../../../entities/energy/model/types";
import {
  useEnergyWallet,
} from "../model/useEnergyWallet";

type HistoryTone =
  | "plus"
  | "minus"
  | "reserved";

type HistoryPresentation = {
  title: string;
  meta: string;
  amount: string;
  tone: HistoryTone;
};

const energyFormatter =
  new Intl.NumberFormat(
    "et-EE"
  );

function formatEnergy(
  value: number
): string {
  return energyFormatter.format(
    value
  );
}

function formatDateTime(
  value: string
): string {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "et-EE",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function metadataText(
  entry: EnergyLedgerEntry,
  key: string
): string | null {
  const value =
    entry.publicMetadata[key];

  if (
    typeof value !== "string"
  ) {
    return null;
  }

  return value.trim() || null;
}

function featureLabel(
  entry: EnergyLedgerEntry
): string {
  if (
    entry.feature ===
    "admin_test_energy"
  ) {
    return "Admini test-Energy";
  }

  return entry.feature
    .replace(/_/g, " ")
    .trim();
}

function historyTitle(
  entry: EnergyLedgerEntry
): string {
  const label =
    metadataText(
      entry,
      "label"
    );

  if (label) {
    return label;
  }

  if (
    entry.eventType ===
    "paid_grant"
  ) {
    return "Ostetud Energy lisatud";
  }

  if (
    entry.eventType ===
    "bonus_grant"
  ) {
    return "Boonus-Energy lisatud";
  }

  if (
    entry.eventType ===
    "reserve"
  ) {
    return "Energy reserveeritud";
  }

  if (
    entry.eventType ===
    "commit"
  ) {
    return "Energy kasutatud";
  }

  if (
    entry.eventType ===
    "release"
  ) {
    return "Energy vabastatud";
  }

  return "Energy parandus";
}

function historyAmount(
  entry: EnergyLedgerEntry
): {
  amount: string;
  tone: HistoryTone;
} {
  const availableDelta =
    entry.availablePaidDelta +
    entry.availableBonusDelta;

  const reservedDelta =
    entry.reservedPaidDelta +
    entry.reservedBonusDelta;

  if (
    entry.eventType ===
    "reserve"
  ) {
    const amount = Math.abs(
      reservedDelta ||
        availableDelta
    );

    return {
      amount:
        `${formatEnergy(amount)} reserveeritud`,
      tone: "reserved",
    };
  }

  if (
    entry.eventType ===
    "commit"
  ) {
    const amount = Math.abs(
      reservedDelta ||
        availableDelta
    );

    return {
      amount:
        `−${formatEnergy(amount)}`,
      tone: "minus",
    };
  }

  if (
    entry.eventType ===
    "release"
  ) {
    const amount = Math.abs(
      availableDelta ||
        reservedDelta
    );

    return {
      amount:
        `+${formatEnergy(amount)}`,
      tone: "plus",
    };
  }

  if (
    availableDelta >= 0
  ) {
    return {
      amount:
        `+${formatEnergy(availableDelta)}`,
      tone: "plus",
    };
  }

  return {
    amount:
      `−${formatEnergy(
        Math.abs(
          availableDelta
        )
      )}`,
    tone: "minus",
  };
}

function historyPresentation(
  entry: EnergyLedgerEntry
): HistoryPresentation {
  const purpose =
    metadataText(
      entry,
      "purpose"
    );

  const {
    amount,
    tone,
  } = historyAmount(entry);

  return {
    title: historyTitle(entry),
    meta: [
      purpose ||
        featureLabel(entry),
      formatDateTime(
        entry.createdAt
      ),
    ].join(" · "),
    amount,
    tone,
  };
}

function BalanceCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="rounded-[22px] border border-black/5 bg-[#fbfbfa] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </p>

      <p className="mt-2 break-words text-3xl font-black">
        {formatEnergy(value)}
      </p>

      <p className="mt-1 text-sm leading-5 text-neutral-500">
        {helper}
      </p>
    </div>
  );
}

function HistoryRow({
  entry,
}: {
  entry: EnergyLedgerEntry;
}) {
  const item =
    historyPresentation(entry);

  return (
    <div className="flex min-w-0 items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <h3 className="break-words font-black">
          {item.title}
        </h3>

        <p className="mt-1 break-words text-sm leading-5 text-neutral-500">
          {item.meta}
        </p>
      </div>

      <span
        className={[
          "shrink-0 rounded-full px-3 py-1 text-sm font-black",
          item.tone === "plus"
            ? "bg-emerald-50 text-emerald-700"
            : item.tone === "minus"
              ? "bg-neutral-100 text-neutral-700"
              : "bg-amber-50 text-amber-700",
        ].join(" ")}
      >
        {item.amount}
      </span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-8">
      <section className="h-72 animate-pulse rounded-[34px] bg-white shadow-sm" />

      <section className="grid gap-8 xl:grid-cols-[1fr_360px]">
        <div className="h-[520px] animate-pulse rounded-[34px] bg-white shadow-sm" />
        <div className="h-72 animate-pulse rounded-[30px] bg-white shadow-sm" />
      </section>
    </div>
  );
}

function LoginState() {
  return (
    <section className="rounded-[34px] border border-emerald-100 bg-emerald-50 p-8 text-center shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">
        Energy
      </p>

      <h1 className="mt-3 text-3xl font-black tracking-tight">
        Logi walleti vaatamiseks sisse
      </h1>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-600">
        Energy kuulub aktiivse identiteedi walletile.
        Saldo ja ajalugu on nähtavad ainult sisse
        logitud kasutajale, kellel on sellele
        identiteedile ligipääs.
      </p>

      <Link
        href="/auth"
        className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-black text-white"
      >
        Logi sisse
      </Link>
    </section>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <section className="rounded-[34px] border border-red-100 bg-red-50 p-8 text-center shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-red-700">
        Energy
      </p>

      <h1 className="mt-3 text-3xl font-black tracking-tight text-red-950">
        Energy andmeid ei saanud laadida
      </h1>

      <p className="mx-auto mt-3 max-w-2xl break-words text-sm leading-6 text-red-800">
        {error}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-6 rounded-full bg-red-950 px-6 py-3 text-sm font-black text-white"
      >
        Proovi uuesti
      </button>
    </section>
  );
}

function WalletHero({
  wallet,
  identityName,
  onRefresh,
}: {
  wallet: EnergyWallet;
  identityName: string;
  onRefresh: () => void;
}) {
  return (
    <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-600">
            Energy
          </p>

          <h1 className="mt-3 break-words text-4xl font-black tracking-tight md:text-5xl">
            Energy wallet
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-neutral-600">
            Energy kuulub aktiivsele identiteedile.
            Siin kuvatakse päris saadaval, ostetud,
            boonus- ja reserveeritud Energy ning
            append-only tehinguajalugu.
          </p>

          <button
            type="button"
            onClick={onRefresh}
            className="mt-5 rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm font-black shadow-sm transition hover:border-neutral-300"
          >
            Värskenda andmeid
          </button>
        </div>

        <div className="min-w-0 rounded-[26px] bg-neutral-950 p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
            Tegutsen kui
          </p>

          <p className="mt-2 break-words text-2xl font-black">
            {identityName}
          </p>

          <div className="mt-5 rounded-[22px] bg-white/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
              Saadaval
            </p>

            <p className="mt-2 break-words text-5xl font-black">
              {formatEnergy(
                wallet.availableTotal
              )}
            </p>

            <p className="mt-1 text-sm text-white/60">
              Energy kasutamiseks valmis
            </p>
          </div>

          <p className="mt-4 text-xs leading-5 text-white/45">
            Uuendatud{" "}
            {formatDateTime(
              wallet.updatedAt
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

export default function
EnergyWalletPage() {
  const {
    identity,
    wallet,
    entries,
    authenticated,
    authLoading,
    loading,
    error,
    refresh,
  } = useEnergyWallet();

  if (
    authLoading ||
    loading
  ) {
    return <LoadingState />;
  }

  if (!authenticated) {
    return <LoginState />;
  }

  if (
    error ||
    !identity ||
    !wallet
  ) {
    return (
      <ErrorState
        error={
          error ||
          "Energy wallet puudub."
        }
        onRetry={() => {
          void refresh();
        }}
      />
    );
  }

  return (
    <div className="min-w-0 space-y-8">
      <WalletHero
        wallet={wallet}
        identityName={
          identity.displayName
        }
        onRefresh={() => {
          void refresh();
        }}
      />

      <section className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.26em] text-neutral-400">
                Saldo jaotus
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-tight">
                Walleti päris seis
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
                Ostetud ja boonus-Energy on eraldi.
                Reserveeritud Energy ei ole teise
                tegevuse jaoks saadaval.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <BalanceCard
                label="Boonus"
                value={
                  wallet.availableBonus
                }
                helper="Tervitus-, test- või kompensatsiooni-Energy"
              />

              <BalanceCard
                label="Ostetud"
                value={
                  wallet.availablePaid
                }
                helper="Päriselt makstud Energy"
              />

              <BalanceCard
                label="Reserveeritud"
                value={
                  wallet.reservedTotal
                }
                helper="Poolelioleva tegevuse jaoks kinni"
              />
            </div>
          </section>

          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.26em] text-neutral-400">
                  Ajalugu
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight">
                  Energy ajalugu
                </h2>
              </div>

              <span className="w-fit rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-black text-neutral-600">
                {entries.length} sündmust
              </span>
            </div>

            {entries.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-6 text-center">
                <p className="font-black">
                  Energy ajalugu on tühi
                </p>

                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  Grandid, ostud, reserveeringud,
                  kasutamised, vabastamised ja
                  parandused ilmuvad siia ledger'i
                  sündmustena.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-black/5">
                {entries.map(
                  (entry) => (
                    <HistoryRow
                      key={entry.entryId}
                      entry={entry}
                    />
                  )
                )}
              </div>
            )}
          </section>

          <section className="rounded-[34px] border border-blue-100 bg-blue-50 p-6 shadow-sm md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-blue-600">
              Tulevane võimalus
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight text-blue-950">
              Energy ostmine ei ole veel avatud
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-900">
              Paketid, hinnad, makseteenus, receipt'id
              ja arved lisatakse eraldi kontrollitud
              etapis. Sellel lehel ei ole praegu
              ühtegi makset käivitavat nuppu.
            </p>

            <button
              type="button"
              disabled
              className="mt-5 cursor-not-allowed rounded-full bg-blue-950 px-6 py-3 text-sm font-black text-white opacity-45"
            >
              Ostmine tuleb hiljem
            </button>
          </section>
        </div>

        <aside className="min-w-0 space-y-5">
          <section className="rounded-[30px] border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">
              Aktiivne identiteet
            </p>

            <h2 className="mt-2 break-words text-2xl font-black text-emerald-950">
              {identity.displayName}
            </h2>

            <p className="mt-2 text-sm leading-6 text-emerald-950/75">
              Identiteeti vahetades laadib Energy
              vaade automaatselt selle identiteedi
              walleti ja ajaloo.
            </p>
          </section>

          <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-neutral-400">
              Saldoämbrid
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Ostetud ja boonus eraldi
            </h2>

            <div className="mt-4 space-y-3 text-sm leading-6 text-neutral-600">
              <p>
                Boonus-Energy kasutatakse tulevikus
                vabatahtlike lisavõimaluste
                proovimiseks ja kompensatsioonideks.
              </p>

              <p>
                Ostetud Energy jääb eraldi, et maksete,
                tagastuste ja tehniliste paranduste
                ajalugu oleks korrektne.
              </p>
            </div>
          </section>

          <section className="rounded-[30px] border border-amber-100 bg-amber-50 p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">
              Reserveeritud
            </p>

            <h2 className="mt-2 text-2xl font-black text-amber-950">
              {formatEnergy(
                wallet.reservedTotal
              )} Energy
            </h2>

            <p className="mt-2 text-sm leading-6 text-amber-950/75">
              Reserveeritud Energy on poolelioleva
              toimingu jaoks kinni. Reserve/commit/
              release tehingud lisatakse järgmises
              tehnilises etapis.
            </p>
          </section>

          <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-neutral-400">
              Selqiro tugi
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Parandused jäävad ajalukku
            </h2>

            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Tulevased admini parandused lisatakse
              uue ledger'i sündmusena. Olemasolevat
              saldot ega varasemat ajalugu ei muudeta
              otse.
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
}
