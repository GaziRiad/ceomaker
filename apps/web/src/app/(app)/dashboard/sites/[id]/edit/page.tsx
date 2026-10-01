import type { Metadata } from "next";
import { Suspense } from "react";
import { draftNoticeText } from "@/lib/ai/events";
import { siteAddressParts } from "@/lib/routing";
import { initialsFor, loadOwnedSite } from "@/lib/site-data";
import { Editor } from "./editor";
import { fingerprint } from "./editor-model";

export const metadata: Metadata = { title: "Editor", robots: { index: false } };

async function EditSite({
  params,
  searchParams,
}: {
  params: PageProps<"/dashboard/sites/[id]/edit">["params"];
  searchParams: PageProps<"/dashboard/sites/[id]/edit">["searchParams"];
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { user, site, draft } = await loadOwnedSite(id, `/dashboard/sites/${id}/edit`);
  const address = siteAddressParts();
  const notice = draftNoticeText(query.notice);
  return (
    <Editor
      key={site.id}
      siteId={site.id}
      subdomain={site.subdomain}
      addressPrefix={address.prefix}
      addressSuffix={address.suffix}
      initialDraft={draft}
      publishedFingerprint={site.published ? fingerprint(site.published) : null}
      status={site.status}
      versionCount={site.versionCount}
      initials={initialsFor(draft.content.meta.name || user.name, user.email)}
      notice={notice}
    />
  );
}

export default function EditPage(props: PageProps<"/dashboard/sites/[id]/edit">) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <EditSite params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
