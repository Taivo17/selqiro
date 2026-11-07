"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingEditMessages, translateListingEditMessage } from "../model/listingEditMessages";

import ListingStoreCategoryAssignmentCard from "./ListingStoreCategoryAssignmentCard";
import ListingClassificationLocationCard from "./ListingClassificationLocationCard";
import ListingEditImages from "./ListingEditImages";
import ListingEditBasicsCard from "./ListingEditBasicsCard";
import ListingEditDescriptionCard from "./ListingEditDescriptionCard";
import ListingEditDetailsCard from "./ListingEditDetailsCard";
import ListingEditActions from "./ListingEditActions";
import { LoadingState, MessageState } from "./ListingEditStates";
import { useEditableListing } from "../model/useEditableListing";
import { useListingBasicsForm } from "../model/useListingBasicsForm";
import { useListingEditImages } from "../model/useListingEditImages";
import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";
import IntegratedListingEditPage from "./IntegratedListingEditPage";

export default function ListingEditPage({ listingId }: { listingId: string }) {
  const { language, t } = useV2Translation(listingEditMessages);

  return v2IntegrationEnabled() ? <IntegratedListingEditPage listingId={listingId} /> : <ExistingListingEditPage listingId={listingId} />;
}
function ExistingListingEditPage({ listingId }: { listingId: string }) {
  const { language, t } = useV2Translation(listingEditMessages);

  const { listing, activeIdentity, userId, loading, error, status } =
    useEditableListing(listingId);

  const basicsForm = useListingBasicsForm({
    listing,
    userId,
    activeIdentityId: activeIdentity?.id || null,
  });

  const imageActions = useListingEditImages(listing);

  if (loading || status === "loading") {
    return <LoadingState />;
  }

  if (error) {
    return (
      <MessageState
        title={t("editLoadTitle")}
        text={translateListingEditMessage(language, error)}
        actionHref="/v2/my-area"
        actionLabel={t("backToMyArea")}
      />
    );
  }

  if (status === "not_authenticated") {
    return (
      <MessageState
        title={t("signIn")}
        text={t("signInToEdit")}
        actionHref="/auth"
        actionLabel={t("signIn")}
      />
    );
  }

  if (status === "not_found") {
    return (
      <MessageState
        title={t("listingNotFoundTitle")}
        text={t("listingUnavailableHelp")}
        actionHref="/v2/my-area"
        actionLabel={t("backToMyArea")}
      />
    );
  }

  if (status === "forbidden") {
    return (
      <MessageState
        title={t("editForbiddenTitle")}
        text={t("editForbiddenHelp")}
        actionHref="/v2/my-area"
        actionLabel={t("backToMyArea")}
      />
    );
  }

  if (!listing) {
    return (
      <MessageState
        title={t("listingNotFoundTitle")}
        text={t("listingLoadFailed")}
        actionHref="/v2/my-area"
        actionLabel={t("backToMyArea")}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-emerald-600">{t("listingEditing")}</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">
              {basicsForm.form.title || listing.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">{t("legacyEditHelp")}</p>
          </div>

          <div className="rounded-[24px] bg-neutral-950 p-5 text-white md:w-[320px]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">{t("activeIdentity")}</p>
            <p className="mt-2 text-2xl font-black">
              {activeIdentity?.displayName || t("none")}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/65">{t("correctIdentityRequired")}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <ListingEditImages listing={listing} actions={imageActions} />

          <ListingEditBasicsCard listing={listing} basicsForm={basicsForm} />

          <ListingClassificationLocationCard
            listing={listing}
          />

          <ListingStoreCategoryAssignmentCard
            listingId={String(listing.id)}
          />

          <ListingEditDescriptionCard basicsForm={basicsForm} />

          <ListingEditDetailsCard listing={listing} />
        </div>

        <ListingEditActions listing={listing} basicsForm={basicsForm} />
      </section>
    </div>
  );
}
