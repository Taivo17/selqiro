"use client";

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

export default function ListingEditPage({ listingId }: { listingId: string }) {
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
        title="Muutmise vaadet ei saanud laadida"
        text={error}
        actionHref="/v2/my-area"
        actionLabel="Tagasi Minu alasse"
      />
    );
  }

  if (status === "not_authenticated") {
    return (
      <MessageState
        title="Logi sisse"
        text="Kuulutuse muutmiseks pead olema sisse logitud."
        actionHref="/auth"
        actionLabel="Logi sisse"
      />
    );
  }

  if (status === "not_found") {
    return (
      <MessageState
        title="Kuulutust ei leitud"
        text="See kuulutus võib olla eemaldatud või ei ole enam saadaval."
        actionHref="/v2/my-area"
        actionLabel="Tagasi Minu alasse"
      />
    );
  }

  if (status === "forbidden") {
    return (
      <MessageState
        title="Sul ei ole õigust seda kuulutust muuta"
        text="Muutmise vaade avaneb ainult kuulutuse omanikule või aktiivsele identiteedile."
        actionHref="/v2/my-area"
        actionLabel="Tagasi Minu alasse"
      />
    );
  }

  if (!listing) {
    return (
      <MessageState
        title="Kuulutust ei leitud"
        text="Kuulutuse andmeid ei õnnestunud laadida."
        actionHref="/v2/my-area"
        actionLabel="Tagasi Minu alasse"
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-emerald-600">
              Kuulutuse muutmine
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">
              {basicsForm.form.title || listing.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
              Muuta saab põhiandmeid, pilte ja poe-rubriike.
              Poe-rubriikide valik salvestatakse põhiandmetest eraldi.
            </p>
          </div>

          <div className="rounded-[24px] bg-neutral-950 p-5 text-white md:w-[320px]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">
              Aktiivne identiteet
            </p>
            <p className="mt-2 text-2xl font-black">
              {activeIdentity?.displayName || "Puudub"}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Seda kuulutust saab muuta ainult õige omanik / identiteet.
            </p>
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
