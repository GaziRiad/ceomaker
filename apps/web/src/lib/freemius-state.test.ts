import { describe, expect, it } from "vitest";
import { freemiusStatus, parseFreemiusDate } from "./freemius-state";

const now = new Date("2026-10-15T12:00:00Z");
const before = new Date("2026-10-01T12:00:00Z");
const after = new Date("2026-11-01T12:00:00Z");
const live = { canceledAt: null };

describe("freemiusStatus", () => {
  it("is active until the paid period ends, even once renewal is switched off", () => {
    expect(freemiusStatus({ cancelled: false, expiration: after, subscription: live }, now)).toBe(
      "active",
    );
    const switchedOff = { canceledAt: before };
    expect(
      freemiusStatus({ cancelled: false, expiration: after, subscription: switchedOff }, now),
    ).toBe("active");
  });

  it("keeps Pro while a failed renewal is retried, and ends it once the subscription stops", () => {
    expect(freemiusStatus({ cancelled: false, expiration: before, subscription: live }, now)).toBe(
      "past_due",
    );
    expect(
      freemiusStatus(
        { cancelled: false, expiration: before, subscription: { canceledAt: now } },
        now,
      ),
    ).toBe("canceled");
    expect(freemiusStatus({ cancelled: false, expiration: before, subscription: null }, now)).toBe(
      "canceled",
    );
  });

  it("ends at once when the license is cancelled (a refund)", () => {
    expect(freemiusStatus({ cancelled: true, expiration: after, subscription: live }, now)).toBe(
      "canceled",
    );
  });
});

describe("parseFreemiusDate", () => {
  it("reads Freemius's UTC format and ignores empty or bad values", () => {
    expect(parseFreemiusDate("2026-11-01 12:00:00")).toEqual(after);
    expect(parseFreemiusDate(null)).toBeNull();
    expect(parseFreemiusDate("")).toBeNull();
    expect(parseFreemiusDate("soon")).toBeNull();
  });
});
