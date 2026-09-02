"use client";

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
    "Eesti",
  ].filter(Boolean);

  return (
    <section
      className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6"
      data-horse-location-field-mode={
        branch
      }
      data-horse-location-country-code={
        current.countryCode
      }
    >
      <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
        {wanted
          ? "Otsingupiirkond"
          : "Asukoht"}
      </p>

      <h2 className="mt-2 text-2xl font-black tracking-tight">
        {wanted
          ? "Kust hobust otsid?"
          : "Hobuse tegelik asukoht"}
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
        {wanted
          ? "Märgi Eesti linn, vald või piirkond, kust soovid hobust leida. See on otsingukriteerium, mitte ühe konkreetse hobuse tegelik asukoht."
          : "Märgi Eesti linn või vald ja maakond või piirkond, kus konkreetne hobune tegelikult asub."}
      </p>

      <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
        <div className="rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
            Riik
          </span>

          <div className="mt-3 flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
            <span className="text-base font-black text-neutral-950">
              Eesti
            </span>

            <span className="rounded-full border border-neutral-200 bg-[#fbfbfa] px-3 py-1 text-xs font-black text-neutral-600">
              {
                HORSE_OFFER_LOCATION_COUNTRY_CODE
              }
            </span>
          </div>

          <p className="mt-3 text-xs leading-5 text-neutral-500">
            Eesti hobusepiloodis on riik
            fikseeritud ja seda ei saa
            muuta.
          </p>
        </div>

        <div className="min-w-0 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
            {wanted
              ? "Soovitud linn või vald"
              : "Linn või vald"}
          </span>

          <div className="mt-3">
            <LocationAutocomplete
              key={branch}
              country="Estonia"
              searchScope="locality"
              value={
                current.cityOrMunicipality
              }
              placeholder={
                wanted
                  ? "Näiteks Paide või Tartu"
                  : "Näiteks Paide"
              }
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
              Alusta vähemalt kahe tähega.
              Kui sobivat tulemust ei ole,
              saad koha käsitsi sisestada.
            </span>

            <span className="shrink-0 font-black text-neutral-400">
              {
                current.cityOrMunicipality
                  .length
              }
              /
              {
                HORSE_OFFER_LOCATION_VALUE_MAX_LENGTH
              }
            </span>
          </div>
        </div>
      </div>

      <label className="mt-4 block rounded-[20px] border border-neutral-200 bg-[#fbfbfa] p-4">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
          {wanted
            ? "Soovitud maakond või piirkond"
            : "Maakond või piirkond"}
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
            })
          }
          placeholder={
            wanted
              ? "Näiteks Järvamaa või kogu Eesti"
              : "Näiteks Järvamaa"
          }
          maxLength={
            HORSE_OFFER_LOCATION_VALUE_MAX_LENGTH
          }
          className="mt-3 w-full bg-transparent text-base font-bold outline-none placeholder:text-neutral-300"
        />

        <span className="mt-2 block text-right text-xs font-black text-neutral-400">
          {current.region.length}/
          {
            HORSE_OFFER_LOCATION_VALUE_MAX_LENGTH
          }
        </span>
      </label>

      {hasVisibleArea ? (
        <p className="mt-4 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black leading-6 text-amber-950">
          {wanted
            ? "Valitud otsingupiirkond: "
            : "Hobuse asukoht: "}
          {visibleArea.join(" · ")}
        </p>
      ) : null}

      <p className="mt-4 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] px-4 py-3 text-xs leading-5 text-neutral-500">
        {wanted
          ? "Otsingupiirkonda hoitakse konkreetse hobuse asukohast eraldi ning seda ei tohi hiljem vaikides hobuse tegeliku asukohana salvestada. Selles checkpoint'is midagi ei salvestata ega avaldata."
          : "Täpset aadressi ega koordinaate selles vormietapis ei küsita. Avalik asukoht peab jääma linna või piirkonna tasemele. Selles checkpoint'is midagi ei salvestata ega avaldata."}
      </p>
    </section>
  );
}
