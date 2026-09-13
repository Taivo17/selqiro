import OwnerHorseOfferDetailPage from "../../../src/features/horse-offer-detail/components/OwnerHorseOfferDetailPage";

type V2HorseOfferDetailPageProps = {
  offerId: string;
};

export default function V2HorseOfferDetailPage({
  offerId,
}: V2HorseOfferDetailPageProps) {
  return (
    <OwnerHorseOfferDetailPage
      offerId={offerId}
    />
  );
}
