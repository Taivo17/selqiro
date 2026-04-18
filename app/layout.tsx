import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "./components/site-header";

export const metadata: Metadata = {
  title: "Selqiro",
  description: "Marketplace for buying and selling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#f8f8f6] text-black antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}