import { isPro } from "@ceomaker/schema";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Blueprint, Check } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { planFor } from "@/lib/plan";
import { FREE_FEATURES, PRO_FEATURES, PRO_PRICES } from "@/lib/plan-copy";
import { enter } from "../../_components/enter";

export const metadata: Metadata = { title: "Billing", robots: { index: false } };

function Features({ items }: { items: readonly string[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <span className="mt-1 flex">
            <Check size={14} color="var(--color-accent)" />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

// Upgrading arrives with Paddle; until then Pro is granted by hand (see README, "Plans").
async function Billing() {
  const session = await getSession();
  if (!session) redirect("/sign-in?callbackURL=/dashboard/settings/billing");
  const pro = isPro(await planFor(session.user.id));
  return (
    <>
      <section {...enter(1)} className="cm-enter">
        <Blueprint className="flex flex-col gap-3 p-[18px] sm:px-6 sm:py-5">
          <h2 className="kicker m-0 font-normal">Your plan</h2>
          <span className="font-heading text-4xl leading-none font-semibold uppercase sm:text-[44px]">
            {pro ? "Pro" : "Free"}
          </span>
          <p className="m-0 max-w-[620px] text-[17px] text-pretty">
            {pro
              ? "Every template, your own domain, the contact form and analytics."
              : "Your site can be live for free, on Meridian at yourname.ceomaker.app."}
          </p>
        </Blueprint>
      </section>
      <section {...enter(2)} className="cm-enter grid grid-cols-1 gap-6 md:grid-cols-2">
        <Blueprint className="flex flex-col gap-4 p-[18px] sm:px-6 sm:py-5">
          <span className="font-heading text-[28px] leading-none font-semibold uppercase">
            Free
          </span>
          <Features items={FREE_FEATURES} />
        </Blueprint>
        <Blueprint className="flex flex-col gap-4 border-accent p-[18px] sm:px-6 sm:py-5">
          <span className="flex items-center justify-between gap-3">
            <span className="font-heading text-[28px] leading-none font-semibold uppercase">
              Pro
            </span>
            <span className="text-[15px] text-neutral-800">
              {PRO_PRICES.monthly.price} {PRO_PRICES.monthly.per} or {PRO_PRICES.annual.price}{" "}
              {PRO_PRICES.annual.per}
            </span>
          </span>
          <Features items={PRO_FEATURES} />
          {pro ? null : (
            <>
              <button type="button" className="btn btn-primary self-start" disabled>
                Upgrade to Pro
              </button>
              <span className="text-[13px] text-neutral-700">
                Online payment is coming soon. We&apos;ll email you when you can upgrade.
              </span>
            </>
          )}
        </Blueprint>
      </section>
    </>
  );
}

export default function BillingSettingsPage() {
  return (
    <Suspense fallback={<span className="cm-shimmer block h-[320px] bg-neutral-200" />}>
      <Billing />
    </Suspense>
  );
}
