import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { appFontVariables } from "../fonts";
import { appUrl } from "@/lib/routing";
import "./globals.css";

export const metadata: Metadata = {
  // Resolves relative addresses in metadata (canonical, share image) to the product's own.
  metadataBase: new URL(appUrl()),
  title: { default: "CEOMaker: personal websites for leaders", template: "%s · CEOMaker" },
  description:
    "A personal website that matches your standing. Answer a few questions, CEOMaker drafts a polished site in your voice, and it goes live at your own address in minutes.",
  // The share image comes from opengraph-image.tsx next to this layout.
  openGraph: { type: "website", siteName: "CEOMaker" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#f2f2f3",
};

export default function AppRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={appFontVariables}>
      <body>
        {children}
        {/* Vercel Web Analytics and Speed Insights for the product's own pages. Customer sites
            (the (sites) layout) keep only our cookieless analytics, which their owners see. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
