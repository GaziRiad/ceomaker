import type { Metadata } from "next";
import { Suspense } from "react";
import { FinishOnboarding } from "./finish";

export const metadata: Metadata = { title: "Saving your answers", robots: { index: false } };

export default function FinishPage() {
  return (
    <Suspense fallback={null}>
      <FinishOnboarding />
    </Suspense>
  );
}
