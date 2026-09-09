export type SuccessfulRunOutcome = "published" | "human_review_required" | "dry_run" | "updated";
export type UnsuccessfulRunOutcome = "skipped" | "failed" | "quarantined";
export type RunOutcome = SuccessfulRunOutcome | UnsuccessfulRunOutcome;
export type RunReportBucket = "published" | "pendingReview" | "dryRuns" | "skipped";

/** Keep the public report honest: drafts awaiting review and dry-runs are not publications. */
export function runReportBucket(outcome: RunOutcome): RunReportBucket {
  if (outcome === "published" || outcome === "updated") return "published";
  if (outcome === "human_review_required") return "pendingReview";
  if (outcome === "dry_run") return "dryRuns";
  return "skipped";
}

export function updateCanAdvance(input: {
  factualPasses: boolean;
  seoPasses: boolean;
  scoreGatePasses: boolean;
  meetsRiskBar: boolean;
}): boolean {
  return input.factualPasses && input.seoPasses && input.scoreGatePasses && input.meetsRiskBar;
}
