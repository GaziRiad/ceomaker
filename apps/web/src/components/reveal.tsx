"use client";

import { useEffect } from "react";

/**
 * Fades in [data-reveal] elements as they scroll into view. Elements already on screen when the
 * page hydrates are left alone, so nothing visible ever disappears. With reduced motion, or
 * without JavaScript, everything simply stays visible.
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-reveal", "shown");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );
    for (const element of document.querySelectorAll<HTMLElement>('[data-reveal=""]')) {
      const box = element.getBoundingClientRect();
      if (box.top < window.innerHeight && box.bottom > 0) continue;
      element.setAttribute("data-reveal", "armed");
      observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);
  return null;
}
