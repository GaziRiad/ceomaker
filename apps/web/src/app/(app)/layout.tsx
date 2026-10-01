import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { appFontVariables } from "../fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CEOMaker: personal websites for leaders", template: "%s · CEOMaker" },
  description:
    "A personal website that matches your standing. Answer a few questions, CEOMaker drafts a polished site in your voice, and it goes live at your own address in minutes.",
};

export const viewport: Viewport = {
  themeColor: "#f2f2f3",
};

export default function AppRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={appFontVariables}>
      <body>{children}</body>
    </html>
  );
}
