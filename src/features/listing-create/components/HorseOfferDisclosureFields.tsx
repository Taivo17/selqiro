"use client";

import {
  horseOfferTypeRequiresSpecificHorse,
} from "../model/horseOfferFields";
import {
  HORSE_OFFER_DISCLOSURE_FIELD_LIMITS,
  type HorseOfferDisclosureFieldState,
  type SpecificHorseDisclosureFieldState,
  type WantedHorseDisclosurePreferenceState,
} from "../model/horseOfferDisclosureFields";
import {
  type HorseOfferType,
} from "../model/horseOfferType";

type HorseOfferDisclosureFieldsProps = {
  offerType: HorseOfferType;
  value: HorseOfferDisclosureFieldState;
  onSpecificChange: (
    field: keyof SpecificHorseDisclosureFieldState,
    value: string
  ) => void;
  onWantedChange: (
    field: keyof WantedHorseDisclosurePreferenceState,
    value: string
  ) => void;
};

type DisclosureTextAreaProps = {
  label: string;
  value: string;
  placeholder: string;
  maxLength: number;
  onChange: (value: string) => void;
};

function DisclosureTextArea({
  label,
  value,
  placeholder,
  maxLength,
  onChange,
}: DisclosureTextAreaProps) {
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
        rows={6}
        className="mt-3 w-full resize-y bg-transparent text-base font-medium leading-7 outline-none placeholder:text-neutral-300"
      />

      <span className="mt-2 block text-right text-xs font-black text-neutral-400">
        {value.length}/{maxLength}
      </span>
    </label>
  );
}

export default function
HorseOfferDisclosureFields({
  offerType,
  value,
  onSpecificChange,
  onWantedChange,
}: HorseOfferDisclosureFieldsProps) {
  const requiresSpecificHorse =
    horseOfferTypeRequiresSpecificHorse(
      offerType
    );

  return (
    <section
      className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6"
      data-horse-disclosure-field-mode={
        requiresSpecificHorse
          ? "specific"
          : "wanted"
      }
    >
      <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
        Tervis ja käitumine
      </p>

      <h2 className="mt-2 text-2xl font-black tracking-tight">
        {requiresSpecificHorse
          ? "Avaldaja teada olev info"
          : "Tervise ja käitumise eelistused"}
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
        {requiresSpecificHorse
          ? "Kirjelda enda teada olevat olulist tervise- ja käitumisinfot. Need on avaldaja lisatud kirjeldused, mitte Selqiro kontrollitud faktid ega veterinaarne hinnang."
          : "Kirjelda tervise ja käitumisega seotud eelistusi või vajadusi. Need on otsingukriteeriumid, mitte väited ühegi konkreetse hobuse kohta."}
      </p>

      {requiresSpecificHorse ? (
        <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
          <DisclosureTextArea
            label="Avaldaja teada olev terviseinfo"
            value={
              value.specific.healthNotes
            }
            onChange={(nextValue) =>
              onSpecificChange(
                "healthNotes",
                nextValue
              )
            }
            placeholder="Kirjelda teadaolevaid terviseaspekte, ravi- või hooldusvajadusi ja muud olulist infot..."
            maxLength={
              HORSE_OFFER_DISCLOSURE_FIELD_LIMITS
                .health
            }
          />

          <DisclosureTextArea
            label="Avaldaja tähelepanekud käitumise kohta"
            value={
              value.specific.behaviorNotes
            }
            onChange={(nextValue) =>
              onSpecificChange(
                "behaviorNotes",
                nextValue
              )
            }
            placeholder="Kirjelda käitumist käsitsemisel, transportimisel, karjas või treeningul ja muid olulisi tähelepanekuid..."
            maxLength={
              HORSE_OFFER_DISCLOSURE_FIELD_LIMITS
                .behavior
            }
          />
        </div>
      ) : (
        <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
          <DisclosureTextArea
            label="Tervisega seotud eelistused"
            value={
              value.wanted
                .healthPreferences
            }
            onChange={(nextValue) =>
              onWantedChange(
                "healthPreferences",
                nextValue
              )
            }
            placeholder="Kirjelda tervise, hooldusvajaduse või kasutuskoormusega seotud eelistusi..."
            maxLength={
              HORSE_OFFER_DISCLOSURE_FIELD_LIMITS
                .health
            }
          />

          <DisclosureTextArea
            label="Käitumisega seotud eelistused"
            value={
              value.wanted
                .behaviorPreferences
            }
            onChange={(nextValue) =>
              onWantedChange(
                "behaviorPreferences",
                nextValue
              )
            }
            placeholder="Kirjelda temperamendi, käsitsetavuse või treeningkäitumisega seotud eelistusi..."
            maxLength={
              HORSE_OFFER_DISCLOSURE_FIELD_LIMITS
                .behavior
            }
          />
        </div>
      )}

      <p className="mt-4 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] px-4 py-3 text-xs leading-5 text-neutral-500">
        {requiresSpecificHorse
          ? "Terviseinfo ei asenda sõltumatut veterinaarset hinnangut. Selqiro ei kinnita hobuse tervist, käitumist, diagnoose ega sobivust."
          : "Eelistused aitavad otsingut kirjeldada. Need ei kinnita ühegi konkreetse hobuse tervist, käitumist ega sobivust."}
      </p>
    </section>
  );
}
