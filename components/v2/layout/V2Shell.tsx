"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import V2AccountActions from "../../../src/features/v2-shell/components/V2AccountActions";
import V2MobileNavigation, {
  shouldShowV2MobileNavigation,
} from "../../../src/features/v2-shell/components/V2MobileNavigation";

type V2ShellProps = {
  children: ReactNode;
};

const desktopNavigationItems = [
  {
    label: "Avaleht",
    href: "/v2",
  },
  {
    label: "Tooted",
    href: "/v2/products",
  },
  {
    label: "Teenused",
    href: "/v2/services",
  },
  {
    label: "Töö",
    href: "/v2",
  },
  {
    label: "Uudised",
    href: "/v2",
  },
];

export default function V2Shell({
  children,
}: V2ShellProps) {
  const pathname = usePathname();

  const showMobileNavigation =
    shouldShowV2MobileNavigation(pathname);

  return (
    <div className="min-h-[100dvh] bg-[#f7f8f6] text-neutral-950">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-8">
            <Link
              href="/v2"
              className="shrink-0 text-2xl font-black tracking-tight"
            >
              Selqiro
            </Link>

            <nav
              className="hidden items-center gap-2 md:flex"
              aria-label="Põhinavigatsioon"
            >
              {desktopNavigationItems.map(
                (item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-full px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-black"
                  >
                    {item.label}
                  </Link>
                )
              )}
            </nav>
          </div>

          <div className="min-w-0">
            <V2AccountActions />
          </div>
        </div>
      </header>

      <main
        className={[
          "mx-auto min-w-0 max-w-7xl px-4 pt-6 sm:px-5 sm:pt-8",
          showMobileNavigation
            ? "pb-32 md:pb-8"
            : "pb-8",
        ].join(" ")}
      >
        {children}
      </main>

      {showMobileNavigation && pathname ? (
        <V2MobileNavigation
          pathname={pathname}
        />
      ) : null}
    </div>
  );
}
