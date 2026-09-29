import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { appFontVariables } from "../fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CEOMaker: personal websites for leaders", template: "%s · CEOMaker" },
  description:
    "A polished personal website for founders, executives and investors. Drafted with AI from your background, refined by you, live in minutes.",
};

export const viewport: Viewport = {
  themeColor: "#fbfaf7",
};

export default function AppRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={appFontVariables}>
      <body>{children}</body>
    </html>
  );
}
