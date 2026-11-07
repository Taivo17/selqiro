"use client";

import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import LocationAutocomplete from "../../../../app/components/LocationAutocomplete";
import {
  HORSE_OFFER_LOCATION_COUNTRY_CODE,
  HORSE_OFFER_LOCATION_VALUE_MAX_LENGTH,
  getHorseOfferLocationBranch,
  limitHorseOfferLocationText,
  type HorseOfferLocationFieldChange,
  type HorseOfferLocationFieldState,
} from "../model/horseOfferLocationFields";
import {
  type HorseOfferType,
} from "../model/horseOfferType";

type HorseOfferLocationFieldsProps = {
  offerType: HorseOfferType;
  value: HorseOfferLocationFieldState;
  onChange: (
    change: HorseOfferLocationFieldChange
  ) => void;
};

export default function
HorseOfferLocationFields({
  offerType,
  value,
  onChange,
}: HorseOfferLocationFieldsProps) {
  const { language, r } = useMarketplaceTranslation();
  const branch =
    getHorseOfferLocationBranch(
      offerType
    );

  const wanted =
    branch === "wanted";

  const current =
    value[branch];

  const hasVisibleArea = Boolean(
    current.cityOrMunicipality.trim()
    || current.region.trim()
  );

  const visibleArea = [
    current.cityOrMunicipality.trim(),
    current.region.trim(),
    marketplaceMessage("service.estonia.ed7477"),
  ].filter(Boolean);

  return (
    <section
      className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6"
      data-horse-location-field-mode={branch}
      data-horse-location-country-code={current.countryCode}
    >
      <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
        {r(wanted
          ? marketplaceMessage("horse.search_area.6c28ce")
          : marketplaceMessage("service.location.b55f9b"))}
      </p>

      <h2 className="mt-2 text-2xl font-black tracking-tight">
        {r(wanted
          ? marketplaceMessage("horse.where_are_you_looking_for_a_horse.c9d4da")
          : marketplaceMessage("horse.horse_s_actual_location.1365c7"))}
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
        {r(wanted
          ? marketplaceMessage("horse.enter_the_estonian_town_municipality_or_region_where.f903e5")
          : marketplaceMessage("horse.enter_the_estonian_town_or_municipality_and_county.53d2c5"))}
      </p>

      <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
        <div className="rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
            {r(marketplaceMessage("service.country.8d7336"))}</span>

          <div className="mt-3 flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
            <span className="text-base font-black text-neutral-950">
              {r(marketplaceMessage("service.estonia.ed7477"))}</span>

            <span className="rounded-full border border-neutral-200 bg-[#fbfbfa] px-3 py-1 text-xs font-black text-neutral-600">
              {r(HORSE_OFFER_LOCATION_COUNTRY_CODE)}
            </span>
          </div>

          <p className="mt-3 text-xs leading-5 text-neutral-500">
            {r(marketplaceMessage("horse.the_country_is_fixed_for_the_estonian_horse.9a6a1d"))}</p>
        </div>

        <div className="min-w-0 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
            {r(wanted
              ? marketplaceMessage("horse.preferred_town_or_municipality.329702")
              : marketplaceMessage("horse.town_or_municipality.fd8f9e"))}
          </span>

          <div className="mt-3">
            <LocationAutocomplete
              language={language}
              key={branch}
              country="Estonia"
              searchScope="locality"
              value={current.cityOrMunicipality}
              placeholder={r(wanted
                  ? marketplaceMessage("horse.for_example_paide_or_tartu.e45b69")
                  : marketplaceMessage("service.for_example_paide.e3ac08"))}
              onTextChange={(nextValue) => {
                if (
                  nextValue.length
                  > HORSE_OFFER_LOCATION_VALUE_MAX_LENGTH
                ) {
                  return;
                }

                onChange({
                  branch,
                  patch: {
                    cityOrMunicipality:
                      nextValue,
                    region: "",
                  },
                });
              }}
              onSelect={(location) => {
                const countryCode =
                  String(
                    location.country_code
                    || ""
                  ).toUpperCase();

                if (
                  countryCode
                  && countryCode
                    !== HORSE_OFFER_LOCATION_COUNTRY_CODE
                ) {
                  return;
                }

                onChange({
                  branch,
                  patch: {
                    cityOrMunicipality:
                      limitHorseOfferLocationText(
                        location.city
                        || current.cityOrMunicipality
                      ),
                    region:
                      limitHorseOfferLocationText(
                        location.region
                        || ""
                      ),
                  },
                });
              }}
            />
          </div>

          <div className="mt-2 flex items-start justify-between gap-3 text-xs leading-5 text-neutral-500">
            <span>
              {r(marketplaceMessage("horse.enter_at_least_two_letters_if_no_suitable.17b5c6"))}</span>

            <span className="shrink-0 font-black text-neutral-400">
              {r(current.cityOrMunicipality
                  .length)}
              /
              {r(HORSE_OFFER_LOCATION_VALUE_MAX_LENGTH)}
            </span>
          </div>
        </div>
      </div>

      <label className="mt-4 block rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
          {r(wanted
            ? marketplaceMessage("horse.preferred_county_or_region.eaa159")
            : marketplaceMessage("horse.county_or_region.ad8882"))}
        </span>

        <input
          type="text"
          value={current.region}
          onChange={(event) =>
            onChange({
              branch,
              patch: {
                region:
                  limitHorseOfferLocationText(
                    event.target.value
                  ),
              },
            })}
          placeholder={r(wanted
              ? marketplaceMessage("horse.for_example_j_rva_county_or_all_of.04e38a")
              : marketplaceMessage("horse.for_example_j_rva_county.4d3ddc"))}
          maxLength={HORSE_OFFER_LOCATION_VALUE_MAX_LENGTH}
          className="mt-3 w-full bg-transparent text-base font-bold outline-none placeholder:text-neutral-300"
        />

        <span className="mt-2 block text-right text-xs font-black text-neutral-400">
          {r(current.region.length)}/
          {r(HORSE_OFFER_LOCATION_VALUE_MAX_LENGTH)}
        </span>
      </label>

      {r(hasVisibleArea ? (
        <p className="mt-4 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black leading-6 text-amber-950">
          {r(wanted
            ? marketplaceMessage("horse.selected_search_area.0cf361")
            : marketplaceMessage("horse.horse_location.2643c9"))}
          {r(visibleArea.join(" · "))}
        </p>
      ) : null)}

      <p className="mt-4 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] px-4 py-3 text-xs leading-5 text-neutral-500">
        {r(wanted
          ? marketplaceMessage("horse.the_search_area_describes_where_you_are_looking.a13196")
          : marketplaceMessage("horse.an_exact_address_or_coordinates_are_neither_shown.cd2b5b"))}
      </p>
    </section>
  );
}
