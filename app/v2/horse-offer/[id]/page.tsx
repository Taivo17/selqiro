import V2Shell from "../../../../components/v2/layout/V2Shell";
import PublicHorsePage from "../../../../src/features/horse-offer-public/components/PublicHorsePage";
export default async function HorseOfferPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 return <V2Shell><PublicHorsePage offerId={id} /></V2Shell>;
}
