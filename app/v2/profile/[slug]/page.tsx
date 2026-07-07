import V2Shell from "../../../../components/v2/layout/V2Shell";
import V2PublicProfilePage from "../../../../components/v2/profile/V2PublicProfilePage";

type V2ProfileRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function V2ProfilePage({ params }: V2ProfileRouteProps) {
  const { slug } = await params;

  return (
    <V2Shell>
      <V2PublicProfilePage slug={slug} />
    </V2Shell>
  );
}
