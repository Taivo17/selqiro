import V2Shell from "../layout/V2Shell";
import OwnerHorseOfferDetailPage from "../../../src/features/horse-offer-detail/components/OwnerHorseOfferDetailPage";

export default function V2HorseOfferDetailPage({ offerId }: { offerId: string }) {
  return (
    <V2Shell>
      <OwnerHorseOfferDetailPage offerId={offerId} />
    </V2Shell>
  );
}
