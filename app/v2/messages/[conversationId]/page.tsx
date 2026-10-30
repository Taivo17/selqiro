import V2Shell from "../../../../components/v2/layout/V2Shell";
import ListingConversationPage from "../../../../src/features/listing-conversation/components/ListingConversationPage";
import { isConversationId } from "../../../../src/entities/conversation/model/listingContact";

export default async function Page({ params, searchParams }: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ listing?: string | string[] }>;
}) {
  const [{ conversationId }, query] = await Promise.all([params, searchParams]);
  const originListingId = isConversationId(query.listing) ? query.listing : null;
  return (
    <V2Shell>
      <ListingConversationPage conversationId={conversationId} originListingId={originListingId} />
    </V2Shell>
  );
}
