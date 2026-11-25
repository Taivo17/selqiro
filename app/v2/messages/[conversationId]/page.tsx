import V2Shell from "../../../../components/v2/layout/V2Shell";
import ListingConversationPage from "../../../../src/features/listing-conversation/components/ListingConversationPage";
import { messageOfferOrigin } from "../../../../src/features/listing-conversation/model/listingConversationNavigation";

export default async function Page({ params, searchParams }: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ conversationId }, query] = await Promise.all([params, searchParams]);
  const originOffer = messageOfferOrigin(query);
  return (
    <V2Shell>
      <ListingConversationPage conversationId={conversationId} originOffer={originOffer} />
    </V2Shell>
  );
}
