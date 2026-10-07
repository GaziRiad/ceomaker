import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearFlow, hasProgress, KEEP_ANSWERS_MS, loadFlow, saveFlow } from "./storage";

const KEY = "ceomaker:answers:v1";
const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    },
  };
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

const flow = {
  answers: { goal: "credibility", role: "Founder", name: "Sam", outcomes: [], sources: [] },
  step: 4,
} as const;

describe("saved answers", () => {
  it("come back within a week of the last change", () => {
    saveFlow(flow, 1_000);
    expect(loadFlow(1_000 + KEEP_ANSWERS_MS)).toEqual(flow);
  });

  it("are dropped once they're older than a week, or were saved without a date", () => {
    saveFlow(flow, 1_000);
    expect(loadFlow(1_001 + KEEP_ANSWERS_MS)).toBeNull();
    expect(store.has(KEY)).toBe(false);

    store.set(KEY, JSON.stringify(flow));
    expect(loadFlow()).toBeNull();
    expect(store.has(KEY)).toBe(false);
  });

  it("are dropped when malformed, and can be cleared", () => {
    store.set(KEY, "{not json");
    expect(loadFlow()).toBeNull();
    saveFlow(flow);
    clearFlow();
    expect(loadFlow()).toBeNull();
  });

  it("count as progress only past the defaults", () => {
    expect(
      hasProgress({ answers: { voice: "Measured", outcomes: [], sources: [] }, step: 0 }),
    ).toBe(false);
    expect(hasProgress({ answers: { role: "Founder" }, step: 1 })).toBe(true);
    expect(hasProgress({ answers: { name: "Sam" }, step: 0 })).toBe(true);
  });

  it("read answers saved before the questions changed, one step further on", () => {
    store.set(
      KEY,
      JSON.stringify({
        answers: { role: "Founder", industry: "Finance", goals: ["Press and media"] },
        step: 3,
        savedAt: 1_000,
      }),
    );
    expect(loadFlow(2_000)).toEqual({
      answers: {
        goal: "credibility",
        role: "Founder",
        industry: "Finance & Banking",
        outcomes: ["Press & media"],
        sources: [],
      },
      step: 4,
    });
  });
});
