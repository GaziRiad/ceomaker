/**
 * Security headers for every response.
 *
 * CSP trade-off: tenant pages are served from a shared cache, so per-request nonces are not
 * possible, and App Router pages carry inline bootstrap scripts. We therefore allow inline
 * scripts but lock down everything else (no third-party script origins, plugins, framing, base
 * hijacking or off-site form posts). The primary XSS defense is structural: tenant and AI content
 * is validated data rendered as escaped text, never HTML.
 */
export function contentSecurityPolicy(isDev: boolean): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "https:", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(isDev ? ["ws:", "wss:"] : [])],
    "frame-ancestors": ["'none'"],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'none'"],
    "form-action": ["'self'"],
    "manifest-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  if (!isDev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

export function securityHeaders(isDev: boolean): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(isDev) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    },
    // All tenant subdomains are HTTPS under the wildcard certificate, so includeSubDomains is safe.
    ...(isDev
      ? []
      : [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ]),
  ];
}
