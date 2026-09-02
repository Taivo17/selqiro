"use client";

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
    label: "Kindel summa",
    description: "Kuvatakse ühe konkreetse summana.",
  },
  {
    value: "from",
    label: "Alates",
    description: "Kuvatakse alates-summana.",
  },
  {
    value: "contact",
    label: "Kokkuleppel",
    description: "Summat ei ole vaja sisestada.",
  },
];

const WANTED_BUDGET_OPTIONS: ChoiceOption<HorseWantedBudgetMode>[] = [
  {
    value: "maximum",
    label: "Eelarve kuni",
    description: "Sisestad maksimaalse ostueelarve.",
  },
  {
    value: "contact",
    label: "Eelarve on paindlik",
    description: "Kindlat ülempiiri ei kuvata.",
  },
];

const PERIOD_OPTIONS: {
  value: HorseRecurringPricePeriod;
  label: string;
}[] = [
  {
    value: "day",
    label: "päev",
  },
  {
    value: "week",
    label: "nädal",
  },
  {
    value: "month",
    label: "kuu",
  },
  {
    value: "agreed_period",
    label: "kokkulepitud periood",
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
  const columnClass =
    options.length === 2
      ? "sm:grid-cols-2"
      : "sm:grid-cols-3";

  return (
    <fieldset>
      <legend className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
        {legend}
      </legend>

      <div
        className={`mt-3 grid gap-3 ${columnClass}`}
      >
        {options.map((option) => {
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
                  onChange(option.value)
                }
                className="sr-only"
              />

              <span className="block text-sm font-black text-neutral-900">
                {option.label}
              </span>

              <span className="mt-1 block text-xs leading-5 text-neutral-500">
                {option.description}
              </span>
            </label>
          );
        })}
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
  return (
    <label className="block rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
        {label}
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
          placeholder="Näiteks 3500"
          maxLength={
            HORSE_OFFER_MONEY_INPUT_MAX_LENGTH
          }
          className="min-w-0 flex-1 bg-transparent text-lg font-black outline-none placeholder:text-neutral-300"
        />

        <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm font-black text-neutral-600">
          EUR
        </span>
      </div>

      <span className="mt-2 block text-right text-xs font-black text-neutral-400">
        {value.length}/
        {HORSE_OFFER_MONEY_INPUT_MAX_LENGTH}
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
  return (
    <label className="block rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
        Tasu periood
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target
              .value as HorseRecurringPricePeriod
          )
        }
        className="mt-3 w-full bg-transparent text-base font-black outline-none"
      >
        {PERIOD_OPTIONS.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
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
  const amountVisible =
    value.mode !== "contact";

  return (
    <>
      <h2 className="mt-2 text-2xl font-black tracking-tight">
        {title}
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
        {description}
      </p>

      <div className="mt-5">
        <ChoiceCards
          legend="Kuidas tasu kuvatakse?"
          value={value.mode}
          options={SELLER_PRICE_OPTIONS}
          onChange={(mode) =>
            onChange({
              branch,
              patch: {
                mode,
              },
            })
          }
        />
      </div>

      {amountVisible ? (
        <div
          className={`mt-4 grid items-start gap-4 ${
            showPeriod
              ? "md:grid-cols-2"
              : ""
          }`}
        >
          <AmountField
            label={amountLabel}
            value={value.amount}
            onChange={(amount) =>
              onChange({
                branch,
                patch: {
                  amount,
                },
              })
            }
          />

          {showPeriod ? (
            <PeriodField
              value={
                value.period
                ?? "month"
              }
              onChange={(period) =>
                onChange({
                  branch,
                  patch: {
                    period,
                  },
                })
              }
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export default function
HorseOfferPriceFields({
  offerType,
  value,
  onChange,
}: HorseOfferPriceFieldsProps) {
  if (offerType === "free_transfer") {
    return (
      <section
        className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6"
        data-horse-price-field-mode="free"
      >
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
          Hind ja tingimused
        </p>

        <h2 className="mt-2 text-2xl font-black tracking-tight">
          Tasuta üleandmine
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          Selle pakkumise liigi puhul
          hinda ega eelarvet ei sisestata.
          Hilisem salvestusleping peab
          kasutama tasuta hinna tüüpi ja
          jätma summa tühjaks.
        </p>

        <p className="mt-5 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
          Hind: tasuta
        </p>
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
          Eelarve
        </p>

        <h2 className="mt-2 text-2xl font-black tracking-tight">
          Ostueelarve
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          Kirjelda enda ostueelarvet.
          See on otsija eelarve, mitte
          müüja hind.
        </p>

        <div className="mt-5">
          <ChoiceCards
            legend="Kuidas eelarve kuvatakse?"
            value={value.wanted.mode}
            options={WANTED_BUDGET_OPTIONS}
            onChange={(mode) =>
              onChange({
                branch: "wanted",
                patch: {
                  mode,
                },
              })
            }
          />
        </div>

        {amountVisible ? (
          <div className="mt-4">
            <AmountField
              label="Maksimaalne eelarve"
              value={value.wanted.amount}
              onChange={(amount) =>
                onChange({
                  branch: "wanted",
                  patch: {
                    amount,
                  },
                })
              }
            />
          </div>
        ) : null}

        <p className="mt-4 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] px-4 py-3 text-xs leading-5 text-neutral-500">
          Tulevane andmeleping peab
          eelarve tähenduse hoidma müüja
          hinnast eraldi. Seda ei tohi
          vaikides salvestada tavalise
          müügihinnana.
        </p>
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
          title: "Müügihind",
          description:
            "Määra müügihind või jäta hind kokkuleppele.",
          amountLabel: "Müügihind",
          showPeriod: false,
        }
      : offerType === "lease"
        ? {
            title: "Renditasu",
            description:
              "Määra renditasu ja summa periood või jäta tasu kokkuleppele.",
            amountLabel: "Renditasu",
            showPeriod: true,
          }
        : {
            title: "Kaasratsaniku tasu",
            description:
              "Määra kaasratsaniku tasu ja summa periood või jäta tasu kokkuleppele.",
            amountLabel: "Kaasratsaniku tasu",
            showPeriod: true,
          };

  return (
    <section
      className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6"
      data-horse-price-field-mode={
        branch
      }
    >
      <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
        Hind ja tingimused
      </p>

      <SellerPriceFields
        branch={branch}
        title={config.title}
        description={
          config.description
        }
        amountLabel={
          config.amountLabel
        }
        showPeriod={
          config.showPeriod
        }
        value={value[branch]}
        onChange={onChange}
      />

      <p className="mt-4 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] px-4 py-3 text-xs leading-5 text-neutral-500">
        Eesti hobusepiloodis on valuuta
        praegu EUR. Selles checkpoint&apos;is
        on hind ja eelarve ainult lokaalne
        vormiolek ning midagi ei salvestata.
      </p>
    </section>
  );
}
