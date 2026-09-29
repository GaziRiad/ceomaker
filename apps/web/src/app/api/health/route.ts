import { getDb, pingDatabase } from "@ceomaker/db";
import { connection } from "next/server";

/** Liveness + database reachability, for uptime monitors and load balancers. */
export async function GET() {
  await connection();
  try {
    await pingDatabase(getDb());
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
