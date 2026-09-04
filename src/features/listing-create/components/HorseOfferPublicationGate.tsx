"use client";

import {
  horseOfferTypeRequiresSpecificHorse,
} from "../model/horseOfferFields";
import {
  HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS,
  HORSE_OFFER_PUBLICATION_POLICY_KEYS,
  getHorseOfferPublicationConfirmationProgress,
  type HorseOfferPublicationConfirmationKey,
  type HorseOfferPublicationConfirmationState,
} from "../model/horseOfferPublicationGate";
import {
  type HorseOfferType,
} from "../model/horseOfferType";

type HorseOfferPublicationGateProps = {
  offerType: HorseOfferType;
  value: HorseOfferPublicationConfirmationState;
  onChange: (
    key: HorseOfferPublicationConfirmationKey,
    checked: boolean
  ) => void;
};

type ConfirmationDefinition = {
  key: HorseOfferPublicationConfirmationKey;
  title: string;
  description: string;
};

const POLICY_REQUIREMENTS = [
  {
    key: HORSE_OFFER_PUBLICATION_POLICY_KEYS
      .general,
    title:
      "Selqiro üldised kasutus- ja avaldamisreeglid",
    description:
      "Kehtiv nõustumine on vajalik avaliku sisu avaldamiseks.",
  },
  {
    key: HORSE_OFFER_PUBLICATION_POLICY_KEYS
      .horseEe,
    title:
      "Eesti hobusepakkumise avaldamise reeglid",
    description:
      "Kehtiv nõustumine on vajalik Eesti hobusepakkumise avaldamiseks.",
  },
] as const;

const SPECIFIC_CONFIRMATIONS:
  readonly ConfirmationDefinition[] = [
    {
      key:
        HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
          .ownerOrAuthorized,
      title:
        "Olen pakutava hobuse omanik või omaniku volitatud esindaja.",
      description:
        "Selqiro ei kontrolli seda kinnitust vaikimisi dokumendi alusel.",
    },
    {
      key:
        HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
          .horseIdentified,
      title:
        "Kinnitan, et pakutav hobune on nõuetekohaselt identifitseeritud.",
      description:
        "Kinnitus käib selle konkreetse hobuse kohta.",
    },
    {
      key:
        HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
          .passportAvailable,
      title:
        "Kinnitan, et pakutaval hobusel on nõuetekohane pass.",
      description:
        "Passi faili selles esimeses Eesti piloodis vaikimisi üles ei laadita.",
    },
  ];

function getCommonConfirmations(
  requiresSpecificHorse: boolean
): readonly ConfirmationDefinition[] {
  return [
    {
      key:
        HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
          .age18OrOver,
      title: "Olen vähemalt 18-aastane.",
      description:
        "See on avaldaja enda kinnitus; Selqiro ei tee selles voos vaikimisi ID-dokumendi kontrolli.",
    },
    {
      key:
        HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
          .informationAccurate,
      title:
        "Kinnitan, et esitatud info on minu parima teadmise järgi õige.",
      description:
        "Avaldaja vastutab kuulutuses esitatud andmete eest.",
    },
    {
      key:
        HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
          .transactionResponsibility,
      title: requiresSpecificHorse
        ? "Vastutan pakkumise ja tehinguga seotud kohustuste eest."
        : "Vastutan otsingukuulutuse ja võimaliku tehingu eest.",
      description: requiresSpecificHorse
        ? "See hõlmab dokumente, registritoiminguid, üleandmist ja võimaliku veo nõudeid."
        : "Selqiro ei ole võimaliku kokkuleppe ega tehingu pool.",
    },
    {
      key:
        HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
          .notForSlaughter,
      title:
        "Pakkumine ei ole tapmise eesmärgil.",
      description:
        "Keeld hõlmab tapamajja saatmist ning looma pakkumist või otsimist lihaks, nahaks, karusnahaks või muuks tapmise tulemusena saadavaks tooteks.",
    },
  ];
}

function ConfirmationRow({
  definition,
  checked,
  onChange,
}: {
  definition: ConfirmationDefinition;
  checked: boolean;
  onChange: (
    key: HorseOfferPublicationConfirmationKey,
    checked: boolean
  ) => void;
}) {
  return (
    <label
      className={[
        "flex cursor-pointer items-start gap-3 rounded-[18px] border p-4 transition",
        checked
          ? "border-amber-300 bg-amber-50"
          : "border-neutral-200 bg-white hover:border-neutral-300",
      ].join(" ")}
      data-horse-confirmation-key={
        definition.key
      }
    >
      <input
        type="checkbox"
        name={definition.key}
        checked={checked}
        onChange={(event) =>
          onChange(
            definition.key,
            event.target.checked
          )
        }
        className="mt-1 h-5 w-5 shrink-0 accent-amber-500"
      />

      <span className="min-w-0">
        <span className="block text-sm font-black leading-6 text-neutral-950">
          {definition.title}
        </span>

        <span className="mt-1 block text-xs leading-5 text-neutral-500">
          {definition.description}
        </span>
      </span>
    </label>
  );
}

export default function
HorseOfferPublicationGate({
  offerType,
  value,
  onChange,
}: HorseOfferPublicationGateProps) {
  const requiresSpecificHorse =
    horseOfferTypeRequiresSpecificHorse(
      offerType
    );

  const commonConfirmations =
    getCommonConfirmations(
      requiresSpecificHorse
    );

  const progress =
    getHorseOfferPublicationConfirmationProgress(
      offerType,
      value
    );

  const remainingCount =
    progress.requiredCount -
    progress.confirmedCount;

  return (
    <section
      className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6"
      data-horse-publication-gate-mode={
        requiresSpecificHorse
          ? "specific"
          : "wanted"
      }
      data-horse-publication-gate-local-complete={
        progress.complete
          ? "true"
          : "false"
      }
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
            Enne avaldamist
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight">
            Reeglid ja kinnitused
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
            Enne hobusepakkumise päris
            avaldamist peab kasutaja
            nõustuma kehtivate reeglitega
            ja andma pakkumise liigile
            vastavad faktilised kinnitused.
            AI ei saa neid sinu eest
            märkida.
          </p>
        </div>

        <span className="w-fit shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-900">
          UI leping · ei salvesta
        </span>
      </div>

      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="rounded-[22px] border border-neutral-200 bg-[#fbfbfa] p-4 sm:p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
            Reeglitega nõustumine
          </p>

          <h3 className="mt-2 text-lg font-black">
            Kaks nõutud reeglistikku
          </h3>

          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Täistekst ja sinu senine
            nõustumise olek ühendatakse
            järgmises etapis. Selles
            checkpoint&apos;is ei märgita
            reegleid nõustutuks.
          </p>

          <div className="mt-4 space-y-3">
            {POLICY_REQUIREMENTS.map(
              (policy) => (
                <article
                  key={policy.key}
                  className="rounded-[18px] border border-neutral-200 bg-white p-4"
                  data-policy-key={
                    policy.key
                  }
                  data-policy-status="not-connected"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black leading-6">
                        {policy.title}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-neutral-500">
                        {
                          policy.description
                        }
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-neutral-200 bg-[#fbfbfa] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-neutral-600">
                      Nõutud
                    </span>
                  </div>
                </article>
              )
            )}
          </div>

          <p className="mt-4 rounded-[18px] border border-neutral-200 bg-white px-4 py-3 text-xs leading-5 text-neutral-500">
            Hilisem avaldamisoperatsioon
            peab serveris kontrollima
            kehtiva dokumendi täpset
            versiooni ja sisu räsi. Ainult
            selle kaardi kuvamisest ei
            piisa.
          </p>
        </section>

        <fieldset className="rounded-[22px] border border-neutral-200 bg-[#fbfbfa] p-4 sm:p-5">
          <legend className="sr-only">
            Hobusepakkumise faktilised
            kinnitused
          </legend>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
                Faktilised kinnitused
              </p>

              <h3 className="mt-2 text-lg font-black">
                Märgi ainult see, mida saad
                ise kinnitada
              </h3>
            </div>

            <span className="w-fit shrink-0 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-black text-neutral-700">
              {progress.confirmedCount}/
              {progress.requiredCount}
              {" "}
              märgitud
            </span>
          </div>

          <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            Kõigi hobusepakkumiste kinnitused
          </p>

          <div className="mt-3 space-y-3">
            {commonConfirmations.map(
              (definition) => (
                <ConfirmationRow
                  key={definition.key}
                  definition={definition}
                  checked={
                    value[definition.key]
                  }
                  onChange={onChange}
                />
              )
            )}
          </div>

          {requiresSpecificHorse ? (
            <>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
                Konkreetse hobuse lisakinnitused
              </p>

              <div className="mt-3 space-y-3">
                {SPECIFIC_CONFIRMATIONS.map(
                  (definition) => (
                    <ConfirmationRow
                      key={
                        definition.key
                      }
                      definition={
                        definition
                      }
                      checked={
                        value[
                          definition.key
                        ]
                      }
                      onChange={onChange}
                    />
                  )
                )}
              </div>
            </>
          ) : (
            <p
              className="mt-5 rounded-[18px] border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950"
              data-horse-wanted-specific-confirmations="omitted"
            >
              Hobuse otsingukuulutuses ei
              küsita olematu konkreetse
              hobuse omandi,
              identifitseerimise ega passi
              kinnitusi.
            </p>
          )}
        </fieldset>
      </div>

      <div
        role="status"
        aria-live="polite"
        className={[
          "mt-4 flex flex-col gap-2 rounded-[20px] border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between",
          progress.complete
            ? "border-amber-200 bg-amber-50 text-amber-950"
            : "border-neutral-200 bg-[#fbfbfa] text-neutral-600",
        ].join(" ")}
      >
        <span className="font-semibold leading-6">
          {progress.complete
            ? "Kõik selle pakkumise lokaalsed kinnitused on märgitud."
            : `Märkimata on ${remainingCount} nõutud kinnitust.`}
        </span>

        <span className="shrink-0 text-xs font-black uppercase tracking-[0.12em]">
          Avaldamine pole ühendatud
        </span>
      </div>

      <p className="mt-4 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] px-4 py-3 text-xs leading-5 text-neutral-500">
        Need linnukesed on selles
        checkpoint&apos;is ainult lokaalne
        vormiolek. Neid ei salvestata,
        reeglitega nõustumist ei
        registreerita, muutumatut
        avaldamissündmust ei looda ning
        kuulutust ei avaldata.
      </p>
    </section>
  );
}
