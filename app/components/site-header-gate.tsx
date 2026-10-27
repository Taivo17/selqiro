"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import V2Header from "../../components/v2/layout/V2Header";
import { v2NavigationContextEnabled } from "../../src/shared/config/v2Integration";
import { isV2Pathname, v2ReturnHref } from "../../src/features/v2-shell/model/navigationContext";
import SiteHeader from "./site-header";

function AuthHeader() {
  const searchParams = useSearchParams();
  const returnHref = v2NavigationContextEnabled() ? v2ReturnHref(searchParams.get("next")) : null;

  return returnHref ? <V2Header authReturnHref={returnHref} /> : <SiteHeader />;
}

export default function SiteHeaderGate() {
  const pathname = usePathname();

  if (isV2Pathname(pathname)) {
    return null;
  }

  if (pathname === "/auth") {
    return <Suspense fallback={null}><AuthHeader /></Suspense>;
  }

  return <SiteHeader />;
}
