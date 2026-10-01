import { getDb, getMedia } from "@ceomaker/db";
import { isUuid } from "@/lib/site-data";

/**
 * Serves uploaded images on every host, including customer subdomains. Ids are random and
 * rows never change, so responses are cacheable for a year by browsers and the CDN.
 */
export async function GET(_request: Request, context: RouteContext<"/media/[id]">) {
  const { id } = await context.params;
  if (!isUuid(id)) return new Response("Not found", { status: 404 });
  const media = await getMedia(getDb(), id.toLowerCase());
  if (!media) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(media.data), {
    headers: {
      "Content-Type": media.contentType,
      "Content-Length": String(media.byteSize),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
