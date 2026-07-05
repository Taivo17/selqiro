import Link from "next/link";
import type { ReactNode } from "react";

type V2ShellProps = {
  children: ReactNode;
};

const navItems = [
  { label: "Avaleht", href: "/v2" },
  { label: "Tooted", href: "/v2" },
  { label: "Teenused", href: "/v2" },
  { label: "Töö", href: "/v2" },
  { label: "Uudised", href: "/v2" },
];

export default function V2Shell({ children }: V2ShellProps) {
  return (
    <div className="min-h-screen bg-[#f7f8f6] text-neutral-950">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-8">
            <Link href="/v2" className="text-2xl font-black tracking-tight">
              Selqiro
            </Link>

            <nav className="hidden items-center gap-2 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-full px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-black"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/messages"
              className="hidden rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:border-neutral-300 md:inline-flex"
            >
              Sõnumid
            </Link>

            <Link
              href="/my-page"
              className="hidden rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:border-neutral-300 md:inline-flex"
            >
              Minu ala
            </Link>

            <button className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-left text-sm shadow-sm transition hover:border-neutral-300">
              <span className="block text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                Tegutsen kui
              </span>
              <span className="font-semibold">Milline Vedu</span>
            </button>
          </div>
        </div>

        <div className="border-t border-black/5 bg-white px-5 py-3 md:hidden">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="shrink-0 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}
