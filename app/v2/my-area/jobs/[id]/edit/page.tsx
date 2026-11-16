import V2Shell from "../../../../../../components/v2/layout/V2Shell";
import JobEditorPage from "../../../../../../src/features/jobs/components/JobEditorPage";
export default async function EditJobRoute({params}: {params: Promise<{id: string}>}) {
  const {id} = await params; return <V2Shell><JobEditorPage jobId={id}/></V2Shell>;
}
