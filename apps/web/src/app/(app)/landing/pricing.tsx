"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Blueprint, Check } from "@/components/ui";
import { included } from "./content";

const PRICES = {
  monthly: { price: "$9.99", per: "/ month", note: "Cancel any time" },
  annual: { price: "$99", per: "/ year", note: "$8.25 a month, billed yearly" },
} as const;

export function Pricing() {
  const [plan, setPlan] = useState<keyof typeof PRICES>("annual");
  const price = PRICES[plan];
  return (
    <>
      <div className="seg" role="radiogroup" aria-label="Billing period">
        {(
          [
            ["monthly", "Monthly"],
            ["annual", "Annual · 2 months free"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="seg-opt">
            <input type="radio" name="plan" checked={plan === key} onChange={() => setPlan(key)} />
            {label}
          </label>
        ))}
      </div>
      <Blueprint
        data-reveal=""
        className="flex w-full max-w-[520px] flex-col gap-5 bg-neutral-100 p-8 shadow-md"
      >
        <div key={plan} className="cm-rise flex items-baseline gap-2.5">
          <span className="font-heading text-[72px] leading-none font-semibold">{price.price}</span>
          <span className="text-neutral-700">{price.per}</span>
        </div>
        <span className="text-sm text-accent-700">{price.note}</span>
        <div className="flex flex-col gap-2.5 text-base">
          {included.map((item) => (
            <span key={item} className="flex items-center gap-2.5">
              <Check size={16} color="var(--color-accent)" />
              {item}
            </span>
          ))}
        </div>
        <Link
          href="/start"
          className="btn btn-primary"
          style={{ justifyContent: "space-between", padding: "14px 16px", fontSize: 16 }}
        >
          Start building <ArrowRight />
        </Link>
      </Blueprint>
    </>
  );
}
