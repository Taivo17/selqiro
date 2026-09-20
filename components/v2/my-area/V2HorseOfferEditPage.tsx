import V2Shell from "../layout/V2Shell";
import OwnerHorseOfferEditPage from "../../../src/features/horse-offer-edit/components/OwnerHorseOfferEditPage";

export default function V2HorseOfferEditPage({ offerId }: { offerId: string }) {
  return (
    <V2Shell>
      <OwnerHorseOfferEditPage offerId={offerId} />
    </V2Shell>
  );
}
