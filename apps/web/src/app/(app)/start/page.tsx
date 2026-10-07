import { getDb, getPrimarySiteId } from "@ceomaker/db";
import { ROLE_MAX, siteGoalFrom, type SiteGoal } from "@ceomaker/schema";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { siteAddressParts } from "@/lib/routing";
import { QuestionsFlow } from "./flow";

export const metadata: Metadata = {
  title: "Start your site",
  robots: { index: false },
};

async function Start({ searchParams }: { searchParams: PageProps<"/start">["searchParams"] }) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  // One site per account for now: returning users go straight to it.
  if (session && (await getPrimarySiteId(getDb(), session.user.id))) redirect("/dashboard");
  const address = siteAddressParts();
  // `?goal=hired` (ads, the /cv page) starts on the role question. The landing page's role links
  // (`?role=Founder`) start there too, for a leader's site with the role filled in.
  const goal = siteGoalFrom(params.goal);
  const role =
    typeof params.role === "string" && params.role.length <= ROLE_MAX ? params.role.trim() : null;
  const start: { goal: SiteGoal; role: string | null } | null = goal
    ? { goal, role: null }
    : role === "Something else"
      ? { goal: "other", role: null }
      : role
        ? { goal: "credibility", role }
        : null;
  return (
    <QuestionsFlow
      start={start}
      signedIn={Boolean(session)}
      addressPrefix={address.prefix}
      addressSuffix={address.suffix}
    />
  );
}

export default function StartPage(props: PageProps<"/start">) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <Start searchParams={props.searchParams} />
    </Suspense>
  );
}
