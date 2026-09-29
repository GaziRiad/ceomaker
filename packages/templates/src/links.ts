/** Link attributes for visitor-facing links. External links never get window.opener access. */
export function linkProps(href: string, rel: "nofollow" | "me" = "nofollow") {
  const external = href.startsWith("http://") || href.startsWith("https://");
  return external ? { href, target: "_blank", rel: `${rel} noopener noreferrer` } : { href };
}
