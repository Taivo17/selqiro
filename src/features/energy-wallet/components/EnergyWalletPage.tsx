"use client";

import { renderUiMessage } from "@/lib/i18n/interfaceMessage";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";
import { getCatalogTranslation, localeForLanguage, type TranslationParams } from "@/lib/i18n/useTranslation";
import type { Language } from "@/lib/i18n/translations";
import { energyUiMessages } from "@/lib/i18n/catalogs/energyUi";


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

function formatEnergy(value: number, uiLanguage: Language): string {
  return value.toLocaleString(localeForLanguage(uiLanguage));
}
function formatDateTime(value: string, uiLanguage: Language): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(localeForLanguage(uiLanguage), {
    dateStyle: "medium", timeStyle: "short",
  }).format(date);
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
  entry: EnergyLedgerEntry, uiLanguage: Language = "en"
): string {
  const t = (key: keyof typeof energyUiMessages.en, params?: TranslationParams) => getCatalogTranslation(uiLanguage, energyUiMessages, key, params);

  if (
    entry.feature ===
    "admin_test_energy"
  ) {
    return t("admin_test_energy");
  }

  return entry.feature
    .replace(/_/g, " ")
    .trim();
}

function historyTitle(
  entry: EnergyLedgerEntry, uiLanguage: Language = "en"
): string {
  const t = (key: keyof typeof energyUiMessages.en, params?: TranslationParams) => getCatalogTranslation(uiLanguage, energyUiMessages, key, params);

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
    return t("purchased_energy_added");
  }

  if (
    entry.eventType ===
    "bonus_grant"
  ) {
    return t("bonus_energy_added");
  }

  if (
    entry.eventType ===
    "reserve"
  ) {
    return t("energy_reserved");
  }

  if (
    entry.eventType ===
    "commit"
  ) {
    return t("energy_used");
  }

  if (
    entry.eventType ===
    "release"
  ) {
    return t("energy_released");
  }

  return t("energy_adjustment");
}

function historyAmount(
  entry: EnergyLedgerEntry, uiLanguage: Language
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
        getCatalogTranslation(uiLanguage, energyUiMessages, "amount_reserved", {amount: formatEnergy(amount, uiLanguage)}),
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
        `−${formatEnergy(amount, uiLanguage)}`,
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
        `+${formatEnergy(amount, uiLanguage)}`,
      tone: "plus",
    };
  }

  if (
    availableDelta >= 0
  ) {
    return {
      amount:
        `+${formatEnergy(availableDelta, uiLanguage)}`,
      tone: "plus",
    };
  }

  return {
    amount:
      `−${formatEnergy(
        Math.abs(
          availableDelta
        ), uiLanguage
      )}`,
    tone: "minus",
  };
}

function historyPresentation(
  entry: EnergyLedgerEntry, uiLanguage: Language = "en"
): HistoryPresentation {
  const purpose =
    metadataText(
      entry,
      "purpose"
    );

  const {
    amount,
    tone,
  } = historyAmount(entry, uiLanguage);

  return {
    title: historyTitle(entry, uiLanguage),
    meta: [
      purpose ||
        featureLabel(entry, uiLanguage),
      formatDateTime(
        entry.createdAt, uiLanguage
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
  const { language: uiLanguage } = useV2Translation(energyUiMessages);
  return (
    <div className="rounded-[22px] border border-black/5 bg-[#fbfbfa] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </p>

      <p className="mt-2 break-words text-3xl font-black">
        {formatEnergy(value, uiLanguage)}
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
  const { language: uiLanguage } = useV2Translation(energyUiMessages);

  const item =
    historyPresentation(entry, uiLanguage);

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
  const { t } = useV2Translation(energyUiMessages);

  return (
    <section className="rounded-[34px] border border-emerald-100 bg-emerald-50 p-8 text-center shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">
        {t("energy")} </p>

      <h1 className="mt-3 text-3xl font-black tracking-tight">
        {t("sign_in_to_view_your_wallet")} </h1>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-600">
        {t("energy_belongs_to_the_active_identity_s_wallet_its_balance_and_history_are_")} </p>

      <Link
        href="/auth"
        className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-black text-white"
      >
        {t("sign_in")} </Link>
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
  const { language: uiLanguage, t } = useV2Translation(energyUiMessages);

  return (
    <section className="rounded-[34px] border border-red-100 bg-red-50 p-8 text-center shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-red-700">
        {t("energy")} </p>

      <h1 className="mt-3 text-3xl font-black tracking-tight text-red-950">
        {t("could_not_load_energy_information")} </h1>

      <p className="mx-auto mt-3 max-w-2xl break-words text-sm leading-6 text-red-800">
        {renderUiMessage(uiLanguage, error)}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-6 rounded-full bg-red-950 px-6 py-3 text-sm font-black text-white"
      >
        {t("try_again")} </button>
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
  const { language: uiLanguage, t } = useV2Translation(energyUiMessages);

  return (
    <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-600">
            {t("energy")} </p>

          <h1 className="mt-3 break-words text-4xl font-black tracking-tight md:text-5xl">
            {t("energy_wallet")} </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-neutral-600">
            {t("energy_belongs_to_your_active_identity_this_page_shows_available_purchased_")} </p>

          <button
            type="button"
            onClick={onRefresh}
            className="mt-5 rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm font-black shadow-sm transition hover:border-neutral-300"
          >
            {t("refresh_information")} </button>
        </div>

        <div className="min-w-0 rounded-[26px] bg-neutral-950 p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
            {t("acting_as")} </p>

          <p className="mt-2 break-words text-2xl font-black">
            {identityName}
          </p>

          <div className="mt-5 rounded-[22px] bg-white/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
              {t("available")} </p>

            <p className="mt-2 break-words text-5xl font-black">
              {formatEnergy(
                wallet.availableTotal, uiLanguage
              )}
            </p>

            <p className="mt-1 text-sm text-white/60">
              {t("energy_ready_to_use")} </p>
          </div>

          <p className="mt-4 text-xs leading-5 text-white/45">
            {t("updated")}{" "}
            {formatDateTime(
              wallet.updatedAt, uiLanguage
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

export default function
EnergyWalletPage() {
  const { language: uiLanguage, t } = useV2Translation(energyUiMessages);

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
          t("no_energy_wallet_found")
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
          identity.displayName || t("active_identity")
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
                {t("balance_breakdown")} </p>

              <h2 className="mt-2 text-3xl font-black tracking-tight">
                {t("current_wallet_balance")} </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
                {t("purchased_and_bonus_energy_are_kept_separate_reserved_energy_is_unavailable")} </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <BalanceCard
                label={t("bonus")}
                value={
                  wallet.availableBonus
                }
                helper={t("welcome_test_or_compensation_energy")}
              />

              <BalanceCard
                label={t("purchased")}
                value={
                  wallet.availablePaid
                }
                helper={t("energy_you_have_paid_for")}
              />

              <BalanceCard
                label={t("reserved")}
                value={
                  wallet.reservedTotal
                }
                helper={t("held_for_a_pending_action")}
              />
            </div>
          </section>

          <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.26em] text-neutral-400">
                  {t("history")} </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight">
                  {t("energy_history")} </h2>
              </div>

              <span className="w-fit rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-black text-neutral-600">
                {entries.length}  {t("events")} </span>
            </div>

            {entries.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-6 text-center">
                <p className="font-black">
                  {t("your_energy_history_is_empty")} </p>

                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  {t("grants_purchases_reservations_use_releases_and_adjustments_appear_here_as_t")} </p>
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
              {t("coming_later")} </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight text-blue-950">
              {t("energy_purchases_are_not_available_yet")} </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-900">
              {t("packages_prices_payment_processing_receipts_and_invoices_will_be_introduced")} </p>

            <button
              type="button"
              disabled
              className="mt-5 cursor-not-allowed rounded-full bg-blue-950 px-6 py-3 text-sm font-black text-white opacity-45"
            >
              {t("purchases_coming_later")} </button>
          </section>
        </div>

        <aside className="min-w-0 space-y-5">
          <section className="rounded-[30px] border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">
              {t("active_identity")} </p>

            <h2 className="mt-2 break-words text-2xl font-black text-emerald-950">
              {identity.displayName || t("active_identity")}
            </h2>

            <p className="mt-2 text-sm leading-6 text-emerald-950/75">
              {t("switching_identities_automatically_loads_the_selected_identity_s_energy_wal")} </p>
          </section>

          <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-neutral-400">
              {t("balance_types")} </p>

            <h2 className="mt-2 text-2xl font-black">
              {t("purchased_and_bonus_kept_separate")} </h2>

            <div className="mt-4 space-y-3 text-sm leading-6 text-neutral-600">
              <p>
                {t("bonus_energy_will_be_used_for_trying_optional_features_and_for_compensation")} </p>

              <p>
                {t("purchased_energy_is_kept_separate_so_payments_refunds_and_technical_adjustm")} </p>
            </div>
          </section>

          <section className="rounded-[30px] border border-amber-100 bg-amber-50 p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">
              {t("reserved")} </p>

            <h2 className="mt-2 text-2xl font-black text-amber-950">
              {formatEnergy(
                wallet.reservedTotal, uiLanguage
              )}  {t("energy")} </h2>

            <p className="mt-2 text-sm leading-6 text-amber-950/75">
              {t("reserved_energy_is_held_for_a_pending_action_reserve_commit_and_release_tra")} </p>
          </section>

          <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-neutral-400">
              {t("selqiro_support")} </p>

            <h2 className="mt-2 text-2xl font-black">
              {t("adjustments_remain_in_the_history")} </h2>

            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {t("future_administrator_adjustments_will_appear_as_new_transaction_records_exi")} </p>
          </section>
        </aside>
      </section>
    </div>
  );
}
