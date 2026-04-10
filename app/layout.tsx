import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import SiteHeader from "./components/site-header";

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
          <SiteHeader />

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