/**
 * Accepts only same-site relative paths ("/dashboard", "/start/finish?a=…"), so a crafted
 * link can't bounce someone to another site after they sign in.
 */
export function safeCallbackPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 4096) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  try {
    const url = new URL(value, "https://app.invalid");
    return url.origin === "https://app.invalid" ? `${url.pathname}${url.search}` : null;
  } catch {
    return null;
  }
}
