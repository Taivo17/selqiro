"use client";

import { usePathname } from "next/navigation";
import SiteHeader from "./site-header";

export default function SiteHeaderGate() {
  const pathname = usePathname();

  if (pathname?.startsWith("/v2")) {
    return null;
  }

  return <SiteHeader />;
}
