"use client";

import { useEffect } from "react";
import { clearFlow } from "./storage";

/** A signed-in user who already has a site has no use for answers saved for the questions. */
export function ForgetStartAnswers() {
  useEffect(() => clearFlow(), []);
  return null;
}
