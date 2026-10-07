import "server-only";
import { appUrl } from "./routing";

/**
 * CSRF guard for JSON and upload route handlers: browsers always send Origin on cross-site
 * POSTs, so requiring it to match the app's own origin blocks forged requests. (Server Actions
 * get the same check from Next.js.)
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set([new URL(appUrl()).origin, new URL(request.url).origin]);
  return allowed.has(origin);
}

/**
 * For plain HTML forms that must work for everyone: refuses a post another site made (browsers
 * send its Origin, or "null" from a sandbox) but lets a missing Origin through, since some
 * privacy tools strip it from people's own posts.
 */
export function isCrossSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return false;
  return !new Set([new URL(appUrl()).origin, new URL(request.url).origin]).has(origin);
}
