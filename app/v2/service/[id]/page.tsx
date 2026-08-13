import V2Shell from "../../../../components/v2/layout/V2Shell";
import ServiceDetailPage from "../../../../src/features/service-detail/components/ServiceDetailPage";

type V2ServiceRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function
V2ServiceDetailRoute({
  params,
}: V2ServiceRouteProps) {
  const { id } = await params;

  return (
    <V2Shell>
      <ServiceDetailPage
        serviceId={id}
      />
    </V2Shell>
  );
}
