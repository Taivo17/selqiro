"use client";

import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
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
        rows={6}
        className="mt-3 w-full resize-y bg-transparent text-base font-medium leading-7 outline-none placeholder:text-neutral-300"
      />

      <span className="mt-2 block text-right text-xs font-black text-neutral-400">
        {r(value.length)}/{r(maxLength)}
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
  const { language, r } = useMarketplaceTranslation();
  const requiresSpecificHorse =
    horseOfferTypeRequiresSpecificHorse(
      offerType
    );

  return (
    <section
      className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6"
      data-horse-disclosure-field-mode={requiresSpecificHorse
          ? "specific"
          : "wanted"}
    >
      <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
        {r(marketplaceMessage("horse.health_and_behaviour.13313e"))}</p>

      <h2 className="mt-2 text-2xl font-black tracking-tight">
        {r(requiresSpecificHorse
          ? marketplaceMessage("horse.information_known_to_the_publisher.0a2df3")
          : marketplaceMessage("horse.health_and_behaviour_preferences.e0938d"))}
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
        {r(requiresSpecificHorse
          ? marketplaceMessage("horse.describe_significant_health_and_behaviour_information_you_know.dec600")
          : marketplaceMessage("horse.describe_your_health_and_behaviour_preferences_or_needs.293aab"))}
      </p>

      {r(requiresSpecificHorse ? (
        <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
          <DisclosureTextArea
            label={r(marketplaceMessage("horse.health_information_known_to_the_publisher.0f107f"))}
            value={value.specific.healthNotes}
            onChange={(nextValue) =>
              onSpecificChange(
                "healthNotes",
                nextValue
              )}
            placeholder={r(marketplaceMessage("horse.describe_known_health_aspects_treatment_or_care_needs.715dfe"))}
            maxLength={HORSE_OFFER_DISCLOSURE_FIELD_LIMITS
                .health}
          />

          <DisclosureTextArea
            label={r(marketplaceMessage("horse.publisher_s_behaviour_observations.cbfdcd"))}
            value={value.specific.behaviorNotes}
            onChange={(nextValue) =>
              onSpecificChange(
                "behaviorNotes",
                nextValue
              )}
            placeholder={r(marketplaceMessage("horse.describe_behaviour_during_handling_transport_turnout_or_training.515326"))}
            maxLength={HORSE_OFFER_DISCLOSURE_FIELD_LIMITS
                .behavior}
          />
        </div>
      ) : (
        <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
          <DisclosureTextArea
            label={r(marketplaceMessage("horse.health_preferences.189805"))}
            value={value.wanted
                .healthPreferences}
            onChange={(nextValue) =>
              onWantedChange(
                "healthPreferences",
                nextValue
              )}
            placeholder={r(marketplaceMessage("horse.describe_preferences_about_health_care_needs_or_workload.9775c1"))}
            maxLength={HORSE_OFFER_DISCLOSURE_FIELD_LIMITS
                .health}
          />

          <DisclosureTextArea
            label={r(marketplaceMessage("horse.behaviour_preferences.4d0ce4"))}
            value={value.wanted
                .behaviorPreferences}
            onChange={(nextValue) =>
              onWantedChange(
                "behaviorPreferences",
                nextValue
              )}
            placeholder={r(marketplaceMessage("horse.describe_preferences_about_temperament_handling_or_training_behaviour.f2ab93"))}
            maxLength={HORSE_OFFER_DISCLOSURE_FIELD_LIMITS
                .behavior}
          />
        </div>
      ))}

      <p className="mt-4 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] px-4 py-3 text-xs leading-5 text-neutral-500">
        {r(requiresSpecificHorse
          ? marketplaceMessage("horse.health_information_does_not_replace_an_independent_veterinary.902c6d")
          : marketplaceMessage("horse.preferences_help_describe_your_search_they_do_not.1a44f9"))}
      </p>
    </section>
  );
}
