"use client";

import { localeForLanguage } from "../../../../lib/i18n/useTranslation";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { horsePublicationMessages } from "../../horse-publication/model/horsePublicationMessages";
import type { HorsePolicySnapshot } from "../../../entities/horse-offer/model/publication";
import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import {
  useEffect,
  useState,
} from "react";
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
  onPoliciesChange?: (policies: readonly HorsePolicySnapshot[] | null) => void;
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
      marketplaceMessage("horse.selqiro_general_terms_of_use_and_publishing_rules.45de66"),
    description:
      marketplaceMessage("horse.a_current_acceptance_is_required_to_publish_public.78974c"),
  },
  {
    key: HORSE_OFFER_PUBLICATION_POLICY_KEYS
      .horseEe,
    title:
      marketplaceMessage("horse.publishing_rules_for_horse_listings_in_estonia.1a67ec"),
    description:
      marketplaceMessage("horse.a_current_acceptance_is_required_to_publish_an.3a644f"),
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
        marketplaceMessage("horse.i_own_the_horse_offered_or_am_authorised.0aaeee"),
      description:
        marketplaceMessage("horse.selqiro_does_not_routinely_verify_this_statement_using.b20dd9"),
    },
    {
      key:
        HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
          .horseIdentified,
      title:
        marketplaceMessage("horse.i_confirm_that_the_horse_offered_is_properly.354666"),
      description:
        marketplaceMessage("horse.this_statement_applies_to_the_particular_horse_offered.7cd76a"),
    },
    {
      key:
        HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
          .passportAvailable,
      title:
        marketplaceMessage("horse.i_confirm_that_the_horse_offered_has_the.3b2cc9"),
      description:
        marketplaceMessage("horse.passport_files_are_not_routinely_uploaded_in_this.86c396"),
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
      title: marketplaceMessage("horse.i_am_at_least_18_years_old.a8ff9d"),
      description:
        marketplaceMessage("horse.this_is_the_publisher_s_own_statement_selqiro.f13409"),
    },
    {
      key:
        HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
          .informationAccurate,
      title:
        marketplaceMessage("horse.i_confirm_that_the_information_provided_is_correct.18aabb"),
      description:
        marketplaceMessage("horse.the_publisher_is_responsible_for_the_information_in.d43759"),
    },
    {
      key:
        HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
          .transactionResponsibility,
      title: requiresSpecificHorse
        ? marketplaceMessage("horse.i_am_responsible_for_the_obligations_relating_to.094849")
        : marketplaceMessage("horse.i_am_responsible_for_the_wanted_listing_and.23f30e"),
      description: requiresSpecificHorse
        ? marketplaceMessage("horse.this_includes_documents_registry_procedures_handover_and_any.52ab0f")
        : marketplaceMessage("horse.selqiro_is_not_a_party_to_any_agreement.85b476"),
    },
    {
      key:
        HORSE_OFFER_PUBLICATION_CONFIRMATION_KEYS
          .notForSlaughter,
      title:
        marketplaceMessage("horse.the_listing_is_not_for_slaughter.31070c"),
      description:
        marketplaceMessage("horse.this_prohibition_includes_sending_an_animal_to_a.ecaac8"),
    },
  ];
}

function formatAcceptedAt(
  acceptedAt: string | null,
  language: "en" | "et"
): string | null {
  if (!acceptedAt) {
    return null;
  }

  const date = new Date(acceptedAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(
    localeForLanguage(language),
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
      label: marketplaceMessage("horse.accepted.8f9a47"),
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  if (status === "not-accepted") {
    return {
      label: marketplaceMessage("horse.not_accepted.441d1e"),
      className:
        "border-amber-200 bg-amber-50 text-amber-900",
    };
  }

  if (status === "loading") {
    return {
      label: marketplaceMessage("horse.checking.e26116"),
      className:
        "border-neutral-200 bg-[#fbfbfa] text-neutral-600",
    };
  }

  if (status === "error") {
    return {
      label: marketplaceMessage("horse.error.3a3cf2"),
      className:
        "border-rose-200 bg-rose-50 text-rose-800",
    };
  }

  return {
    label: marketplaceMessage("horse.no_data.245854"),
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
  const { language, r } = useMarketplaceTranslation();
  const status = getPolicyCardStatus(
    phase,
    policy
  );
  const badge = getPolicyBadge(status);
  const acceptedAt = formatAcceptedAt(
    policy?.acceptedAt || null,
    language
  );

  return (
    <article
      className="rounded-[18px] border border-neutral-200 bg-white p-4"
      data-policy-key={requirement.key}
      data-policy-status={status}
      data-policy-version={policy?.policyVersion || undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black leading-6">
            {r(language === "et" ? policy?.title || requirement.title : requirement.title)}
          </p>

          <p className="mt-1 text-xs leading-5 text-neutral-500">
            {r(phase === "loading"
              ? marketplaceMessage("horse.checking_your_existing_acceptance_status.969ba2")
              : language === "et" ? policy?.summary || requirement.description : requirement.description)}
          </p>

          {r(policy ? (
            <p className="mt-2 text-[11px] font-semibold leading-5 text-neutral-500">
              {r(marketplaceMessage("horse.version.0a11c5"))} {r(policy.policyVersion)}
              {r(policy.accepted && acceptedAt
                ? marketplaceMessage("horse.accepted_value.e2c25b", { p0: String(acceptedAt) })
                : "")}
            </p>
          ) : null)}

          {r(policy && phase === "ready" ? (
            <details className="mt-3 rounded-[14px] border border-neutral-200 bg-[#fbfbfa] px-3 py-2">
              <summary className="cursor-pointer select-none text-xs font-black leading-5 text-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">
                {r(marketplaceMessage("horse.open_full_text.ac25c6"))}</summary>

              <p className="mt-3 text-xs leading-5 text-neutral-600">
                {r(marketplaceMessage("horse.policyTextEstonian"))}
              </p>
              <div lang="et" className="mt-3 whitespace-pre-wrap border-t border-neutral-200 pt-3 text-xs leading-6 text-neutral-700">
                {policy.bodyText}
              </div>
            </details>
          ) : null)}
        </div>

        <span
          className={[
            "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
            badge.className,
          ].join(" ")}
        >
          {r(badge.label)}
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
  const { language, r } = useMarketplaceTranslation();
  return (
    <li
      className="flex items-start gap-3 rounded-[18px] border border-neutral-200 bg-white p-4"
      data-horse-confirmation-key={definition.key}
    >
      <span
        aria-hidden="true"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-xs font-black text-amber-900"
      >
        {r(index)}
      </span>

      <span className="min-w-0">
        <span className="block text-sm font-black leading-6 text-neutral-950">
          {r(definition.title)}
        </span>

        <span className="mt-1 block text-xs leading-5 text-neutral-500">
          {r(definition.description)}
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
  onPoliciesChange,
}: HorseOfferPublicationGateProps) {
  const { language, r } = useMarketplaceTranslation();
  const { t: horseText } = useV2Translation(horsePublicationMessages);
  const policyStatus =
    useHorseOfferPublicationPolicyStatus();
  const [policyAcceptanceConfirmed,
    setPolicyAcceptanceConfirmed] =
    useState(false);

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

  const missingPolicies =
    expectedPolicies
      .map(({ policy }) => policy)
      .filter(
        (policy):
          policy is PublicationPolicyStatus =>
          Boolean(policy && !policy.accepted)
      );

  const missingPolicyReviewKey =
    missingPolicies
      .map((policy) =>
        [
          policy.policyDocumentId,
          policy.policyVersion,
          policy.contentHash,
        ].join(":")
      )
      .join("|");

  useEffect(() => {
    if (policyStatus.phase !== "ready") {
      setPolicyAcceptanceConfirmed(false);
      return;
    }

    setPolicyAcceptanceConfirmed(false);
  }, [
    policyStatus.phase,
    missingPolicyReviewKey,
  ]);

  const acceptedPolicyCount =
    expectedPolicies.filter(
      ({ policy }) => policy?.accepted
    ).length;

  const missingPolicyCount =
    expectedPolicies.filter(
      ({ policy }) => !policy
    ).length;

  const unexpectedPolicyCount =
    policyStatus.policies.filter(
      (policy) =>
        !POLICY_REQUIREMENTS.some(
          (requirement) =>
            requirement.key
            === policy.policyKey
        )
    ).length;

  const incompleteReadyResponse =
    policyStatus.phase === "ready"
    && (
      missingPolicyCount > 0
      || unexpectedPolicyCount > 0
    );

  useEffect(() => {
    const complete = policyStatus.phase === "ready" && policyStatus.policies.length === POLICY_REQUIREMENTS.length
      && POLICY_REQUIREMENTS.every(requirement => policyStatus.policies.filter(policy => policy.policyKey === requirement.key && policy.accepted).length === 1);
    onPoliciesChange?.(complete ? policyStatus.policies.map(policy => ({documentId: policy.policyDocumentId,
      version: policy.policyVersion, contentHash: policy.contentHash, accepted: true as const})) : null);
  }, [policyStatus.phase, policyStatus.policies, onPoliciesChange]);

  const showPolicyRetry =
    policyStatus.phase === "error"
    || policyStatus.phase === "empty"
    || incompleteReadyResponse;

  const policySummary = (() => {
    if (policyStatus.phase === "loading") {
      return marketplaceMessage("horse.checking_both_required_policy_documents.93127d");
    }

    if (
      policyStatus.phase === "error"
      || policyStatus.phase === "empty"
      || incompleteReadyResponse
    ) {
      return marketplaceMessage("horse.the_status_of_all_required_policy_documents_is.63bdff");
    }

    if (
      acceptedPolicyCount ===
      POLICY_REQUIREMENTS.length
    ) {
      return marketplaceMessage("horse.both_required_policy_documents_have_already_been_accepted.356839");
    }

    if (acceptedPolicyCount === 1) {
      return marketplaceMessage("horse.one_policy_document_has_been_accepted_the_other.4c813a");
    }

    return marketplaceMessage("horse.both_policy_documents_must_be_accepted_before_publishing.d56789");
  })();

  return (
    <section
      className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6"
      data-horse-publication-gate-mode={requiresSpecificHorse
          ? "specific"
          : "wanted"}
      data-horse-publication-gate-local-complete={progress.complete
          ? "true"
          : "false"}
      data-policy-status-request={policyStatus.phase}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
            {r(marketplaceMessage("horse.before_publishing.daf316"))}</p>

          <h2 className="mt-2 text-2xl font-black tracking-tight">
            {r(marketplaceMessage("horse.rules_and_confirmations.9c2001"))}</h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
            {r(marketplaceMessage("horse.before_a_horse_listing_can_be_published_the.80e429"))}</p>
        </div>

        <span className="w-fit shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-900">
          {r(marketplaceMessage("horse.acceptance_does_not_save_the_listing.0c262e"))}</span>
      </div>

      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="rounded-[22px] border border-neutral-200 bg-[#fbfbfa] p-4 sm:p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
            {r(marketplaceMessage("horse.accept_the_rules.731c19"))}</p>

          <h3 className="mt-2 text-lg font-black">
            {r(marketplaceMessage("horse.two_required_policy_documents.43c49c"))}</h3>

          <p className="mt-2 text-sm leading-6 text-neutral-600">
            {r(marketplaceMessage("horse.your_existing_acceptance_status_is_read_securely_from.6a9155"))}</p>

          <div className="mt-4 space-y-3">
            {r(expectedPolicies.map(
              ({ requirement, policy }) => (
                <PolicyRequirementCard
                  key={requirement.key}
                  requirement={requirement}
                  policy={policy}
                  phase={policyStatus.phase}
                />
              )
            ))}
          </div>

          {r(showPolicyRetry ? (
            <div
              role={policyStatus.phase === "error"
                  ? "alert"
                  : "status"}
              className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900"
            >
              <p className="font-semibold">
                {r(policyStatus.phase === "error"
                  ? policyStatus.errorMessage
                  : marketplaceMessage("horse.the_required_policy_document_details_are_incomplete.f6c73b"))}
              </p>

              <button
                type="button"
                onClick={policyStatus.retry}
                className="mt-3 rounded-full border border-rose-300 bg-white px-4 py-2 text-xs font-black text-rose-900 transition hover:border-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
              >
                {r(marketplaceMessage("horse.try_again.8c63df"))}</button>
            </div>
          ) : null)}

          <p
            role="status"
            aria-live="polite"
            className="mt-4 rounded-[18px] border border-neutral-200 bg-white px-4 py-3 text-xs font-semibold leading-5 text-neutral-600"
          >
            {r(policySummary)}
          </p>
          <button type="button" disabled={policyStatus.phase === "loading" || policyStatus.isAccepting}
            onClick={policyStatus.retry} className="mt-3 rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-black disabled:opacity-40">
            {horseText("refreshPolicies")}
          </button>

          {r(policyStatus.phase === "ready"
          && !incompleteReadyResponse
          && missingPolicies.length > 0 ? (
            <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-black leading-6 text-amber-950">
                {r(missingPolicies.length === 1
                  ? marketplaceMessage("horse.one_policy_document_needs_acceptance.f03025")
                  : marketplaceMessage("horse.value_policy_documents_need_acceptance.487661", { p0: String(missingPolicies.length) }))}
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-900/80">
                {r(marketplaceMessage("horse.open_the_full_text_of_each_unaccepted_policy.5f585f"))}</p>

              <label
                className={[
                  "mt-4 flex cursor-pointer items-start gap-3 rounded-[16px] border bg-white p-4 transition",
                  policyAcceptanceConfirmed
                    ? "border-amber-400"
                    : "border-amber-200 hover:border-amber-300",
                  policyStatus.isAccepting
                    ? "cursor-wait opacity-70"
                    : "",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  name="horse-offer-publication-policy-confirm-all"
                  checked={policyAcceptanceConfirmed}
                  disabled={policyStatus.isAccepting}
                  onChange={(event) =>
                    setPolicyAcceptanceConfirmed(
                      event.target.checked
                    )}
                  className="mt-1 h-5 w-5 shrink-0 accent-amber-500"
                />

                <span className="min-w-0">
                  <span className="block text-sm font-black leading-6 text-neutral-950">
                    {r(marketplaceMessage("horse.i_confirm_that_i_have_read_the_policy.6bb367"))}</span>

                  <span className="mt-1 block text-xs leading-5 text-neutral-500">
                    {r(marketplaceMessage("horse.acceptance_belongs_to_your_user_account_the_active.5c4d22"))}</span>
                </span>
              </label>

              <button
                type="button"
                disabled={!policyAcceptanceConfirmed
                  || policyStatus.isAccepting}
                onClick={() => {
                  setPolicyAcceptanceConfirmed(
                    false
                  );
                  void policyStatus
                    .acceptMissingPolicies(
                      missingPolicies
                    );
                }}
                className="mt-3 w-full rounded-full bg-amber-500 px-5 py-3 text-sm font-black text-amber-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
              >
                {r(policyStatus.isAccepting
                  ? marketplaceMessage("horse.saving_value_value.d076d5", { p0: String(Math.min(
                      policyStatus
                        .acceptanceCompletedCount
                        + 1,
                      policyStatus
                        .acceptanceTotalCount
                    )), p1: String(policyStatus
                      .acceptanceTotalCount) })
                  : marketplaceMessage("horse.save_acceptance.b722bd"))}
              </button>

              {r(policyStatus
                .acceptanceErrorMessage ? (
                <p
                  role="alert"
                  className="mt-3 rounded-[14px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold leading-5 text-rose-900"
                >
                  {r(policyStatus
                    .acceptanceErrorMessage)}
                </p>
              ) : null)}
            </div>
          ) : null)}

          {r(policyStatus.acceptanceMessage ? (
            <p
              role="status"
              aria-live="polite"
              className="mt-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold leading-5 text-emerald-900"
            >
              {r(policyStatus.acceptanceMessage)}
            </p>
          ) : null)}

          <p className="mt-3 rounded-[18px] border border-neutral-200 bg-white px-4 py-3 text-xs leading-5 text-neutral-500">
            {r(marketplaceMessage("horse.the_server_accepts_only_the_active_document_s.4b28f3"))}</p>
        </section>

        <fieldset className="rounded-[22px] border border-neutral-200 bg-[#fbfbfa] p-4 sm:p-5">
          <legend className="sr-only">
            {r(marketplaceMessage("horse.horse_listing_factual_confirmations.19e39d"))}</legend>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
                {r(marketplaceMessage("horse.factual_confirmations.d10d01"))}</p>

              <h3 className="mt-2 text-lg font-black">
                {r(marketplaceMessage("horse.read_every_statement.4d68d5"))}</h3>
            </div>

            <span className="w-fit shrink-0 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-black text-neutral-700">
              {r(progress.requiredCount)}
              {r(" ")}
              {r(marketplaceMessage("horse.statements.45a0ea"))}</span>
          </div>

          <p
            id="horse-offer-confirmation-help"
            className="mt-3 text-sm leading-6 text-neutral-600"
          >
            {r(marketplaceMessage("horse.read_all_the_statements_below_you_can_then.586dd3"))}</p>

          <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            {r(marketplaceMessage("horse.statements_for_every_horse_listing.f05577"))}</p>

          <ol className="mt-3 space-y-3">
            {r(commonConfirmations.map(
              (definition, index) => (
                <ConfirmationStatement
                  key={definition.key}
                  definition={definition}
                  index={index + 1}
                />
              )
            ))}
          </ol>

          {r(requiresSpecificHorse ? (
            <>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
                {r(marketplaceMessage("horse.additional_statements_for_a_specific_horse.3f2ce0"))}</p>

              <ol className="mt-3 space-y-3">
                {r(SPECIFIC_CONFIRMATIONS.map(
                  (definition, index) => (
                    <ConfirmationStatement
                      key={definition.key}
                      definition={definition}
                      index={commonConfirmations.length
                        + index
                        + 1}
                    />
                  )
                ))}
              </ol>
            </>
          ) : (
            <p
              className="mt-5 rounded-[18px] border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950"
              data-horse-wanted-specific-confirmations="omitted"
            >
              {r(marketplaceMessage("horse.a_wanted_horse_listing_does_not_ask_you.ea7243"))}</p>
          ))}

          <label
            className={[
              "mt-5 flex cursor-pointer items-start gap-3 rounded-[20px] border p-4 transition sm:p-5",
              aggregateChecked
                ? "border-amber-300 bg-amber-50"
                : "border-neutral-300 bg-white hover:border-amber-300",
            ].join(" ")}
            data-horse-confirmation-aggregate="all-required"
            data-horse-confirmation-required-count={progress.requiredCount}
          >
            <input
              type="checkbox"
              name="horse-offer-publication-confirm-all"
              checked={aggregateChecked}
              onChange={(event) =>
                onConfirmAllChange(
                  event.target.checked
                )}
              aria-describedby="horse-offer-confirmation-help"
              className="mt-1 h-5 w-5 shrink-0 accent-amber-500"
            />

            <span className="min-w-0">
              <span className="block text-sm font-black leading-6 text-neutral-950">
                {r(requiresSpecificHorse
                  ? marketplaceMessage("horse.i_confirm_all_seven_statements_above.38b028")
                  : marketplaceMessage("horse.i_confirm_all_four_statements_above.6602ee"))}
              </span>

              <span className="mt-1 block text-xs leading-5 text-neutral-500">
                {r(marketplaceMessage("horse.one_checkbox_confirms_all_statements_applicable_to_this.ffabfe"))}</span>
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
          {r(aggregateChecked
            ? marketplaceMessage("horse.all_statements_for_this_listing_are_confirmed.7d4be6")
            : marketplaceMessage("horse.read_the_value_statements_and_confirm_them_with.7054a1", { p0: String(progress.requiredCount) }))}
        </span>

        <span className="shrink-0 text-xs font-black uppercase tracking-[0.12em]">
          {progress.complete ? horseText("ready") : ""}</span>
      </div>

      <p className="mt-4 rounded-[20px] border border-neutral-200 bg-[#fbfbfa] px-4 py-3 text-xs leading-5 text-neutral-500">
        {horseText("reviewBeforePublish")}</p>
    </section>
  );
}
