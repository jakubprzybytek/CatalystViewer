// API integration tests against a test stage seeded from tests/fixtures (scripts/seed-int/seed-int.ts runs the
// Bonds Updater on the fixture sources first). Values are those of the fixtures at their reference date,
// 2026-10-27 12:00 UTC (tests/fixtures/metadata.json). docs/testing.md explains how to refresh them.
import { describe, expect, it } from "vitest";
import { api } from "./api";

type BondReport = {
  details: { name: string; market: string; issuer: string; type: string; currency: string; interestConst: number };
  currentValues: { yearsToMaturity: number; interestRate: number; accuredInterest: number; pastInterestPeriods: number; tradingDaysRatio: number };
  referencePrice?: number;
  bidPrice?: number;
  askPrice?: number;
};
type IssuerProfile = { issuerName: string; industry: string; businessSummary: string; modelId?: string; scorecard?: unknown };
type Job = { workflowType: string; status: string; outputSummary?: Record<string, unknown> };

const bond = (reports: BondReport[], name: string, market = "GPW ASO") =>
  reports.find((r) => r.details.name === name && r.details.market === market);

describe("access", () => {
  it("rejects a call without a token", async () => {
    const { status } = await api("/api/bonds", { token: null });
    expect(status).toBe(401);
  });

  it("rejects a token that isn't from the stage's app client", async () => {
    const { status } = await api("/api/bonds", { token: "not-a-jwt" });
    expect(status).toBe(401);
  });
});

describe("bonds after the updater ran on the fixtures", async () => {
  const { status, body } = await api<{ bondReports: BondReport[] }>("/api/bonds");
  const reports = body.bondReports;

  it("answers", () => {
    expect(status).toBe(200);
  });

  it("lists the active bonds: 18 updated and 2 new (per market)", () => {
    expect(reports).toHaveLength(20);
  });

  it("deactivated the bond that is no longer in the daily statistics", () => {
    expect(reports.find((r) => r.details.name === "ARH0329")).toBeUndefined();
  });

  it("created the new bonds from their obligacje.pl pages", () => {
    expect(bond(reports, "ARL0429")?.details).toMatchObject({ issuer: "art.Locum S.A.", type: "Corporate bonds", currency: "PLN", interestConst: 4.25 });
    expect(bond(reports, "ATL0429")?.details).toMatchObject({ issuer: "Atal S.A.", interestConst: 1.45 });
  });

  it("took interest from the daily statistics and prices from the quote pages", () => {
    expect(bond(reports, "ALE0630")).toMatchObject({
      currentValues: { interestRate: 5.21 },
      referencePrice: 101.25,
      bidPrice: 101.02,
      askPrice: 101.5,
    });
  });

  it("computes the current values at the reference date", () => {
    expect(bond(reports, "DS0432", "GPW RR")?.currentValues).toMatchObject({
      yearsToMaturity: 5.5,
      accuredInterest: 8.92,
      pastInterestPeriods: 5,
    });
    expect(bond(reports, "PCR0527", "GPW RR")?.currentValues).toMatchObject({ yearsToMaturity: 0.54, accuredInterest: 1.16 });
  });

  it("computes liquidity from the seeded quote history", () => {
    expect(bond(reports, "MBH0629", "GPW RR")?.currentValues.tradingDaysRatio).toBe(0.95);
  });
});

describe("bond quotes", () => {
  it("returns the 30 days of quotes before the reference date, including the updater's", async () => {
    const { status, body } = await api<{ date: number }[]>("/api/bondQuotes?bond=ALE0630&market=GPW%20ASO");
    expect(status).toBe(200);
    expect(body.length).toBeGreaterThan(5);
    const days = body.map((q) => new Date(q.date).toISOString().substring(0, 10));
    expect(days).toContain("2026-10-27");
    expect(days.every((day) => day >= "2026-09-27" && day <= "2026-10-27")).toBe(true);
  });
});

describe("issuers", async () => {
  const { status, body } = await api<{ issuerProfiles: IssuerProfile[] }>("/api/issuers/profiles");
  const profile = (name: string) => body.issuerProfiles.find((p) => p.issuerName === name);

  it("answers", () => {
    expect(status).toBe(200);
  });

  it("classified the new issuer with the stubbed AI", () => {
    expect(profile("art.Locum S.A.")).toMatchObject({
      industry: "Other",
      businessSummary: "Stub classification of art.Locum S.A.: AI is stubbed on this stage.",
      modelId: "stub",
    });
  });

  it("keeps the seeded profiles and analyses", () => {
    expect(profile("Allegro.eu SA")?.industry).toBeTruthy();
    expect(profile("Allegro.eu SA")?.scorecard).toBeDefined();
  });
});

describe("jobs", () => {
  it("recorded the seed's Bonds Updater run as succeeded", async () => {
    const { status, body } = await api<{ jobs: Job[] }>("/api/jobs");
    expect(status).toBe(200);
    expect(body.jobs).toHaveLength(1);
    expect(body.jobs[0]).toMatchObject({ workflowType: "BONDS_UPDATER", status: "SUCCEEDED" });
  });
});
