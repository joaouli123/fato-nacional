import type { AutomationJob } from "@nexo/shared";

type Environment = Record<string, string | undefined>;
type TokenSource = "AUTOMATION_TOKEN" | "CRON_TOKEN" | "IMAGE_GEN_TOKEN" | "INIT_SCHEMA_TOKEN";

export type WorkerConfiguration = {
  redisUrl: string;
  portalUrl: string;
  publishToken: string;
  publishTokenSource: TokenSource;
  ingestToken: string;
  ingestTokenSource: TokenSource;
};

type ResolvedToken = { value: string; source: TokenSource } | undefined;

function resolveToken(environment: Environment, sources: readonly TokenSource[]): ResolvedToken {
  for (const source of sources) {
    const value = environment[source]?.trim();
    if (value) return { value, source };
  }
  return undefined;
}

/**
 * AUTOMATION_TOKEN is canonical. The remaining names are migration aliases so
 * existing Railway services can be rolled independently without an outage.
 */
export function resolveWorkerConfiguration(environment: Environment): WorkerConfiguration {
  const redisUrl = environment.REDIS_URL?.trim();
  const portalUrl = environment.PORTAL_INTERNAL_URL?.trim();
  const publishToken = resolveToken(environment, ["AUTOMATION_TOKEN", "CRON_TOKEN", "IMAGE_GEN_TOKEN"]);
  const ingestToken = resolveToken(environment, ["AUTOMATION_TOKEN", "CRON_TOKEN", "INIT_SCHEMA_TOKEN"]);
  const missing: string[] = [];

  if (!redisUrl) missing.push("REDIS_URL");
  if (!portalUrl) missing.push("PORTAL_INTERNAL_URL");
  if (!publishToken) missing.push("AUTOMATION_TOKEN (or CRON_TOKEN/IMAGE_GEN_TOKEN)");
  if (!ingestToken) missing.push("AUTOMATION_TOKEN (or CRON_TOKEN/INIT_SCHEMA_TOKEN)");

  if (missing.length > 0) {
    throw new Error(`Missing worker configuration: ${missing.join(", ")}`);
  }

  return {
    redisUrl: redisUrl!,
    portalUrl: portalUrl!,
    publishToken: publishToken!.value,
    publishTokenSource: publishToken!.source,
    ingestToken: ingestToken!.value,
    ingestTokenSource: ingestToken!.source,
  };
}

export function buildPortalAutomationRequest(job: AutomationJob, config: WorkerConfiguration) {
  const isIngest = job.action === "ingest";
  const path = isIngest ? "/api/cron/ingest" : "/api/cron/daily-publish";
  const url = new URL(path, `${config.portalUrl.replace(/\/$/, "")}/`);

  if (!isIngest) {
    url.searchParams.set("count", String(job.count));
    url.searchParams.set("dry", job.dryRun ? "1" : "0");
    url.searchParams.set("slot", job.slot);
  }

  return {
    url: url.toString(),
    token: isIngest ? config.ingestToken : config.publishToken,
    timeout: isIngest ? 120_000 : 15 * 60_000,
  };
}
