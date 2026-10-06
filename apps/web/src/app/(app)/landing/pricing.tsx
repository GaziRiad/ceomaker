"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Blueprint, Check } from "@/components/ui";
import { FREE_FEATURES, PRO_FEATURES, PRO_PRICES } from "@/lib/plan-copy";

function Features({ items }: { items: readonly string[] }) {
  return (
    <div className="flex flex-col gap-2.5 text-base">
      {items.map((item) => (
        <span key={item} className="flex items-start gap-2.5">
          <span className="mt-1 flex">
            <Check size={16} color="var(--color-accent)" />
          </span>
          {item}
        </span>
      ))}
    </div>
  );
}

export function Pricing() {
  const [period, setPeriod] = useState<keyof typeof PRO_PRICES>("monthly");
  const price = PRO_PRICES[period];
  return (
    <div className="grid w-full max-w-[980px] grid-cols-1 gap-6 md:grid-cols-2">
      <Blueprint data-reveal="" className="flex flex-col gap-5 bg-neutral-100 p-8">
        <span className="font-heading text-[28px] leading-none font-semibold uppercase">Free</span>
        <div className="flex items-baseline gap-2.5">
          <span className="font-heading text-[72px] leading-none font-semibold">$0</span>
          <span className="text-neutral-700">forever</span>
        </div>
        <span className="text-sm text-accent-700">No card needed</span>
        <Features items={FREE_FEATURES} />
        <Link
          href="/start"
          className="btn btn-secondary mt-auto"
          style={{ justifyContent: "space-between", padding: "14px 16px", fontSize: 16 }}
        >
          Start free <ArrowRight />
        </Link>
      </Blueprint>
      <Blueprint
        data-reveal=""
        className="flex flex-col gap-5 bg-neutral-100 p-8 shadow-md"
        style={{ borderColor: "var(--color-accent)" }}
      >
        <span className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-heading text-[28px] leading-none font-semibold uppercase">Pro</span>
          <span className="seg" role="radiogroup" aria-label="Billing period">
            {(
              [
                ["monthly", "Monthly"],
                ["annual", "Annual · 2 months free"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="seg-opt">
                <input
                  type="radio"
                  name="period"
                  checked={period === key}
                  onChange={() => setPeriod(key)}
                />
                {label}
              </label>
            ))}
          </span>
        </span>
        <div key={period} className="cm-rise flex items-baseline gap-2.5">
          <span className="font-heading text-[72px] leading-none font-semibold">{price.price}</span>
          <span className="text-neutral-700">{price.per}</span>
        </div>
        <span className="text-sm text-accent-700">{price.note}</span>
        <Features items={PRO_FEATURES} />
        <Link
          href="/start"
          className="btn btn-primary mt-auto"
          style={{ justifyContent: "space-between", padding: "14px 16px", fontSize: 16 }}
        >
          Start free, upgrade any time <ArrowRight />
        </Link>
      </Blueprint>
    </div>
  );
}
