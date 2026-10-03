import Link from "next/link";
import type { ReactNode } from "react";
import { Sparkles } from "./icons";
import { ArrowRight } from "./ui";

const BILLING = "/dashboard/settings/billing";

/** The filled "Pro" badge on anything that needs the Pro plan. */
export function ProTag() {
  return (
    <span className="tag tag-pro">
      <Sparkles size={11} strokeWidth={2} />
      Pro
    </span>
  );
}

/** An upgrade prompt where a free account meets a Pro feature: what it gets, and a way there. */
export function UpgradePrompt({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 border border-accent-800 bg-accent-100 p-3 text-[13px] text-neutral-900">
      <span className="flex items-center gap-2">
        <ProTag />
        <strong className="font-semibold">{title}</strong>
      </span>
      <span className="text-pretty">{children}</span>
      <Link
        href={BILLING}
        className="btn btn-primary self-start gap-2"
        style={{ padding: "6px 12px" }}
      >
        Upgrade to Pro <ArrowRight size={16} />
      </Link>
    </div>
  );
}
