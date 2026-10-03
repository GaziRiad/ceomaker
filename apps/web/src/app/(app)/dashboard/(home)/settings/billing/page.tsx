import type { Metadata } from "next";
import { Blueprint } from "@/components/ui";
import { enter } from "../../_components/enter";

export const metadata: Metadata = { title: "Billing", robots: { index: false } };

// Billing isn't live yet: during the private beta every account is free (docs/PLAN.md, Phase 3).
// The paid states (active, cancelling, payment failed, paused) arrive with Paddle.
export default function BillingSettingsPage() {
  return (
    <section {...enter(1)} className="cm-enter">
      <Blueprint className="flex flex-col gap-4 p-[18px] sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="kicker m-0 font-normal">Plan</h2>
          <span className="tag tag-accent">Private beta</span>
        </div>
        <span className="font-heading text-4xl leading-none font-semibold uppercase sm:text-[44px]">
          Beta · Free
        </span>
        <p className="m-0 max-w-[620px] text-[17px] text-pretty">
          Free during the private beta. We&apos;ll email you before anything changes.
        </p>
      </Blueprint>
    </section>
  );
}
