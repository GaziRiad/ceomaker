import { getDb, getPrimarySiteId } from "@ceomaker/db";
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
  const role = typeof params.role === "string" ? params.role : null;
  return (
    <QuestionsFlow
      initialRole={role}
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
