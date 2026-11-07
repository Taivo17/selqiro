"use client";

import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
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
  const { language, r } = useMarketplaceTranslation();
  return (
    <label className="block w-full rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
        {r(label)}
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)}
        placeholder={r(placeholder)}
        maxLength={maxLength}
        className="mt-3 w-full bg-transparent text-base font-bold outline-none placeholder:text-neutral-300"
      />

      <span className="mt-2 block text-right text-xs font-black text-neutral-400">
        {r(value.length)}/{r(maxLength)}
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
  const { language, r } = useMarketplaceTranslation();
  return (
    <label className="block w-full rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
        {r(label)}
      </span>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(event.target.value)}
        placeholder={r(placeholder)}
        maxLength={maxLength}
        rows={rows}
        className="mt-3 w-full resize-y bg-transparent text-base font-medium leading-7 outline-none placeholder:text-neutral-300"
      />

      <span className="mt-2 block text-right text-xs font-black text-neutral-400">
        {r(value.length)}/{r(maxLength)}
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
  const { language, r } = useMarketplaceTranslation();
  const requiresSpecificHorse =
    horseOfferTypeRequiresSpecificHorse(
      offerType
    );

  return (
    <section
      className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6"
      data-horse-use-field-mode={requiresSpecificHorse
          ? "specific"
          : "wanted"}
    >
      <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
        {r(marketplaceMessage("horse.use_and_suitability.0528a6"))}</p>

      <h2 className="mt-2 text-2xl font-black tracking-tight">
        {r(requiresSpecificHorse
          ? marketplaceMessage("horse.use_training_and_suitability.405aeb")
          : marketplaceMessage("horse.what_kind_of_horse_are_you_looking_for.05cb42"))}
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
        {r(requiresSpecificHorse
          ? marketplaceMessage("horse.add_details_that_help_people_assess_the_horse.6f347d")
          : marketplaceMessage("horse.describe_your_use_and_training_preferences_these_are.fe33eb"))}
      </p>

      {r(requiresSpecificHorse ? (
        <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
          <TextInput
            label={r(marketplaceMessage("horse.use_or_discipline.af945a"))}
            value={value.specific.discipline}
            onChange={(nextValue) =>
              onSpecificChange(
                "discipline",
                nextValue
              )}
            placeholder={r(marketplaceMessage("horse.for_example_leisure_riding_dressage_or_show_jumping.d7204b"))}
            maxLength={HORSE_OFFER_USE_FIELD_LIMITS
                .discipline}
          />

          <TextArea
            label={r(marketplaceMessage("horse.training_level.02a5e6"))}
            value={value.specific.trainingLevel}
            onChange={(nextValue) =>
              onSpecificChange(
                "trainingLevel",
                nextValue
              )}
            placeholder={r(marketplaceMessage("horse.briefly_describe_the_horse_s_training_so_far.905907"))}
            maxLength={HORSE_OFFER_USE_FIELD_LIMITS
                .trainingLevel}
            rows={3}
          />

          <div className="md:col-span-2">
            <TextArea
              label={r(marketplaceMessage("horse.suitability.4a8410"))}
              value={value.specific.suitability}
              onChange={(nextValue) =>
                onSpecificChange(
                  "suitability",
                  nextValue
                )}
              placeholder={r(marketplaceMessage("horse.describe_the_experience_and_goals_of_a_rider.3a24ab"))}
              maxLength={HORSE_OFFER_USE_FIELD_LIMITS
                  .suitability}
              rows={5}
            />
          </div>
        </div>
      ) : (
        <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
          <TextInput
            label={r(marketplaceMessage("horse.preferred_use_or_discipline.21968b"))}
            value={value.wanted
                .preferredDiscipline}
            onChange={(nextValue) =>
              onWantedChange(
                "preferredDiscipline",
                nextValue
              )}
            placeholder={r(marketplaceMessage("horse.for_example_leisure_riding_dressage_or_trekking.c7d5ac"))}
            maxLength={HORSE_OFFER_USE_FIELD_LIMITS
                .discipline}
          />

          <TextArea
            label={r(marketplaceMessage("horse.preferred_training_level.d3d1ac"))}
            value={value.wanted
                .preferredTrainingLevel}
            onChange={(nextValue) =>
              onWantedChange(
                "preferredTrainingLevel",
                nextValue
              )}
            placeholder={r(marketplaceMessage("horse.describe_the_level_of_training_you_prefer.1321ea"))}
            maxLength={HORSE_OFFER_USE_FIELD_LIMITS
                .trainingLevel}
            rows={3}
          />

          <div className="md:col-span-2">
            <TextArea
              label={r(marketplaceMessage("horse.who_and_what_are_you_looking_for_a.25b351"))}
              value={value.wanted.intendedUse}
              onChange={(nextValue) =>
                onWantedChange(
                  "intendedUse",
                  nextValue
                )}
              placeholder={r(marketplaceMessage("horse.describe_the_rider_s_experience_goals_and_other.cbba7a"))}
              maxLength={HORSE_OFFER_USE_FIELD_LIMITS
                  .suitability}
              rows={5}
            />
          </div>
        </div>
      ))}

      <p className="mt-4 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] px-4 py-3 text-xs leading-5 text-neutral-500">
        {r(marketplaceMessage("horse.use_and_suitability_fields_describe_the_horse_offered.3419f6"))}</p>
    </section>
  );
}
