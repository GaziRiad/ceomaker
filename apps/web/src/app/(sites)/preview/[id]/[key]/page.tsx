import { parseSiteContentForRender, resolvePhotoGrade, resolveSiteColors } from "@ceomaker/schema";
import { designOnChoosing, latestTemplate, TemplateView } from "@ceomaker/templates";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PLATFORM_ICON_DATA_URI } from "@/lib/brand";
import { loadOwnedSite, toEditableDraft } from "@/lib/site-data";
import { sampleTemplateKey } from "@/lib/template-samples";

// The owner's saved draft in any template, full page in its own tab, opened from the editor's
// Template tab. It shows what the template gives on Pro (contact form on, no badge) so a free
// account can judge a Pro template, and changes nothing: the draft keeps its template.

type Params = PageProps<"/preview/[id]/[key]">["params"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const key = sampleTemplateKey((await params).key);
  return {
    title: key ? `${latestTemplate(key).name} preview · CEOMaker` : "Not found",
    robots: { index: false, follow: false },
    icons: { icon: PLATFORM_ICON_DATA_URI },
  };
}

async function DraftPreview({ params }: { params: Params }) {
  const { id, key: param } = await params;
  const key = sampleTemplateKey(param);
  if (!key) notFound();
  const { site, draft } = await loadOwnedSite(id, `/preview/${id}/${key}`);
  const live = site.published ? toEditableDraft(site.published) : null;
  // The design the Template tab shows for this template: the draft's own, else the live site's,
  // else the newest.
  const version =
    key === draft.templateKey
      ? draft.templateVersion
      : designOnChoosing(key, [live && { key: live.templateKey, version: live.templateVersion }]);
  return (
    <TemplateView
      templateKey={key}
      templateVersion={version}
      colors={resolveSiteColors(draft.theme, key, version)}
      photoGrade={resolvePhotoGrade(draft.theme)}
      content={parseSiteContentForRender(site.draft.content)}
      publishedAt={new Date()}
    />
  );
}

export default function DraftPreviewPage(props: PageProps<"/preview/[id]/[key]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <DraftPreview params={props.params} />
    </Suspense>
  );
}
