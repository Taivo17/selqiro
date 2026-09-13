import OwnerHorseOfferEditPage from "../../../src/features/horse-offer-edit/components/OwnerHorseOfferEditPage";

type V2HorseOfferEditPageProps = {
  offerId: string;
};

export default function V2HorseOfferEditPage({
  offerId,
}: V2HorseOfferEditPageProps) {
  return (
    <OwnerHorseOfferEditPage
      offerId={offerId}
    />
  );
}
