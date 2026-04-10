"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Marketplace" },
  { href: "/my-page", label: "My page" },
  { href: "/sell", label: "Sell" },
  { href: "/store/taivo", label: "Store" },
];

function getNavClass(isActive: boolean) {
  return isActive
    ? "rounded-xl bg-black text-white px-3 py-2 text-sm transition"
    : "rounded-xl px-3 py-2 text-sm text-black/65 transition hover:bg-black/[0.04] hover:text-black";
}

function getMobileNavClass(isActive: boolean) {
  return isActive
    ? "whitespace-nowrap rounded-xl bg-black px-3 py-2 text-sm text-white"
    : "whitespace-nowrap rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/70";
}

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-black/8 bg-[#f8f8f6]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 sm:px-8 lg:px-10">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Selqiro
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={getNavClass(isActive)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-black/45 sm:inline-flex">
            Private preview
          </span>

          <Link
            href="/sell"
            className="rounded-2xl bg-green-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          >
            + Add listing
          </Link>
        </div>
      </div>

      <div className="border-t border-black/6 md:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-6 py-3 sm:px-8 lg:px-10">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={getMobileNavClass(isActive)}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}