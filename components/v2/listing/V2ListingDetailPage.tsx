import ListingDetailPage from "../../../src/features/listing-detail/components/ListingDetailPage";

export default function V2ListingDetailPage({
  listingId,
}: {
  listingId: string;
}) {
  return <ListingDetailPage listingId={listingId} />;
}
