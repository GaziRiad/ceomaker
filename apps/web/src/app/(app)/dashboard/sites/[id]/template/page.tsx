import { DOCUMENT_SOURCES, parseSiteContentForRender } from "@ceomaker/schema";
import type { Metadata } from "next";
import { Suspense } from "react";
import { siteAddressParts } from "@/lib/routing";
import { initialsFor, loadOwnedSite, toEditableDraft } from "@/lib/site-data";
import { BuilderHeader } from "../../../builder-header";
import { TemplatePicker } from "./picker";

export const metadata: Metadata = { title: "Choose a template", robots: { index: false } };

async function Picker({
  params,
}: {
  params: PageProps<"/dashboard/sites/[id]/template">["params"];
}) {
  const { id } = await params;
  const { user, site, draft } = await loadOwnedSite(id, `/dashboard/sites/${id}/template`);
  const address = siteAddressParts();
  const wantsDocument = (site.answers?.sources ?? []).some((source) =>
    DOCUMENT_SOURCES.has(source),
  );
  return (
    <>
      <BuilderHeader
        address={`${address.prefix}${site.subdomain}${address.suffix}`}
        status={
          site.status === "published"
            ? { label: "Live", tone: "accent" }
            : { label: "Draft", tone: "neutral" }
        }
        initials={initialsFor(site.answers?.name ?? user.name, user.email)}
      />
      <TemplatePicker
        siteId={site.id}
        initialTemplate={draft.templateKey}
        current={[site.published && toEditableDraft(site.published), draft].map(
          (shown) => shown && { key: shown.templateKey, version: shown.templateVersion },
        )}
        theme={draft.theme}
        content={parseSiteContentForRender(draft.content)}
        wantsDocument={wantsDocument}
      />
    </>
  );
}

export default function TemplatePage(props: PageProps<"/dashboard/sites/[id]/template">) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <Picker params={props.params} />
    </Suspense>
  );
}
