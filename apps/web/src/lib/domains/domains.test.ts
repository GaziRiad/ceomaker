import { describe, expect, it } from "vitest";
import { diagnoseDns, recordsFor, verificationFix, type HostRecords } from "./dns";
import { parseDomainInput, recordName } from "./input";

const ours = ["ceomaker.co", "ceomaker.vercel.app"];
const expected = { a: "76.76.21.21", cname: "cname.vercel-dns.com" };
const none: HostRecords = { a: [], aaaa: [], cname: null };
const viaCname: HostRecords = { a: ["76.76.21.98"], aaaa: [], cname: expected.cname };
const atUs: HostRecords = { a: [expected.a], aaaa: [], cname: null };

describe("parseDomainInput", () => {
  it.each([
    ["ameliahart.com", "ameliahart.com", "apex"],
    ["  https://www.AmeliaHart.com/about?x=1 ", "ameliahart.com", "apex"],
    ["ameliahart.co.uk", "ameliahart.co.uk", "apex"],
    ["me.ameliahart.com", "me.ameliahart.com", "subdomain"],
    ["ameliahart.com.", "ameliahart.com", "apex"],
    ["müller.de", "xn--mller-kva.de", "apex"],
  ] as const)("reads %s", (raw, domain, kind) => {
    expect(parseDomainInput(raw, ours)).toMatchObject({ ok: true, domain, kind });
  });

  it.each(["", "  "])("asks for a domain when empty", (raw) => {
    expect(parseDomainInput(raw, ours)).toEqual({
      ok: false,
      error: "Enter your domain, like ameliahart.com.",
    });
  });

  it.each([
    "amelia",
    "amelia hart.com",
    "10.0.0.1",
    "ameliahart.notatld",
    "user@ameliahart.com",
    "ameliahart.com:8080",
    "-bad.com",
  ])("refuses %s", (raw) => {
    expect(parseDomainInput(raw, ours)).toMatchObject({ ok: false });
  });

  it("refuses our own addresses", () => {
    for (const raw of ["hart.ceomaker.co", "ceomaker.co", "x.ceomaker.vercel.app"]) {
      expect(parseDomainInput(raw, ours)).toEqual({
        ok: false,
        error: "That's already your CEOMaker address. Enter a domain you own.",
      });
    }
  });

  it("names records relative to the registrable domain", () => {
    expect(recordName("ameliahart.com", "ameliahart.com")).toBe("@");
    expect(recordName("www.ameliahart.com", "ameliahart.com")).toBe("www");
    expect(recordName("_vercel.ameliahart.co.uk", "ameliahart.co.uk")).toBe("_vercel");
  });
});

describe("recordsFor", () => {
  it("asks for an A record and a www CNAME for an apex domain", () => {
    expect(recordsFor("ameliahart.com", "apex", expected)).toEqual([
      { type: "A", name: "@", value: "76.76.21.21" },
      { type: "CNAME", name: "www", value: "cname.vercel-dns.com" },
    ]);
  });

  it("asks for one CNAME for a subdomain", () => {
    expect(recordsFor("me.ameliahart.co.uk", "subdomain", expected)).toEqual([
      { type: "CNAME", name: "me", value: "cname.vercel-dns.com" },
    ]);
  });
});

describe("diagnoseDns", () => {
  const apex = (records: Record<string, HostRecords>, confirmed?: string[]) =>
    diagnoseDns({ domain: "ameliahart.com", kind: "apex", expected, records, confirmed });

  it("is happy when both hosts point at us", () => {
    expect(apex({ "ameliahart.com": atUs, "www.ameliahart.com": viaCname })).toEqual({
      hosts: [
        { name: "www.ameliahart.com", ok: true },
        { name: "ameliahart.com", ok: true },
      ],
      fix: null,
    });
  });

  it("waits while nothing points at us yet", () => {
    expect(apex({ "ameliahart.com": none, "www.ameliahart.com": none })).toEqual({
      hosts: [
        { name: "www.ameliahart.com", ok: false },
        { name: "ameliahart.com", ok: false },
      ],
      fix: null,
    });
  });

  it("asks to delete an old record left next to ours", () => {
    const result = apex({
      "ameliahart.com": { a: [expected.a, "198.51.100.23"], aaaa: ["2001:db8::1"], cname: null },
      "www.ameliahart.com": viaCname,
    });
    expect(result.fix).toEqual({
      kind: "old",
      oldValue: "198.51.100.23",
      rows: [
        { action: "Delete", type: "A", name: "@", value: "198.51.100.23" },
        { action: "Delete", type: "AAAA", name: "@", value: "2001:db8::1" },
        { action: "Keep", type: "A", name: "@", value: expected.a },
      ],
    });
    expect(result.hosts.find((host) => host.name === "ameliahart.com")?.ok).toBe(false);
  });

  it("explains when www works but the domain still points at the old host", () => {
    expect(
      apex({
        "ameliahart.com": { a: ["198.51.100.23"], aaaa: [], cname: null },
        "www.ameliahart.com": viaCname,
      }).fix,
    ).toEqual({
      kind: "partial",
      working: "www.ameliahart.com",
      broken: "ameliahart.com",
      rows: [{ action: "Add", type: "A", name: "@", value: expected.a }],
    });
  });

  it("explains when the domain works but www still points elsewhere", () => {
    expect(
      apex({
        "ameliahart.com": atUs,
        "www.ameliahart.com": { a: ["198.51.100.23"], aaaa: [], cname: "old-host.example" },
      }).fix,
    ).toMatchObject({ kind: "partial", working: "ameliahart.com", broken: "www.ameliahart.com" });
  });

  it("trusts the host when it confirms a host is served (other addresses, flattened CNAMEs)", () => {
    const result = apex(
      {
        "ameliahart.com": { a: ["216.198.79.1"], aaaa: [], cname: null },
        "www.ameliahart.com": viaCname,
      },
      ["ameliahart.com"],
    );
    expect(result).toEqual({
      hosts: [
        { name: "www.ameliahart.com", ok: true },
        { name: "ameliahart.com", ok: true },
      ],
      fix: null,
    });
  });

  it("handles a subdomain with one CNAME", () => {
    const sub = (records: HostRecords) =>
      diagnoseDns({
        domain: "me.ameliahart.com",
        kind: "subdomain",
        expected,
        records: { "me.ameliahart.com": records },
      });
    expect(sub(viaCname)).toEqual({ hosts: [{ name: "me.ameliahart.com", ok: true }], fix: null });
    expect(sub({ a: ["198.51.100.23"], aaaa: [], cname: "old.example" }).fix).toEqual({
      kind: "old",
      oldValue: "old.example",
      rows: [
        { action: "Delete", type: "CNAME", name: "me", value: "old.example" },
        { action: "Add", type: "CNAME", name: "me", value: expected.cname },
      ],
    });
  });

  it("turns a provider's verification request into one record to add", () => {
    expect(
      verificationFix(
        [
          {
            type: "TXT",
            name: "_vercel.ameliahart.com",
            value: "vc-domain-verify=ameliahart.com,abc",
          },
        ],
        "ameliahart.com",
      ),
    ).toEqual({
      kind: "verify",
      rows: [
        {
          action: "Add",
          type: "TXT",
          name: "_vercel",
          value: "vc-domain-verify=ameliahart.com,abc",
        },
      ],
    });
    expect(verificationFix([], "ameliahart.com")).toBeNull();
  });
});
