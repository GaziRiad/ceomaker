"use client";

import { useEffect, useRef } from "react";
import { clickKindOf, sitePath } from "@/lib/analytics/classify";

const COLLECT = "/api/collect";

function send(data: Record<string, string>) {
  const body = JSON.stringify(data);
  try {
    if (navigator.sendBeacon?.(COLLECT, new Blob([body], { type: "application/json" }))) return;
  } catch {
    // Some browsers refuse beacons in private modes; fall back to a normal request.
  }
  void fetch(COLLECT, {
    method: "POST",
    body,
    keepalive: true,
    headers: { "content-type": "application/json" },
  }).catch(() => {});
}

/**
 * Counts this page view and clicks on the owner's email, phone, LinkedIn and websites. No
 * cookies, no storage, nothing about the visitor beyond what the server can see anyway.
 */
export function Beacon({ subdomain, websiteHosts }: { subdomain: string; websiteHosts: string[] }) {
  const sent = useRef(false);
  useEffect(() => {
    const path = sitePath(location.pathname);
    if (!sent.current) {
      sent.current = true;
      const medium = new URLSearchParams(location.search).get("utm_medium");
      send({
        s: subdomain,
        t: "pageview",
        p: path,
        r: document.referrer,
        ...(medium ? { m: medium } : {}),
      });
    }
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      const kind = clickKindOf(link.href, websiteHosts, location.hostname);
      if (kind) send({ s: subdomain, t: "click", p: path, k: kind });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [subdomain, websiteHosts]);
  return null;
}
