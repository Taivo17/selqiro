"use client";

import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import {
  HORSE_OFFER_MONEY_INPUT_MAX_LENGTH,
  isValidHorseMoneyInput,
  type HorseOfferPriceFieldChange,
  type HorseOfferPriceFieldState,
  type HorseRecurringPricePeriod,
  type HorseSellerPriceFieldState,
  type HorseSellerPriceMode,
  type HorseWantedBudgetMode,
} from "../model/horseOfferPriceFields";
import {
  type HorseOfferType,
} from "../model/horseOfferType";

type HorseOfferPriceFieldsProps = {
  offerType: HorseOfferType;
  value: HorseOfferPriceFieldState;
  onChange: (
    change: HorseOfferPriceFieldChange
  ) => void;
};

type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  description: string;
};

const SELLER_PRICE_OPTIONS: ChoiceOption<HorseSellerPriceMode>[] = [
  {
    value: "fixed",
    label: marketplaceMessage("horse.fixed_amount.6f753f"),
    description: marketplaceMessage("horse.shown_as_one_fixed_amount.4d25eb"),
  },
  {
    value: "from",
    label: marketplaceMessage("horse.from.661c2a"),
    description: marketplaceMessage("horse.shown_as_a_starting_amount.4532e5"),
  },
  {
    value: "contact",
    label: marketplaceMessage("horse.by_agreement.3bd541"),
    description: marketplaceMessage("horse.no_amount_is_required.67d525"),
  },
];

const WANTED_BUDGET_OPTIONS: ChoiceOption<HorseWantedBudgetMode>[] = [
  {
    value: "maximum",
    label: marketplaceMessage("horse.maximum_budget.12732b"),
    description: marketplaceMessage("horse.enter_your_maximum_purchase_budget.54ffd3"),
  },
  {
    value: "contact",
    label: marketplaceMessage("horse.flexible_budget.20da6f"),
    description: marketplaceMessage("horse.no_fixed_maximum_is_shown.f28c7c"),
  },
];

const PERIOD_OPTIONS: {
  value: HorseRecurringPricePeriod;
  label: string;
}[] = [
  {
    value: "day",
    label: marketplaceMessage("horse.day.1e9bc5"),
  },
  {
    value: "week",
    label: marketplaceMessage("horse.week.4c3fce"),
  },
  {
    value: "month",
    label: marketplaceMessage("horse.period.month"),
  },
  {
    value: "agreed_period",
    label: marketplaceMessage("horse.agreed_period.879bc3"),
  },
];

function ChoiceCards<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: ChoiceOption<T>[];
  onChange: (value: T) => void;
}) {
  const { language, r } = useMarketplaceTranslation();
  const columnClass =
    options.length === 2
      ? "sm:grid-cols-2"
      : "sm:grid-cols-3";

  return (
    <fieldset>
      <legend className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
        {r(legend)}
      </legend>

      <div
        className={`mt-3 grid gap-3 ${columnClass}`}
      >
        {r(options.map((option) => {
          const selected =
            option.value === value;

          return (
            <label
              key={option.value}
              className={`cursor-pointer rounded-[18px] border p-4 transition ${
                selected
                  ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500"
                  : "border-neutral-200 bg-[#fbfbfa]"
              }`}
            >
              <input
                type="radio"
                value={option.value}
                checked={selected}
                onChange={() =>
                  onChange(option.value)}
                className="sr-only"
              />

              <span className="block text-sm font-black text-neutral-900">
                {r(option.label)}
              </span>

              <span className="mt-1 block text-xs leading-5 text-neutral-500">
                {r(option.description)}
              </span>
            </label>
          );
        }))}
      </div>
    </fieldset>
  );
}

function AmountField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { language, r } = useMarketplaceTranslation();
  return (
    <label className="block rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
        {r(label)}
      </span>

      <div className="mt-3 flex items-center gap-3">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => {
            const nextValue =
              event.target.value;

            if (
              isValidHorseMoneyInput(
                nextValue
              )
            ) {
              onChange(nextValue);
            }
          }}
          placeholder={r(marketplaceMessage("horse.for_example_3500.ea849f"))}
          maxLength={HORSE_OFFER_MONEY_INPUT_MAX_LENGTH}
          className="min-w-0 flex-1 bg-transparent text-lg font-black outline-none placeholder:text-neutral-300"
        />

        <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm font-black text-neutral-600">
          EUR
        </span>
      </div>

      <span className="mt-2 block text-right text-xs font-black text-neutral-400">
        {r(value.length)}/
        {r(HORSE_OFFER_MONEY_INPUT_MAX_LENGTH)}
      </span>
    </label>
  );
}

function PeriodField({
  value,
  onChange,
}: {
  value: HorseRecurringPricePeriod;
  onChange: (
    value: HorseRecurringPricePeriod
  ) => void;
}) {
  const { language, r } = useMarketplaceTranslation();
  return (
    <label className="block rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
        {r(marketplaceMessage("horse.payment_period.766676"))}</span>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target
              .value as HorseRecurringPricePeriod
          )}
        className="mt-3 w-full bg-transparent text-base font-black outline-none"
      >
        {r(PERIOD_OPTIONS.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {r(option.label)}
          </option>
        )))}
      </select>
    </label>
  );
}

function SellerPriceFields({
  branch,
  title,
  description,
  amountLabel,
  showPeriod,
  value,
  onChange,
}: {
  branch: "sale" | "lease" | "coRider";
  title: string;
  description: string;
  amountLabel: string;
  showPeriod: boolean;
  value: HorseSellerPriceFieldState;
  onChange: (
    change: HorseOfferPriceFieldChange
  ) => void;
}) {
  const { language, r } = useMarketplaceTranslation();
  const amountVisible =
    value.mode !== "contact";

  return (
    <>
      <h2 className="mt-2 text-2xl font-black tracking-tight">
        {r(title)}
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
        {r(description)}
      </p>

      <div className="mt-5">
        <ChoiceCards
          legend={marketplaceMessage("horse.how_should_the_fee_be_displayed.f84b27")}
          value={value.mode}
          options={SELLER_PRICE_OPTIONS}
          onChange={(mode) =>
            onChange({
              branch,
              patch: {
                mode,
              },
            })}
        />
      </div>

      {r(amountVisible ? (
        <div
          className={`mt-4 grid items-start gap-4 ${
            showPeriod
              ? "md:grid-cols-2"
              : ""
          }`}
        >
          <AmountField
            label={r(amountLabel)}
            value={value.amount}
            onChange={(amount) =>
              onChange({
                branch,
                patch: {
                  amount,
                },
              })}
          />

          {r(showPeriod ? (
            <PeriodField
              value={value.period
                ?? "month"}
              onChange={(period) =>
                onChange({
                  branch,
                  patch: {
                    period,
                  },
                })}
            />
          ) : null)}
        </div>
      ) : null)}
    </>
  );
}

export default function
HorseOfferPriceFields({
  offerType,
  value,
  onChange,
}: HorseOfferPriceFieldsProps) {
  const { language, r } = useMarketplaceTranslation();
  if (offerType === "free_transfer") {
    return (
      <section
        className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6"
        data-horse-price-field-mode="free"
      >
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
          {r(marketplaceMessage("horse.price_and_terms.4107b0"))}</p>

        <h2 className="mt-2 text-2xl font-black tracking-tight">
          {r(marketplaceMessage("horse.free_transfer.ccb86a"))}</h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          {r(marketplaceMessage("horse.this_listing_type_does_not_use_a_price.02606d"))}</p>

        <p className="mt-5 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
          {r(marketplaceMessage("horse.price_free.a82d74"))}</p>
      </section>
    );
  }

  if (offerType === "wanted") {
    const amountVisible =
      value.wanted.mode === "maximum";

    return (
      <section
        className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6"
        data-horse-price-field-mode="wanted"
      >
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
          {r(marketplaceMessage("horse.budget.b9d39f"))}</p>

        <h2 className="mt-2 text-2xl font-black tracking-tight">
          {r(marketplaceMessage("horse.purchase_budget.943f7e"))}</h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          {r(marketplaceMessage("horse.describe_your_purchase_budget_this_is_the_searcher.e651ba"))}</p>

        <div className="mt-5">
          <ChoiceCards
            legend={marketplaceMessage("horse.how_should_the_budget_be_displayed.5403fb")}
            value={value.wanted.mode}
            options={WANTED_BUDGET_OPTIONS}
            onChange={(mode) =>
              onChange({
                branch: "wanted",
                patch: {
                  mode,
                },
              })}
          />
        </div>

        {r(amountVisible ? (
          <div className="mt-4">
            <AmountField
              label={r(marketplaceMessage("horse.maximum_budget.75578d"))}
              value={value.wanted.amount}
              onChange={(amount) =>
                onChange({
                  branch: "wanted",
                  patch: {
                    amount,
                  },
                })}
            />
          </div>
        ) : null)}

        <p className="mt-4 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] px-4 py-3 text-xs leading-5 text-neutral-500">
          {r(marketplaceMessage("horse.the_purchase_budget_describes_the_searcher_s_means.494994"))}</p>
      </section>
    );
  }

  const branch =
    offerType === "sale"
      ? "sale"
      : offerType === "lease"
        ? "lease"
        : "coRider";

  const config =
    offerType === "sale"
      ? {
          title: marketplaceMessage("horse.sale_price.d5f34b"),
          description:
            marketplaceMessage("horse.set_a_sale_price_or_leave_it_open.e1aee6"),
          amountLabel: marketplaceMessage("horse.sale_price.d5f34b"),
          showPeriod: false,
        }
      : offerType === "lease"
        ? {
            title: marketplaceMessage("horse.lease_fee.2fa551"),
            description:
              marketplaceMessage("horse.set_a_lease_fee_and_payment_period_or.f81d9b"),
            amountLabel: marketplaceMessage("horse.lease_fee.2fa551"),
            showPeriod: true,
          }
        : {
            title: marketplaceMessage("horse.co_rider_fee.beb49d"),
            description:
              marketplaceMessage("horse.set_a_co_rider_fee_and_payment_period.3a16f2"),
            amountLabel: marketplaceMessage("horse.co_rider_fee.beb49d"),
            showPeriod: true,
          };

  return (
    <section
      className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6"
      data-horse-price-field-mode={branch}
    >
      <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
        {r(marketplaceMessage("horse.price_and_terms.4107b0"))}</p>

      <SellerPriceFields
        branch={branch}
        title={r(config.title)}
        description={r(config.description)}
        amountLabel={config.amountLabel}
        showPeriod={config.showPeriod}
        value={value[branch]}
        onChange={onChange}
      />

      <p className="mt-4 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] px-4 py-3 text-xs leading-5 text-neutral-500">
        {r(marketplaceMessage("horse.a_price_and_a_searcher_s_budget_have.a2ec71"))}</p>
    </section>
  );
}
