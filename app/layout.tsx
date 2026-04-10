import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Selqiro",
  description: "Private marketplace preview",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#f8f8f6] text-black antialiased">
        <div className="min-h-screen">
          <header className="sticky top-0 z-50 border-b border-black/8 bg-[#f8f8f6]/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 sm:px-8 lg:px-10">
              <div className="flex items-center gap-6">
                <Link href="/" className="text-lg font-semibold tracking-tight">
                  Selqiro
                </Link>

                <nav className="hidden items-center gap-2 md:flex">
                  <Link
                    href="/"
                    className="rounded-xl px-3 py-2 text-sm text-black/65 transition hover:bg-black/[0.04] hover:text-black"
                  >
                    Marketplace
                  </Link>

                  <Link
                    href="/my-page"
                    className="rounded-xl px-3 py-2 text-sm text-black/65 transition hover:bg-black/[0.04] hover:text-black"
                  >
                    My page
                  </Link>

                  <Link
                    href="/sell"
                    className="rounded-xl px-3 py-2 text-sm text-black/65 transition hover:bg-black/[0.04] hover:text-black"
                  >
                    Sell
                  </Link>

                  <Link
                    href="/store/taivo"
                    className="rounded-xl px-3 py-2 text-sm text-black/65 transition hover:bg-black/[0.04] hover:text-black"
                  >
                    Store
                  </Link>
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
                <Link
                  href="/"
                  className="whitespace-nowrap rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/70"
                >
                  Marketplace
                </Link>

                <Link
                  href="/my-page"
                  className="whitespace-nowrap rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/70"
                >
                  My page
                </Link>

                <Link
                  href="/sell"
                  className="whitespace-nowrap rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/70"
                >
                  Sell
                </Link>

                <Link
                  href="/store/taivo"
                  className="whitespace-nowrap rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/70"
                >
                  Store
                </Link>
              </div>
            </div>
          </header>

          <main>{children}</main>

          <footer className="border-t border-black/8 bg-[#f8f8f6]">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-sm text-black/45 sm:px-8 lg:px-10 md:flex-row md:items-center md:justify-between">
              <p>Selqiro private marketplace preview</p>
              <div className="flex flex-wrap gap-4">
                <Link href="/" className="transition hover:text-black">
                  Marketplace
                </Link>
                <Link href="/my-page" className="transition hover:text-black">
                  My page
                </Link>
                <Link href="/sell" className="transition hover:text-black">
                  Sell
                </Link>
                <Link href="/store/taivo" className="transition hover:text-black">
                  Store
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}