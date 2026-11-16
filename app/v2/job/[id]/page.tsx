import V2Shell from "../../../../components/v2/layout/V2Shell";
import JobDetailPage from "../../../../src/features/jobs/components/JobDetailPage";
import { generateOfferMetadata } from "../../../../src/server/sharing/offerMetadata";
export default async function JobRoute({params}: {params: Promise<{id: string}>}) {
  const {id} = await params; return <V2Shell><JobDetailPage jobId={id}/></V2Shell>;
}
export async function generateMetadata({params}: {params: Promise<{id: string}>}) {
  const {id} = await params; return generateOfferMetadata("job",id);
}
