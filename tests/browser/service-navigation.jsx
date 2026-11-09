import React, {useLayoutEffect, useSyncExternalStore} from "react";
import {createRoot} from "react-dom/client";
import PublicProfilePage from "selqiro-app/src/features/public-profile/components/PublicProfilePage.tsx";
import V2ServicesPage from "selqiro-app/components/v2/services/V2ServicesPage.tsx";
import ServiceDetailPage from "selqiro-app/src/features/service-detail/components/ServiceDetailPage.tsx";
import ListingReturnBackButton from "selqiro-app/src/features/listing-navigation/components/ListingReturnBackButton.tsx";
import {fixture, locationSnapshot, subscribeLocation} from "selqiro-service-fixture";

function Route() {
  const url = useSyncExternalStore(subscribeLocation, locationSnapshot, locationSnapshot);
  const pathname = new URL(url, location.origin).pathname;
  useLayoutEffect(() => {
    if (fixture.nextScroll) window.scrollTo(0, 0);
    fixture.nextScroll = true;
  }, [pathname]);
  let component;
  if (pathname === "/v2/services") component = <V2ServicesPage />;
  else if (pathname.startsWith("/v2/profile/")) component = <PublicProfilePage slug={decodeURIComponent(pathname.split("/").pop())} />;
  else if (pathname.startsWith("/v2/service/")) component = <ServiceDetailPage serviceId={pathname.split("/").pop()} />;
  else if (pathname.startsWith("/v2/listing/")) component = <><ListingReturnBackButton listingId={pathname.split("/").pop()} className="underline" /><h1>Synthetic listing detail boundary</h1></>;
  else component = <p>Unsupported synthetic route</p>;
  return <main key={pathname} data-test-route={pathname} style={{maxWidth: 1180, margin: "0 auto", padding: "24px 16px 90px"}}>{component}</main>;
}
createRoot(document.getElementById("root")).render(<Route />);
