"use client";

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
  return (
    <label className="rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        maxLength={
          type === "text"
            ? maxLength
            : undefined
        }
        inputMode={inputMode}
        min={min}
        max={max}
        step={step}
        className="mt-3 w-full bg-transparent text-base font-bold outline-none placeholder:text-neutral-300"
      />

      {type === "text" ? (
        <span className="mt-2 block text-right text-xs font-black text-neutral-400">
          {value.length}/{maxLength}
        </span>
      ) : null}
    </label>
  );
}

export default function
HorseOfferBasicFields({
  offerType,
  value,
  onChange,
}: HorseOfferBasicFieldsProps) {
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
          label: "Mära",
        },
        {
          value:
            HORSE_SEX_VALUES.gelding,
          label: "Ruun",
        },
        {
          value:
            HORSE_SEX_VALUES.stallion,
          label: "Täkk",
        },
        {
          value:
            HORSE_SEX_VALUES.unknown,
          label: "Pole teada",
        },
      ]
    : [
        {
          value: HORSE_SEX_VALUES.mare,
          label: "Mära",
        },
        {
          value:
            HORSE_SEX_VALUES.gelding,
          label: "Ruun",
        },
        {
          value:
            HORSE_SEX_VALUES.stallion,
          label: "Täkk",
        },
      ];

  return (
    <section
      className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6"
      data-horse-basic-field-mode={
        requiresSpecificHorse
          ? "specific"
          : "wanted"
      }
    >
      <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
        Hobuse andmed
      </p>

      <h2 className="mt-2 text-2xl font-black tracking-tight">
        {requiresSpecificHorse
          ? "Hobuse põhiandmed"
          : "Otsitava hobuse eelistused"}
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
        {requiresSpecificHorse
          ? `Valitud on ${offerTypeOption?.label || "konkreetse hobuse pakkumine"}. Lisa esmalt hobuse põhiandmed. Kõiki valikulisi välju saab hiljem täiendada.`
          : "Kirjelda praegu ainult põhilisi eelistusi. Konkreetse hobuse nime, sünniaastat, värvust ega turjakõrgust selles otsingupakkumises ei küsita."}
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {requiresSpecificHorse ? (
          <>
            <TextField
              label="Hobuse nimi"
              value={value.horseName}
              onChange={(nextValue) =>
                onChange(
                  "horseName",
                  nextValue
                )
              }
              placeholder="Näiteks Täheke"
              maxLength={
                HORSE_OFFER_BASIC_FIELD_LIMITS
                  .horseName
              }
            />

            <TextField
              label="Sünniaasta"
              value={value.birthYear}
              onChange={(nextValue) =>
                onChange(
                  "birthYear",
                  nextValue
                )
              }
              placeholder="Näiteks 2017"
              maxLength={4}
              inputMode="numeric"
              type="number"
              min={
                HORSE_OFFER_BASIC_FIELD_LIMITS
                  .minimumBirthYear
              }
              max={currentYear}
              step={1}
            />
          </>
        ) : null}

        <label className="rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
            {requiresSpecificHorse
              ? "Sugu"
              : "Eelistatud sugu"}
          </span>

          <select
            value={value.sex}
            onChange={(event) =>
              onChange(
                "sex",
                event.target.value
              )
            }
            className="mt-3 w-full bg-transparent text-base font-bold outline-none"
          >
            <option value="">
              {requiresSpecificHorse
                ? "Vali sugu"
                : "Pole eelistust"}
            </option>

            {sexOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <TextField
          label={
            requiresSpecificHorse
              ? "Tõug"
              : "Eelistatud tõug"
          }
          value={value.breed}
          onChange={(nextValue) =>
            onChange("breed", nextValue)
          }
          placeholder={
            requiresSpecificHorse
              ? "Näiteks Eesti sporthobune"
              : "Näiteks Eesti sporthobune või pole eelistust"
          }
          maxLength={
            HORSE_OFFER_BASIC_FIELD_LIMITS
              .breed
          }
        />

        {requiresSpecificHorse ? (
          <>
            <TextField
              label="Värvus"
              value={value.color}
              onChange={(nextValue) =>
                onChange(
                  "color",
                  nextValue
                )
              }
              placeholder="Näiteks kõrb"
              maxLength={
                HORSE_OFFER_BASIC_FIELD_LIMITS
                  .color
              }
            />

            <TextField
              label="Turjakõrgus (cm)"
              value={value.heightCm}
              onChange={(nextValue) =>
                onChange(
                  "heightCm",
                  nextValue
                )
              }
              placeholder="Näiteks 168"
              maxLength={5}
              inputMode="decimal"
              type="number"
              min={1}
              max={
                HORSE_OFFER_BASIC_FIELD_LIMITS
                  .maximumHeightCm
              }
              step={0.1}
            />
          </>
        ) : null}
      </div>

      <p className="mt-4 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] px-4 py-3 text-xs leading-5 text-neutral-500">
        Need väljad on selles checkpoint&apos;is
        ainult lokaalne vormiolek. Midagi ei
        salvestata ega avaldata.
      </p>
    </section>
  );
}
