import ListingEditPage from "../../../src/features/listing-edit/components/ListingEditPage";

export default function V2ListingEditPage({
  listingId,
}: {
  listingId: string;
}) {
  return <ListingEditPage listingId={listingId} />;
}
