import { isUuid } from "@/lib/site-data";
import { mediaStore } from "@/lib/media-store";

/**
 * Serves uploaded images on every host, including customer subdomains, from object storage.
 * Ids are random and files never change, so responses are cacheable for a year by browsers and
 * the CDN, which serves nearly every request after the first.
 */
export async function GET(_request: Request, context: RouteContext<"/media/[id]">) {
  const { id } = await context.params;
  if (!isUuid(id)) return new Response("Not found", { status: 404 });
  const media = await mediaStore()?.get(id.toLowerCase());
  if (!media) return new Response("Not found", { status: 404 });
  return new Response(media.data, {
    headers: {
      "Content-Type": media.contentType,
      "Content-Length": String(media.data.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
