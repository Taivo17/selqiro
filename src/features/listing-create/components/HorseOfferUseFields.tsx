"use client";

import {
  horseOfferTypeRequiresSpecificHorse,
} from "../model/horseOfferFields";
import {
  HORSE_OFFER_USE_FIELD_LIMITS,
  type HorseOfferUseFieldState,
  type SpecificHorseUseFieldState,
  type WantedHorseUsePreferenceState,
} from "../model/horseOfferUseFields";
import {
  type HorseOfferType,
} from "../model/horseOfferType";

type HorseOfferUseFieldsProps = {
  offerType: HorseOfferType;
  value: HorseOfferUseFieldState;
  onSpecificChange: (
    field: keyof SpecificHorseUseFieldState,
    value: string
  ) => void;
  onWantedChange: (
    field: keyof WantedHorseUsePreferenceState,
    value: string
  ) => void;
};

type TextInputProps = {
  label: string;
  value: string;
  placeholder: string;
  maxLength: number;
  onChange: (value: string) => void;
};

type TextAreaProps = TextInputProps & {
  rows: number;
};

function TextInput({
  label,
  value,
  placeholder,
  maxLength,
  onChange,
}: TextInputProps) {
  return (
    <label className="block w-full rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        maxLength={maxLength}
        className="mt-3 w-full bg-transparent text-base font-bold outline-none placeholder:text-neutral-300"
      />

      <span className="mt-2 block text-right text-xs font-black text-neutral-400">
        {value.length}/{maxLength}
      </span>
    </label>
  );
}

function TextArea({
  label,
  value,
  placeholder,
  maxLength,
  onChange,
  rows,
}: TextAreaProps) {
  return (
    <label className="block w-full rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </span>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className="mt-3 w-full resize-y bg-transparent text-base font-medium leading-7 outline-none placeholder:text-neutral-300"
      />

      <span className="mt-2 block text-right text-xs font-black text-neutral-400">
        {value.length}/{maxLength}
      </span>
    </label>
  );
}

export default function
HorseOfferUseFields({
  offerType,
  value,
  onSpecificChange,
  onWantedChange,
}: HorseOfferUseFieldsProps) {
  const requiresSpecificHorse =
    horseOfferTypeRequiresSpecificHorse(
      offerType
    );

  return (
    <section
      className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6"
      data-horse-use-field-mode={
        requiresSpecificHorse
          ? "specific"
          : "wanted"
      }
    >
      <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
        Kasutus ja sobivus
      </p>

      <h2 className="mt-2 text-2xl font-black tracking-tight">
        {requiresSpecificHorse
          ? "Kasutusala, väljaõpe ja sobivus"
          : "Millist hobust otsid?"}
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
        {requiresSpecificHorse
          ? "Lisa info, mis aitab huvilisel hinnata hobuse senist kasutust, väljaõpet ja sobivust. Kõik väljad on praegu valikulised."
          : "Kirjelda oma kasutus- ja väljaõppe-eelistusi. Need on otsingukriteeriumid, mitte väited juba valitud konkreetse hobuse kohta."}
      </p>

      {requiresSpecificHorse ? (
        <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
          <TextInput
            label="Kasutusala või distsipliin"
            value={value.specific.discipline}
            onChange={(nextValue) =>
              onSpecificChange(
                "discipline",
                nextValue
              )
            }
            placeholder="Näiteks harrastus, koolisõit või takistussõit"
            maxLength={
              HORSE_OFFER_USE_FIELD_LIMITS
                .discipline
            }
          />

          <TextArea
            label="Väljaõppe tase"
            value={
              value.specific.trainingLevel
            }
            onChange={(nextValue) =>
              onSpecificChange(
                "trainingLevel",
                nextValue
              )
            }
            placeholder="Kirjelda lühidalt hobuse senist väljaõpet..."
            maxLength={
              HORSE_OFFER_USE_FIELD_LIMITS
                .trainingLevel
            }
            rows={3}
          />

          <div className="md:col-span-2">
            <TextArea
              label="Sobivus"
              value={
                value.specific.suitability
              }
              onChange={(nextValue) =>
                onSpecificChange(
                  "suitability",
                  nextValue
                )
              }
              placeholder="Kirjelda, millise kogemuse ja eesmärgiga ratsanikule või kasutajale hobune sobib..."
              maxLength={
                HORSE_OFFER_USE_FIELD_LIMITS
                  .suitability
              }
              rows={5}
            />
          </div>
        </div>
      ) : (
        <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
          <TextInput
            label="Soovitud kasutusala või distsipliin"
            value={
              value.wanted
                .preferredDiscipline
            }
            onChange={(nextValue) =>
              onWantedChange(
                "preferredDiscipline",
                nextValue
              )
            }
            placeholder="Näiteks harrastus, koolisõit või matkamine"
            maxLength={
              HORSE_OFFER_USE_FIELD_LIMITS
                .discipline
            }
          />

          <TextArea
            label="Soovitud väljaõppe tase"
            value={
              value.wanted
                .preferredTrainingLevel
            }
            onChange={(nextValue) =>
              onWantedChange(
                "preferredTrainingLevel",
                nextValue
              )
            }
            placeholder="Kirjelda, millist väljaõppe taset eelistad..."
            maxLength={
              HORSE_OFFER_USE_FIELD_LIMITS
                .trainingLevel
            }
            rows={3}
          />

          <div className="md:col-span-2">
            <TextArea
              label="Kellele ja milleks hobust otsid?"
              value={value.wanted.intendedUse}
              onChange={(nextValue) =>
                onWantedChange(
                  "intendedUse",
                  nextValue
                )
              }
              placeholder="Kirjelda ratsaniku kogemust, eesmärki ja muid sobivuse eelistusi..."
              maxLength={
                HORSE_OFFER_USE_FIELD_LIMITS
                  .suitability
              }
              rows={5}
            />
          </div>
        </div>
      )}

      <p className="mt-4 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] px-4 py-3 text-xs leading-5 text-neutral-500">
        Kasutus- ja sobivusväljad on selles
        checkpoint&apos;is ainult lokaalne
        vormiolek. Midagi ei salvestata ega
        avaldata.
      </p>
    </section>
  );
}
