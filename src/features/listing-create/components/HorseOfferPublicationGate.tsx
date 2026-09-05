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
  useHorseOfferPublicationPolicyStatus,
  type HorseOfferPublicationPolicyStatusPhase,
} from "../model/useHorseOfferPublicationPolicyStatus";
import {
  type HorseOfferType,
} from "../model/horseOfferType";
import {
  type PublicationPolicyStatus,
} from "../../../entities/publication-policy/model/types";

type HorseOfferPublicationGateProps = {
  offerType: HorseOfferType;
  value: HorseOfferPublicationConfirmationState;
  onConfirmAllChange: (
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

type PolicyRequirement =
  (typeof POLICY_REQUIREMENTS)[number];

type PolicyCardStatus =
  | "loading"
  | "accepted"
  | "not-accepted"
  | "missing"
  | "error";

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

function formatAcceptedAt(
  acceptedAt: string | null
): string | null {
  if (!acceptedAt) {
    return null;
  }

  const date = new Date(acceptedAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "et-EE",
    {
      dateStyle: "medium",
    }
  ).format(date);
}

function getPolicyCardStatus(
  phase: HorseOfferPublicationPolicyStatusPhase,
  policy: PublicationPolicyStatus | null
): PolicyCardStatus {
  if (phase === "loading") {
    return "loading";
  }

  if (phase === "error") {
    return "error";
  }

  if (phase === "empty" || !policy) {
    return "missing";
  }

  return policy.accepted
    ? "accepted"
    : "not-accepted";
}

function getPolicyBadge(
  status: PolicyCardStatus
): {
  label: string;
  className: string;
} {
  if (status === "accepted") {
    return {
      label: "Nõustutud",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  if (status === "not-accepted") {
    return {
      label: "Nõustumata",
      className:
        "border-amber-200 bg-amber-50 text-amber-900",
    };
  }

  if (status === "loading") {
    return {
      label: "Kontrollin",
      className:
        "border-neutral-200 bg-[#fbfbfa] text-neutral-600",
    };
  }

  if (status === "error") {
    return {
      label: "Viga",
      className:
        "border-rose-200 bg-rose-50 text-rose-800",
    };
  }

  return {
    label: "Andmed puuduvad",
    className:
      "border-rose-200 bg-rose-50 text-rose-800",
  };
}

function PolicyRequirementCard({
  requirement,
  policy,
  phase,
}: {
  requirement: PolicyRequirement;
  policy: PublicationPolicyStatus | null;
  phase: HorseOfferPublicationPolicyStatusPhase;
}) {
  const status = getPolicyCardStatus(
    phase,
    policy
  );
  const badge = getPolicyBadge(status);
  const acceptedAt = formatAcceptedAt(
    policy?.acceptedAt || null
  );

  return (
    <article
      className="rounded-[18px] border border-neutral-200 bg-white p-4"
      data-policy-key={requirement.key}
      data-policy-status={status}
      data-policy-version={
        policy?.policyVersion || undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black leading-6">
            {policy?.title || requirement.title}
          </p>

          <p className="mt-1 text-xs leading-5 text-neutral-500">
            {phase === "loading"
              ? "Kontrollin sinu senist nõustumise olekut."
              : policy?.summary || requirement.description}
          </p>

          {policy ? (
            <p className="mt-2 text-[11px] font-semibold leading-5 text-neutral-500">
              Versioon {policy.policyVersion}
              {policy.accepted && acceptedAt
                ? ` · nõustutud ${acceptedAt}`
                : ""}
            </p>
          ) : null}
        </div>

        <span
          className={[
            "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
            badge.className,
          ].join(" ")}
        >
          {badge.label}
        </span>
      </div>
    </article>
  );
}

function ConfirmationStatement({
  definition,
  index,
}: {
  definition: ConfirmationDefinition;
  index: number;
}) {
  return (
    <li
      className="flex items-start gap-3 rounded-[18px] border border-neutral-200 bg-white p-4"
      data-horse-confirmation-key={
        definition.key
      }
    >
      <span
        aria-hidden="true"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-xs font-black text-amber-900"
      >
        {index}
      </span>

      <span className="min-w-0">
        <span className="block text-sm font-black leading-6 text-neutral-950">
          {definition.title}
        </span>

        <span className="mt-1 block text-xs leading-5 text-neutral-500">
          {definition.description}
        </span>
      </span>
    </li>
  );
}

export default function
HorseOfferPublicationGate({
  offerType,
  value,
  onConfirmAllChange,
}: HorseOfferPublicationGateProps) {
  const policyStatus =
    useHorseOfferPublicationPolicyStatus();

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

  const aggregateChecked =
    progress.complete;

  const expectedPolicies =
    POLICY_REQUIREMENTS.map(
      (requirement) => ({
        requirement,
        policy:
          policyStatus.policies.find(
            (candidate) =>
              candidate.policyKey ===
              requirement.key
          ) || null,
      })
    );

  const acceptedPolicyCount =
    expectedPolicies.filter(
      ({ policy }) => policy?.accepted
    ).length;

  const missingPolicyCount =
    expectedPolicies.filter(
      ({ policy }) => !policy
    ).length;

  const incompleteReadyResponse =
    policyStatus.phase === "ready"
    && missingPolicyCount > 0;

  const showPolicyRetry =
    policyStatus.phase === "error"
    || policyStatus.phase === "empty"
    || incompleteReadyResponse;

  const policySummary = (() => {
    if (policyStatus.phase === "loading") {
      return "Kontrollin kahe nõutud reeglistiku olekut.";
    }

    if (
      policyStatus.phase === "error"
      || policyStatus.phase === "empty"
      || incompleteReadyResponse
    ) {
      return "Kõigi nõutud reeglistike olek pole praegu teada.";
    }

    if (
      acceptedPolicyCount ===
      POLICY_REQUIREMENTS.length
    ) {
      return "Mõlema nõutud reeglistikuga on varem nõustutud.";
    }

    if (acceptedPolicyCount === 1) {
      return "Ühe reeglistikuga on nõustutud; teine vajab enne avaldamist nõustumist.";
    }

    return "Mõlemad reeglistikud vajavad enne avaldamist nõustumist.";
  })();

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
      data-policy-status-request={
        policyStatus.phase
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
          Read-only · ei salvesta
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
            Sinu senine nõustumise olek
            loetakse turvaliselt kontolt.
            Selles etapis uusi nõustumisi
            ei salvestata.
          </p>

          <div className="mt-4 space-y-3">
            {expectedPolicies.map(
              ({ requirement, policy }) => (
                <PolicyRequirementCard
                  key={requirement.key}
                  requirement={requirement}
                  policy={policy}
                  phase={policyStatus.phase}
                />
              )
            )}
          </div>

          {showPolicyRetry ? (
            <div
              role={
                policyStatus.phase === "error"
                  ? "alert"
                  : "status"
              }
              className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900"
            >
              <p className="font-semibold">
                {policyStatus.phase === "error"
                  ? policyStatus.errorMessage
                  : "Nõutud reeglistike andmed ei ole täielikud."}
              </p>

              <button
                type="button"
                onClick={policyStatus.retry}
                className="mt-3 rounded-full border border-rose-300 bg-white px-4 py-2 text-xs font-black text-rose-900 transition hover:border-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
              >
                Proovi uuesti
              </button>
            </div>
          ) : null}

          <p
            role="status"
            aria-live="polite"
            className="mt-4 rounded-[18px] border border-neutral-200 bg-white px-4 py-3 text-xs font-semibold leading-5 text-neutral-600"
          >
            {policySummary}
          </p>

          <p className="mt-3 rounded-[18px] border border-neutral-200 bg-white px-4 py-3 text-xs leading-5 text-neutral-500">
            Hilisem nõustumis- ja
            avaldamisoperatsioon peab
            serveris kontrollima kehtiva
            dokumendi täpset versiooni ja
            sisu räsi. Ainult selle kaardi
            kuvamisest ei piisa.
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
                Loe kõik väited läbi
              </h3>
            </div>

            <span className="w-fit shrink-0 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-black text-neutral-700">
              {progress.requiredCount}
              {" "}
              väidet
            </span>
          </div>

          <p
            id="horse-offer-confirmation-help"
            className="mt-3 text-sm leading-6 text-neutral-600"
          >
            Loe kõik allolevad väited läbi.
            Seejärel saad need ühe linnukesega
            kinnitada.
          </p>

          <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            Kõigi hobusepakkumiste väited
          </p>

          <ol className="mt-3 space-y-3">
            {commonConfirmations.map(
              (definition, index) => (
                <ConfirmationStatement
                  key={definition.key}
                  definition={definition}
                  index={index + 1}
                />
              )
            )}
          </ol>

          {requiresSpecificHorse ? (
            <>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
                Konkreetse hobuse lisaväited
              </p>

              <ol className="mt-3 space-y-3">
                {SPECIFIC_CONFIRMATIONS.map(
                  (definition, index) => (
                    <ConfirmationStatement
                      key={
                        definition.key
                      }
                      definition={
                        definition
                      }
                      index={
                        commonConfirmations.length
                        + index
                        + 1
                      }
                    />
                  )
                )}
              </ol>
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

          <label
            className={[
              "mt-5 flex cursor-pointer items-start gap-3 rounded-[20px] border p-4 transition sm:p-5",
              aggregateChecked
                ? "border-amber-300 bg-amber-50"
                : "border-neutral-300 bg-white hover:border-amber-300",
            ].join(" ")}
            data-horse-confirmation-aggregate="all-required"
            data-horse-confirmation-required-count={
              progress.requiredCount
            }
          >
            <input
              type="checkbox"
              name="horse-offer-publication-confirm-all"
              checked={aggregateChecked}
              onChange={(event) =>
                onConfirmAllChange(
                  event.target.checked
                )
              }
              aria-describedby="horse-offer-confirmation-help"
              className="mt-1 h-5 w-5 shrink-0 accent-amber-500"
            />

            <span className="min-w-0">
              <span className="block text-sm font-black leading-6 text-neutral-950">
                {requiresSpecificHorse
                  ? "Kinnitan kõik seitse ülaltoodud väidet."
                  : "Kinnitan kõik neli ülaltoodud väidet."}
              </span>

              <span className="mt-1 block text-xs leading-5 text-neutral-500">
                Ühe linnukesega kinnitad kõik
                selle pakkumise liigile kehtivad
                väited. AI ei saa seda sinu eest
                teha.
              </span>
            </span>
          </label>
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
          {aggregateChecked
            ? "Kõik selle pakkumise väited on kinnitatud."
            : `Loe ${progress.requiredCount} väidet läbi ja kinnita need ühe linnukesega.`}
        </span>

        <span className="shrink-0 text-xs font-black uppercase tracking-[0.12em]">
          Avaldamine pole ühendatud
        </span>
      </div>

      <p className="mt-4 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] px-4 py-3 text-xs leading-5 text-neutral-500">
        Reeglistike olek laaditakse selles
        checkpoint&apos;is ainult lugemiseks.
        Uut nõustumist ei salvestata,
        hobusepakkumist ei salvestata,
        muutumatut avaldamissündmust ei
        looda ning kuulutust ei avaldata.
      </p>
    </section>
  );
}
