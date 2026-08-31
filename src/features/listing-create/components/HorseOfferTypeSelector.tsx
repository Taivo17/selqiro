"use client";

import {
  getHorseOfferTypeOption,
  HORSE_OFFER_TYPE_OPTIONS,
  type HorseOfferType,
} from "../model/horseOfferType";

type HorseOfferTypeSelectorProps = {
  value: HorseOfferType | null;
  onChange: (
    value: HorseOfferType
  ) => void;
};

export default function
HorseOfferTypeSelector({
  value,
  onChange,
}: HorseOfferTypeSelectorProps) {
  const selectedOption =
    getHorseOfferTypeOption(value);

  return (
    <section
      className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6"
      data-horse-offer-type={
        value || "unselected"
      }
    >
      <fieldset>
        <legend className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
          Hobusepakkumise liik
        </legend>

        <h2 className="mt-2 text-2xl font-black tracking-tight">
          Mida soovid teha?
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          Vali üks pakkumise liik. See
          määrab hiljem vajalikud
          hobuseväljad ja enne avaldamist
          kuvatavad kinnitused.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {HORSE_OFFER_TYPE_OPTIONS.map(
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
                    name="horse-offer-type"
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
                      "flex h-full min-h-[118px] items-start justify-between gap-3 rounded-[22px] border p-4 transition",
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

      <p
        role="status"
        className={[
          "mt-4 rounded-[20px] border px-4 py-3 text-sm leading-6",
          selectedOption
            ? "border-amber-200 bg-amber-50 font-semibold text-amber-950"
            : "border-neutral-200 bg-[#fbfbfa] text-neutral-600",
        ].join(" ")}
      >
        {selectedOption
          ? `Valitud: ${selectedOption.label}.`
          : "Pakkumise liik ei ole veel valitud."}
      </p>
    </section>
  );
}
