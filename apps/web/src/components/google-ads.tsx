"use client";

import { useEffect } from "react";
import { cookiesAllowed, onConsentChange } from "@/lib/consent";
import { googleAdsId, googleAdsSignupLabel, SIGNUP_COOKIE } from "@/lib/google-ads";

type Gtag = (...args: unknown[]) => void;

/** Consent Mode v2: what Google may store and use, from this visitor's cookie choice. */
function consentState(allowed: boolean) {
  const value = allowed ? "granted" : "denied";
  return {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    // We don't use Google Analytics.
    analytics_storage: "denied",
  };
}

/**
 * The Google tag for Google Ads, on the product's pages only. Consent defaults to the visitor's
 * choice (denied in the EEA, UK and Switzerland until they accept) and follows any change. Counts
 * a sign-up once, when /api/welcome flagged one. Our own admins' browsers are left out.
 */
export function GoogleAds() {
  useEffect(() => {
    const id = googleAdsId();
    if (!id) return;
    try {
      if (localStorage.getItem("ceomaker:internal") === "1") return;
    } catch {
      // Storage blocked: carry on.
    }
    const w = window as unknown as { dataLayer: unknown[]; gtag?: Gtag };
    if (!w.gtag) {
      w.dataLayer = w.dataLayer ?? [];
      // gtag.js reads the arguments object itself, as Google's snippet does.
      w.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer.push(arguments);
      };
      w.gtag("consent", "default", { ...consentState(cookiesAllowed()), wait_for_update: 500 });
      // Without cookies, ad clicks are still attributed through the link (no storage).
      w.gtag("set", "url_passthrough", true);
      w.gtag("set", "ads_data_redaction", !cookiesAllowed());
      w.gtag("js", new Date());
      w.gtag("config", id);
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.appendChild(script);
    }
    const gtag = w.gtag;

    const label = googleAdsSignupLabel();
    if (label && document.cookie.split("; ").includes(`${SIGNUP_COOKIE}=1`)) {
      document.cookie = `${SIGNUP_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
      gtag("event", "conversion", { send_to: `${id}/${label}` });
    }

    return onConsentChange((allowed) => {
      gtag("set", "ads_data_redaction", !allowed);
      gtag("consent", "update", consentState(allowed));
    });
  }, []);
  return null;
}
