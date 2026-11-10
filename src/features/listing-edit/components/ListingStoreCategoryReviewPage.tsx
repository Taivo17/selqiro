"use client";
import Link from "next/link";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { useMyAreaIdentity } from "../../my-area/model/useMyAreaIdentity";
import { useBoundManagementActor } from "../../store-category-management/model/useBoundManagementActor";
import { listingStoreCategoryReviewMessages } from "../model/listingStoreCategoryReviewMessages";
import ManagedListingStoreCategoryCard from "./ManagedListingStoreCategoryCard";

/** Category authorization belongs to the managed reader/RPC and does not
 * require an ordinary-publication receipt. Opening this page performs no save. */
export default function ListingStoreCategoryReviewPage({ listingId }: { listingId: string }) {
  const { t } = useV2Translation(listingStoreCategoryReviewMessages);
  const identity = useMyAreaIdentity();
  const bound = useBoundManagementActor(identity.actor);
  const blocked = !identity.actor || identity.loading || !!identity.error || identity.anonymous;
  const route = `/v2/my-area/listings/${encodeURIComponent(listingId)}/store-categories`;
  return <div className="mx-auto max-w-5xl space-y-6">
    <Link href="/v2/my-area" className="inline-flex min-h-11 items-center font-bold underline">{t("back")}</Link>
    <section className="space-y-3 rounded-[30px] border border-neutral-200 bg-white p-6 sm:p-8">
      <h1 className="text-2xl font-black sm:text-3xl">{t("title")}</h1>
      <p className="text-sm leading-6 text-neutral-600">{t("help")}</p>
      {identity.loading ? <p role="status">{t("checking")}</p> : null}
      {identity.identity && !identity.loading ? <p className="font-semibold">{t("actingAs", { name: identity.identity.displayName })}</p> : null}
      {identity.anonymous ? <>
        <p>{t("signInHelp")}</p>
        <Link href={`/auth?next=${encodeURIComponent(route)}`} className="inline-flex min-h-11 items-center font-bold underline">{t("signIn")}</Link>
      </> : <>
        {!identity.loading && (identity.error || !identity.actor) ? <p role="alert">{t("unavailable")}</p> : null}
        <button type="button" disabled={identity.loading} onClick={identity.refresh}
          className="min-h-11 rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-bold disabled:opacity-40">{t("refresh")}</button>
      </>}
    </section>
    {!identity.anonymous && bound ? <ManagedListingStoreCategoryCard
      key={`${bound.userId}:${bound.identityId}:${listingId}`} actor={bound} listingId={listingId} blocked={blocked} /> : null}
  </div>;
}
