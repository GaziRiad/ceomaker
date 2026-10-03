import { applySubscriptionEvent, type SubscriptionSync } from "@ceomaker/db";
import { revalidateTag } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncSubscription } from "./billing";
import { forgetDomainRouting } from "./domain-routing";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("./domain-routing", () => ({ forgetDomainRouting: vi.fn() }));
vi.mock("@ceomaker/db", () => ({
  getDb: vi.fn(() => ({})),
  applySubscriptionEvent: vi.fn(),
  listSitesForUser: vi.fn(async () => [{ subdomain: "amelia" }, { subdomain: "amelia-old" }]),
}));

const event = {
  provider: "paddle",
  subscriptionId: "sub_1",
  userId: "amelia",
  status: "active" as const,
  occurredAt: new Date("2026-10-01T10:00:00Z"),
};

function applied(result: SubscriptionSync) {
  vi.mocked(applySubscriptionEvent).mockResolvedValueOnce(result);
}

describe("syncSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refreshes every live page of the owner at once when the plan changes", async () => {
    applied({ outcome: "applied", userId: "amelia", plan: "pro", planChanged: true });
    await syncSubscription(event);
    expect(vi.mocked(revalidateTag).mock.calls).toEqual([
      ["site:amelia", { expire: 0 }],
      ["site:amelia-old", { expire: 0 }],
    ]);
    expect(forgetDomainRouting).toHaveBeenCalledOnce();
  });

  it("leaves cached pages alone when the plan stays the same", async () => {
    applied({ outcome: "applied", userId: "amelia", plan: "pro", planChanged: false });
    await syncSubscription(event);
    applied({ outcome: "stale", userId: "amelia" });
    await syncSubscription(event);
    applied({ outcome: "unknown" });
    await syncSubscription(event);
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(forgetDomainRouting).not.toHaveBeenCalled();
  });
});
