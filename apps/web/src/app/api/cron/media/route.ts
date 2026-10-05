import { deleteMediaRows, getDb, listUnusedMedia } from "@ceomaker/db";
import { DAY_MS } from "@/lib/ai/client";
import { serverEnv } from "@/lib/env";
import { mediaStore } from "@/lib/media-store";

// The daily image cleanup. Vercel calls it on the schedule in vercel.json with the CRON_SECRET
// as a bearer token. Images that no version of any site uses (draft or published) and that are
// over a day old are removed from storage, then their rows. Images in an old published version
// stay, since that version can still be what a site shows.

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const store = mediaStore();
  if (!store) return Response.json({ removed: 0 });
  const db = getDb();
  const ids = await listUnusedMedia(db, new Date(Date.now() - DAY_MS));
  // Files first: if storage fails, the rows stay and the next run tries again.
  await store.remove(ids);
  await deleteMediaRows(db, ids);
  return Response.json({ removed: ids.length });
}
