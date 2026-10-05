import type { Instrumentation } from "next";

/** Server errors go to PostHog's error tracking when product analytics is on. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportServerError } = await import("./lib/product-analytics/server");
  await reportServerError(error, request, context);
};
