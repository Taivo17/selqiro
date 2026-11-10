import V2Shell from "../../../../../../components/v2/layout/V2Shell";
import ListingStoreCategoryReviewPage from "../../../../../../src/features/listing-edit/components/ListingStoreCategoryReviewPage";

export default async function ListingStoreCategoryReviewRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <V2Shell><ListingStoreCategoryReviewPage listingId={id} /></V2Shell>;
}
