"use client";

import {
  LISTING_CREATE_CONTENT_TYPES,
  type ListingCreateContentType,
} from "../model/contentType";
import {
  DEFAULT_LIVE_ANIMAL_MARKET_COUNTRY_CODE,
  getEnabledLiveAnimalOfferCapabilities,
  getLiveAnimalOfferCapability,
  type LiveAnimalMarketCountryCode,
} from "../model/liveAnimalOfferCapabilities";

type ListingCreateContentTypeSelectorProps = {
  value: ListingCreateContentType;
  onChange: (
    value: ListingCreateContentType
  ) => void;
  marketCountryCode?:
    LiveAnimalMarketCountryCode;
};

const STANDARD_LISTING_OPTION = {
  value: LISTING_CREATE_CONTENT_TYPES.listing,
  label: "Tavaline kuulutus",
  description:
    "Ese, sõiduk, varuosa või muu tavapärane pakkumine.",
} as const;

export default function
ListingCreateContentTypeSelector({
  value,
  onChange,
  marketCountryCode =
    DEFAULT_LIVE_ANIMAL_MARKET_COUNTRY_CODE,
}: ListingCreateContentTypeSelectorProps) {
  const liveAnimalCapabilities =
    getEnabledLiveAnimalOfferCapabilities(
      marketCountryCode
    );

  const contentTypeOptions = [
    STANDARD_LISTING_OPTION,
    ...liveAnimalCapabilities.map(
      (capability) => ({
        value: capability.contentType,
        label: capability.label,
        description:
          capability.description,
      })
    ),
  ] satisfies readonly {
    value: ListingCreateContentType;
    label: string;
    description: string;
  }[];

  const liveAnimalCapability =
    getLiveAnimalOfferCapability(
      value,
      marketCountryCode
    );

  return (
    <section
      className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6"
      data-listing-create-live-animal-mode={
        liveAnimalCapability
          ? "active"
          : "inactive"
      }
      data-live-animal-species={
        liveAnimalCapability?.species
      }
      data-live-animal-market-country={
        liveAnimalCapability
          ?.marketCountryCode
      }
    >
      <fieldset>
        <legend className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
          Kuulutuse liik
        </legend>

        <h2 className="mt-2 text-2xl font-black tracking-tight">
          Mida soovid lisada?
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          Kõik valikud kasutavad sama
          rahulikku kuulutuse lisamise vormi.
          Valik määrab ainult vajalikud väljad
          ja turvalise avaldamislepingu.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {contentTypeOptions.map(
            (option) => {
              const selected =
                option.value === value;

              return (
                <label
                  key={option.value}
                  className="relative cursor-pointer"
                >
                  <input
                    type="radio"
                    name="listing-create-content-type"
                    value={option.value}
                    checked={selected}
                    onChange={() =>
                      onChange(
                        option.value
                      )
                    }
                    className="peer sr-only"
                  />

                  <span
                    className={[
                      "flex items-start justify-between gap-3 rounded-[22px] border p-4 transition",
                      "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-black",
                      selected
                        ? "border-amber-300 bg-amber-50 shadow-sm"
                        : "border-neutral-200 bg-[#fbfbfa] hover:border-neutral-300",
                    ].join(" ")}
                  >
                    <span className="min-w-0">
                      <span className="block text-base font-black">
                        {option.label}
                      </span>

                      <span className="mt-1 block text-sm leading-6 text-neutral-600">
                        {option.description}
                      </span>
                    </span>

                    <span
                      aria-hidden="true"
                      className={[
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        selected
                          ? "border-amber-500 bg-amber-400"
                          : "border-neutral-300 bg-white",
                      ].join(" ")}
                    >
                      {selected ? (
                        <span className="h-2 w-2 rounded-full bg-amber-950" />
                      ) : null}
                    </span>
                  </span>
                </label>
              );
            }
          )}
        </div>
      </fieldset>

      {liveAnimalCapability ? (
        <div
          role="status"
          className="mt-4 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4"
        >
          <p className="text-sm font-black text-amber-950">
            {
              liveAnimalCapability
                .selectedTitle
            }
          </p>

          <p className="mt-1 text-sm leading-6 text-amber-950/75">
            {
              liveAnimalCapability
                .selectedDescription
            }
          </p>
        </div>
      ) : null}
    </section>
  );
}
