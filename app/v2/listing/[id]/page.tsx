import V2Shell from "../../../../components/v2/layout/V2Shell";
import V2ListingDetailPage from "../../../../components/v2/listing/V2ListingDetailPage";

type V2ListingRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function V2ListingPage({ params }: V2ListingRouteProps) {
  const { id } = await params;

  return (
    <V2Shell>
      <V2ListingDetailPage listingId={id} />
    </V2Shell>
  );
}
