import { describe, expect, it } from "vitest";
import { runReportBucket, updateCanAdvance, type RunOutcome } from "./run-report";

describe("runReportBucket", () => {
  it.each<[RunOutcome, ReturnType<typeof runReportBucket>]>([
    ["published", "published"],
    ["updated", "published"],
    ["human_review_required", "pendingReview"],
    ["dry_run", "dryRuns"],
    ["skipped", "skipped"],
    ["failed", "skipped"],
    ["quarantined", "skipped"],
  ])("classifica %s como %s", (outcome, bucket) => {
    expect(runReportBucket(outcome)).toBe(bucket);
  });
});

describe("updateCanAdvance", () => {
  const approved = {
    factualPasses: true,
    seoPasses: true,
    scoreGatePasses: true,
    meetsRiskBar: true,
  };

  it("aprova somente quando todos os gates passam", () => {
    expect(updateCanAdvance(approved)).toBe(true);
    for (const key of Object.keys(approved) as Array<keyof typeof approved>) {
      expect(updateCanAdvance({ ...approved, [key]: false })).toBe(false);
    }
  });
});
