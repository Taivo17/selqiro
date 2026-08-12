import V2Shell from "../../../../components/v2/layout/V2Shell";
import ProductShowcaseDetailPage from "../../../../src/features/product-showcase-detail/components/ProductShowcaseDetailPage";

type V2ProductShowcaseRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function
V2ProductShowcasePage({
  params,
}: V2ProductShowcaseRouteProps) {
  const { id } = await params;

  return (
    <V2Shell>
      <ProductShowcaseDetailPage
        showcaseId={id}
      />
    </V2Shell>
  );
}
