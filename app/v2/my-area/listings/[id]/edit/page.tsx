import V2Shell from "../../../../../../components/v2/layout/V2Shell";
import V2ListingEditPage from "../../../../../../components/v2/my-area/V2ListingEditPage";

type V2ListingEditRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function V2ListingEditRoute({
  params,
}: V2ListingEditRouteProps) {
  const { id } = await params;

  return (
    <V2Shell>
      <V2ListingEditPage listingId={id} />
    </V2Shell>
  );
}
