import V2Shell from "../../../../components/v2/layout/V2Shell";
import ListingConversationPage from "../../../../src/features/listing-conversation/components/ListingConversationPage";

export default async function Page({ params }: { params: Promise<{ conversationId: string }> }) {
  return (
    <V2Shell>
      <ListingConversationPage conversationId={(await params).conversationId} />
    </V2Shell>
  );
}
