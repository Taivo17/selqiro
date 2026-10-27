"use client";

import Link from "next/link";
import V2AccountActions from "../../../src/features/v2-shell/components/V2AccountActions";

const desktopNavigationItems = [
  { label: "Avaleht", href: "/v2" },
  { label: "Kuulutused", href: "/v2/products" },
  { label: "Teenused", href: "/v2/services" },
  { label: "Töö", href: "/v2" },
  { label: "Uudised", href: "/v2" },
];

export default function V2Header({ authReturnHref }: { authReturnHref?: string }) {
  return (
    <header data-v2-header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto grid w-full min-w-0 max-w-7xl grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-3 sm:px-5 sm:py-4 xl:grid-cols-[auto_minmax(0,1fr)_auto]">
        <Link
          href="/v2"
          className="shrink-0 text-2xl font-black tracking-tight"
        >
          Selqiro
        </Link>

        <nav className="col-span-2 row-start-2 hidden min-w-0 items-center justify-center gap-2 md:flex xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:justify-start" aria-label="Põhinavigatsioon">
          {desktopNavigationItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-black"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="col-start-2 row-start-1 min-w-0 justify-self-end xl:col-start-3">
          <V2AccountActions authReturnHref={authReturnHref} />
        </div>
      </div>
    </header>
  );
}
