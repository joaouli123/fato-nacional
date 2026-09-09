import { automationJobSchema } from "@nexo/shared";
import { buildPortalAutomationRequest, resolveWorkerConfiguration } from "./portal-automation.js";

const job = automationJobSchema.parse({
  action: "daily_publish",
  count: 1,
  dryRun: true,
  slot: "news",
  requestedAt: new Date().toISOString(),
  trigger: "manual",
});
if (job.action !== "daily_publish" || job.count !== 1 || !job.dryRun) throw new Error("worker smoke failed");

const config = resolveWorkerConfiguration({
  REDIS_URL: "redis://localhost:6379",
  PORTAL_INTERNAL_URL: "http://portal.internal/",
  AUTOMATION_TOKEN: "canonical-token",
  CRON_TOKEN: "legacy-cron-token",
  IMAGE_GEN_TOKEN: "legacy-image-token",
  INIT_SCHEMA_TOKEN: "legacy-ingest-token",
});
const request = buildPortalAutomationRequest(job, config);

if (request.url !== "http://portal.internal/api/cron/daily-publish?count=1&dry=1&slot=news") {
  throw new Error(`worker failed to propagate the editorial slot: ${request.url}`);
}
if (request.token !== "canonical-token" || config.publishTokenSource !== "AUTOMATION_TOKEN") {
  throw new Error("worker did not prefer AUTOMATION_TOKEN");
}

for (const slot of ["news", "evergreen", "service", "update"] as const) {
  const slotJob = automationJobSchema.parse({ ...job, slot });
  const slotRequest = buildPortalAutomationRequest(slotJob, config);
  if (new URL(slotRequest.url).searchParams.get("slot") !== slot) {
    throw new Error(`worker lost the ${slot} editorial slot`);
  }
}

const legacyConfig = resolveWorkerConfiguration({
  REDIS_URL: "redis://localhost:6379",
  PORTAL_INTERNAL_URL: "http://portal.internal",
  IMAGE_GEN_TOKEN: "legacy-image-token",
  INIT_SCHEMA_TOKEN: "legacy-ingest-token",
});
if (legacyConfig.publishToken !== "legacy-image-token" || legacyConfig.ingestToken !== "legacy-ingest-token") {
  throw new Error("worker token compatibility fallback failed");
}

const ingestJob = automationJobSchema.parse({
  action: "ingest",
  count: 1,
  dryRun: false,
  slot: "ingest",
  requestedAt: new Date().toISOString(),
  trigger: "schedule",
});
const ingestRequest = buildPortalAutomationRequest(ingestJob, config);
if (ingestRequest.url !== "http://portal.internal/api/cron/ingest" || ingestRequest.token !== "canonical-token") {
  throw new Error("worker built an invalid ingestion request");
}

console.log("worker smoke ok");
