import V2HorseOfferDetailPage from "../../../../../components/v2/my-area/V2HorseOfferDetailPage";

type OwnerHorseOfferDetailRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OwnerHorseOfferDetailRoute({
  params,
}: OwnerHorseOfferDetailRouteProps) {
  const {
    id,
  } = await params;

  return (
    <V2HorseOfferDetailPage
      offerId={id}
    />
  );
}
