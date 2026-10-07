"use client";

import { answersFromDraft, encodeAnswers } from "@ceomaker/schema";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Blueprint, Spinner } from "@/components/ui";
import { finishOnboarding } from "../actions";
import { clearFlow, loadFlow } from "../storage";

/** Where the sign-in link lands: saves the answers to the new account, then moves on. */
export function FinishOnboarding() {
  const router = useRouter();
  const params = useSearchParams();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // The link carries the answers, so it works even when opened on another device.
    let encoded = params.get("a");
    if (!encoded) {
      const stored = answersFromDraft(loadFlow()?.answers ?? {});
      encoded = stored ? encodeAnswers(stored) : null;
    }
    if (!encoded) {
      router.replace("/start");
      return;
    }
    finishOnboarding(encoded)
      .then((result) => {
        if (result.ok) {
          clearFlow();
          router.replace(`/dashboard/sites/${result.siteId}/template`);
        } else if (result.reason === "signed-out") {
          router.replace(
            `/sign-in?from=start&callbackURL=${encodeURIComponent(`/start/finish?a=${encoded}`)}`,
          );
        } else {
          router.replace("/start");
        }
      })
      .catch(() => setFailed(true));
  }, [params, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <Blueprint className="flex w-full max-w-[440px] items-center gap-4 bg-neutral-100 p-8 shadow-lg">
        {failed ? (
          <div className="flex flex-col gap-3">
            <span className="font-medium">We couldn&apos;t save your answers.</span>
            <button
              type="button"
              className="btn btn-primary self-start"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <Spinner />
            <span>Saving your answers…</span>
          </>
        )}
      </Blueprint>
    </main>
  );
}
