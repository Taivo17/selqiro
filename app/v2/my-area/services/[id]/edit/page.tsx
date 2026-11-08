import V2Shell from "../../../../../../components/v2/layout/V2Shell";
import ServiceEditorPage from "../../../../../../src/features/service-editor/components/ServiceEditorPage";

export default async function EditServiceRoute({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  return <V2Shell><ServiceEditorPage serviceId={id} /></V2Shell>;
}
