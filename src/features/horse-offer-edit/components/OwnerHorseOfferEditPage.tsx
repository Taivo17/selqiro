"use client";

import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import Link from "next/link";
import { useAuth } from "../../../../lib/useAuth";
import { isHorseDraftUuid } from "../../../entities/horse-offer/model/draftEdit";
import OwnerHorseOfferEditor from "./OwnerHorseOfferEditor";

export default function OwnerHorseOfferEditPage({ offerId }: { offerId: string }) {
  const { language, r } = useMarketplaceTranslation();
  const { user, loading } = useAuth();
  const id = offerId.trim().toLowerCase();
  if (loading) return <div className="mx-auto max-w-5xl p-8" role="status">{r(marketplaceMessage("horse.loading_account.9d105e"))}</div>;
  if (!user) return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-black">{r(marketplaceMessage("horse.sign_in_to_edit_the_draft.1bbdee"))}</h1>
      <Link href="/auth" className="mt-5 inline-block font-bold underline">{r(marketplaceMessage("horse.sign_in.777709"))}</Link>
    </div>
  );
  if (!isHorseDraftUuid(id)) return (
    <div className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-black">{r(marketplaceMessage("horse.the_listing_address_is_invalid.1e9322"))}</h1>
      <Link href="/v2/my-area" className="mt-5 inline-block underline">{r(marketplaceMessage("horse.back_to_my_area.17fad0"))}</Link></div>
  );
  // Both auth/account change and navigation to another offer discard the old private session.
  return <OwnerHorseOfferEditor key={`${user.id}:${id}`} userId={user.id} offerId={id} />;
}
