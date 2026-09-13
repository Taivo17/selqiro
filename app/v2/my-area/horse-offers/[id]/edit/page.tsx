import V2HorseOfferEditPage from "../../../../../../components/v2/my-area/V2HorseOfferEditPage";

type OwnerHorseOfferEditRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OwnerHorseOfferEditRoute({
  params,
}: OwnerHorseOfferEditRouteProps) {
  const {
    id,
  } = await params;

  return (
    <V2HorseOfferEditPage
      offerId={id}
    />
  );
}
