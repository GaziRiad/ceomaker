import { parseSiteContentForRender, resolveSiteColors } from "@ceomaker/schema";
import { getTemplate } from "@ceomaker/templates";
import type { Metadata } from "next";
import { Suspense } from "react";
import { siteAddressParts } from "@/lib/routing";
import { loadOwnedSite } from "@/lib/site-data";
import { GeneratingScreen } from "./generating";

export const metadata: Metadata = { title: "Writing your draft", robots: { index: false } };

async function Generating({
  params,
}: {
  params: PageProps<"/dashboard/sites/[id]/generating">["params"];
}) {
  const { id } = await params;
  const { site, draft } = await loadOwnedSite(id, `/dashboard/sites/${id}/generating`);
  const address = siteAddressParts();
  return (
    <GeneratingScreen
      siteId={site.id}
      address={`${address.prefix}${site.subdomain}${address.suffix}`}
      templateKey={draft.templateKey}
      templateVersion={draft.templateVersion}
      templateName={getTemplate(draft.templateKey, draft.templateVersion).name}
      voice={site.answers?.voice ?? "Measured"}
      colors={resolveSiteColors(draft.theme, draft.templateKey, draft.templateVersion)}
      content={parseSiteContentForRender(draft.content)}
    />
  );
}

export default function GeneratingPage(props: PageProps<"/dashboard/sites/[id]/generating">) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <Generating params={props.params} />
    </Suspense>
  );
}
