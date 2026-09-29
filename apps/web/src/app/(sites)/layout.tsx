import type { ReactNode } from "react";
import { siteFontVariables } from "../fonts";
import "./sites.css";

export default function SitesRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={siteFontVariables}>
      <body>{children}</body>
    </html>
  );
}
