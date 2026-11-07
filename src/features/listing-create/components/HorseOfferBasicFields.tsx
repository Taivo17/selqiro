"use client";

import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import {
  HORSE_OFFER_BASIC_FIELD_LIMITS,
  HORSE_SEX_VALUES,
  horseOfferTypeRequiresSpecificHorse,
  type HorseOfferBasicFieldState,
  type HorseSex,
} from "../model/horseOfferFields";
import {
  getHorseOfferTypeOption,
  type HorseOfferType,
} from "../model/horseOfferType";

type HorseOfferBasicFieldName =
  keyof HorseOfferBasicFieldState;

type HorseOfferBasicFieldsProps = {
  offerType: HorseOfferType;
  value: HorseOfferBasicFieldState;
  onChange: (
    field: HorseOfferBasicFieldName,
    value: string
  ) => void;
};

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
  inputMode?: "text" | "numeric" | "decimal";
  type?: "text" | "number";
  min?: number;
  max?: number;
  step?: number;
};

function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  inputMode = "text",
  type = "text",
  min,
  max,
  step,
}: TextFieldProps) {
  const { language, r } = useMarketplaceTranslation();
  return (
    <label className="rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
        {r(label)}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)}
        placeholder={r(placeholder)}
        maxLength={type === "text"
            ? maxLength
            : undefined}
        inputMode={inputMode}
        min={min}
        max={max}
        step={step}
        className="mt-3 w-full bg-transparent text-base font-bold outline-none placeholder:text-neutral-300"
      />

      {r(type === "text" ? (
        <span className="mt-2 block text-right text-xs font-black text-neutral-400">
          {r(value.length)}/{r(maxLength)}
        </span>
      ) : null)}
    </label>
  );
}

export default function
HorseOfferBasicFields({
  offerType,
  value,
  onChange,
}: HorseOfferBasicFieldsProps) {
  const { language, r } = useMarketplaceTranslation();
  const offerTypeOption =
    getHorseOfferTypeOption(offerType);

  const requiresSpecificHorse =
    horseOfferTypeRequiresSpecificHorse(
      offerType
    );

  const currentYear =
    new Date().getFullYear();

  const sexOptions: readonly {
    value: HorseSex;
    label: string;
  }[] = requiresSpecificHorse
    ? [
        {
          value: HORSE_SEX_VALUES.mare,
          label: marketplaceMessage("horse.mare.67d254"),
        },
        {
          value:
            HORSE_SEX_VALUES.gelding,
          label: marketplaceMessage("horse.gelding.6a1963"),
        },
        {
          value:
            HORSE_SEX_VALUES.stallion,
          label: marketplaceMessage("horse.stallion.4dcb92"),
        },
        {
          value:
            HORSE_SEX_VALUES.unknown,
          label: marketplaceMessage("horse.unknown.4cfbb0"),
        },
      ]
    : [
        {
          value: HORSE_SEX_VALUES.mare,
          label: marketplaceMessage("horse.mare.67d254"),
        },
        {
          value:
            HORSE_SEX_VALUES.gelding,
          label: marketplaceMessage("horse.gelding.6a1963"),
        },
        {
          value:
            HORSE_SEX_VALUES.stallion,
          label: marketplaceMessage("horse.stallion.4dcb92"),
        },
      ];

  return (
    <section
      className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6"
      data-horse-basic-field-mode={requiresSpecificHorse
          ? "specific"
          : "wanted"}
    >
      <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
        {r(marketplaceMessage("horse.horse_details.80a75f"))}</p>

      <h2 className="mt-2 text-2xl font-black tracking-tight">
        {r(requiresSpecificHorse
          ? marketplaceMessage("horse.horse_basics.f81d1b")
          : marketplaceMessage("horse.wanted_horse_preferences.cc015b"))}
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
        {r(requiresSpecificHorse
          ? marketplaceMessage("horse.selected_value_start_with_the_horse_s_basic.684da1", { p0: String(offerTypeOption?.label || marketplaceMessage("horse.a_specific_horse_listing.dd69aa")) })
          : marketplaceMessage("horse.describe_your_main_preferences_for_now_a_wanted.8c3e81"))}
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {r(requiresSpecificHorse ? (
          <>
            <TextField
              label={r(marketplaceMessage("horse.horse_name.b4ca2f"))}
              value={value.horseName}
              onChange={(nextValue) =>
                onChange(
                  "horseName",
                  nextValue
                )}
              placeholder={r(marketplaceMessage("horse.for_example_star.ca696b"))}
              maxLength={HORSE_OFFER_BASIC_FIELD_LIMITS
                  .horseName}
            />

            <TextField
              label={r(marketplaceMessage("horse.year_of_birth.9b64d1"))}
              value={value.birthYear}
              onChange={(nextValue) =>
                onChange(
                  "birthYear",
                  nextValue
                )}
              placeholder={r(marketplaceMessage("horse.for_example_2017.414ad2"))}
              maxLength={4}
              inputMode="numeric"
              type="number"
              min={HORSE_OFFER_BASIC_FIELD_LIMITS
                  .minimumBirthYear}
              max={currentYear}
              step={1}
            />
          </>
        ) : null)}

        <label className="rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
            {r(requiresSpecificHorse
              ? marketplaceMessage("horse.sex.b95704")
              : marketplaceMessage("horse.preferred_sex.6d6d26"))}
          </span>

          <select
            value={value.sex}
            onChange={(event) =>
              onChange(
                "sex",
                event.target.value
              )}
            className="mt-3 w-full bg-transparent text-base font-bold outline-none"
          >
            <option value="">
              {r(requiresSpecificHorse
                ? marketplaceMessage("horse.select_sex.3b1dc2")
                : marketplaceMessage("horse.no_preference.4a9ac6"))}
            </option>

            {r(!requiresSpecificHorse && value.sex === "unknown" ? (
              <option value="unknown">{r(marketplaceMessage("horse.unknown_saved_value.2e3d0d"))}</option>
            ) : null)}

            {r(sexOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {r(option.label)}
              </option>
            )))}
          </select>
        </label>

        <TextField
          label={r(requiresSpecificHorse
              ? marketplaceMessage("horse.breed.482c80")
              : marketplaceMessage("horse.preferred_breed.803189"))}
          value={value.breed}
          onChange={(nextValue) =>
            onChange("breed", nextValue)}
          placeholder={r(requiresSpecificHorse
              ? marketplaceMessage("horse.for_example_estonian_sport_horse.2db345")
              : marketplaceMessage("horse.for_example_estonian_sport_horse_or_no_preference.c475c6"))}
          maxLength={HORSE_OFFER_BASIC_FIELD_LIMITS
              .breed}
        />

        {r(requiresSpecificHorse ? (
          <>
            <TextField
              label={r(marketplaceMessage("horse.colour.fba70e"))}
              value={value.color}
              onChange={(nextValue) =>
                onChange(
                  "color",
                  nextValue
                )}
              placeholder={r(marketplaceMessage("horse.for_example_bay.820e1d"))}
              maxLength={HORSE_OFFER_BASIC_FIELD_LIMITS
                  .color}
            />

            <TextField
              label={r(marketplaceMessage("horse.height_at_withers_cm.8c6acf"))}
              value={value.heightCm}
              onChange={(nextValue) =>
                onChange(
                  "heightCm",
                  nextValue
                )}
              placeholder={r(marketplaceMessage("horse.for_example_168.0ce893"))}
              maxLength={5}
              inputMode="decimal"
              type="number"
              min={1}
              max={HORSE_OFFER_BASIC_FIELD_LIMITS
                  .maximumHeightCm}
              step={0.1}
            />
          </>
        ) : null)}
      </div>

      <p className="mt-4 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] px-4 py-3 text-xs leading-5 text-neutral-500">
        {r(marketplaceMessage("horse.a_specific_horse_listing_describes_the_horse_offered.34d625"))}</p>
    </section>
  );
}
