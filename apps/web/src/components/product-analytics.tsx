"use client";

import { useEffect } from "react";
import { identifyAccount, startProductAnalytics } from "@/lib/product-analytics/browser";

/** Starts product analytics on the product's pages (see lib/product-analytics). */
export function ProductAnalytics() {
  useEffect(() => startProductAnalytics(), []);
  return null;
}

/**
 * On signed-in pages: this page load belongs to the account. `internal` (our own admin accounts,
 * so reports can leave them out) is only ever set, never cleared, so pages that don't know it
 * can leave it out.
 */
export function IdentifyAccount({ id, internal = false }: { id: string; internal?: boolean }) {
  useEffect(() => identifyAccount(id, internal), [id, internal]);
  return null;
}
