import type { Metadata, Viewport } from "next";
import { Baloo_2, Hind } from "next/font/google";
import "./globals.css";
import { getLang } from "@/lib/lang";

// Both families were drawn for Devanagari and Latin together.
const body = Hind({ subsets: ["devanagari", "latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-body" });
const display = Baloo_2({ subsets: ["devanagari", "latin"], weight: ["500", "600", "700", "800"], display: "swap", variable: "--font-display" });

export const metadata: Metadata = {
  title: "Bharat Stores",
  description: "Billing, stock and udhaar for Bharat Stores",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Bharat Stores" },
};

export const viewport: Viewport = { themeColor: "#F4F5EF", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang}>
      <body className={`${body.variable} ${display.variable} font-sans`}>{children}</body>
    </html>
  );
}
