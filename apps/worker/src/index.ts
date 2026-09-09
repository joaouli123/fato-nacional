import { EDITORIAL_QUEUE_NAME, automationJobSchema, type AutomationJob } from "@nexo/shared";
import { Worker } from "bullmq";
import { buildPortalAutomationRequest, resolveWorkerConfiguration } from "./portal-automation.js";

const config = resolveWorkerConfiguration(process.env);
const queueName = process.env.AGENT_QUEUE_NAME || EDITORIAL_QUEUE_NAME;

async function runPortalAutomation(job: AutomationJob) {
  const request = buildPortalAutomationRequest(job, config);
  const response = await fetch(request.url, {
    method: "POST",
    headers: {
      "x-cron-token": request.token,
    },
    signal: AbortSignal.timeout(request.timeout),
  });
  const body = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
  if (!response.ok || body?.ok === false) throw new Error(body?.error || `Portal returned ${response.status}`);
  return body;
}

const worker = new Worker(
  queueName,
  async (queueJob) => {
    const job = automationJobSchema.parse(queueJob.data);
    console.log(JSON.stringify({
      event: "worker.started",
      jobId: queueJob.id,
      action: job.action,
      slot: job.slot,
      dryRun: job.dryRun,
    }));
    await queueJob.updateProgress({ stage: "running", action: job.action, slot: job.slot });
    const result = await runPortalAutomation(job);
    await queueJob.updateProgress({ stage: "completed", action: job.action, slot: job.slot });
    return result;
  },
  {
    concurrency: Number(process.env.WORKER_CONCURRENCY || 2),
    connection: { url: config.redisUrl, maxRetriesPerRequest: null },
    removeOnComplete: { age: 7 * 24 * 60 * 60, count: 1000 },
    removeOnFail: { age: 30 * 24 * 60 * 60, count: 1000 },
  },
);

worker.on("completed", (job) => {
  const result = job.returnvalue as {
    published?: unknown[];
    pendingReview?: unknown[];
    dryRuns?: unknown[];
    skipped?: unknown[];
  } | null;
  console.log(JSON.stringify({
    event: "worker.completed",
    jobId: job.id,
    name: job.name,
    published: result?.published?.length,
    pendingReview: result?.pendingReview?.length,
    dryRuns: result?.dryRuns?.length,
    skipped: result?.skipped?.length,
  }));
});
worker.on("failed", (job, error) => {
  console.error(JSON.stringify({ event: "worker.failed", jobId: job?.id, error: error.message }));
});
worker.on("error", (error) => {
  console.error(JSON.stringify({ event: "worker.error", error: error.message }));
});

async function shutdown(signal: string) {
  console.log(JSON.stringify({ event: "worker.shutdown", signal }));
  await worker.close();
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

console.log(JSON.stringify({
  event: "worker.ready",
  queue: queueName,
  concurrency: worker.opts.concurrency,
  publishTokenSource: config.publishTokenSource,
  ingestTokenSource: config.ingestTokenSource,
}));
