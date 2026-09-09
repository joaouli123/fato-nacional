import { randomUUID } from "node:crypto";
import { Queue } from "bullmq";
import { automationJobSchema, type AutomationJob } from "@nexo/shared";
import { queueName } from "./schedules.js";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("REDIS_URL is required");

const action = process.env.MANUAL_ACTION === "ingest" ? "ingest" : "daily_publish";
const requestedAt = new Date().toISOString();
const job: AutomationJob = action === "ingest"
  ? {
      action,
      count: 1,
      dryRun: process.env.MANUAL_DRY !== "0",
      slot: "ingest",
      requestedAt,
      trigger: "manual",
    }
  : automationJobSchema.parse({
      action,
      count: 1,
      dryRun: process.env.MANUAL_DRY !== "0",
      slot: process.env.MANUAL_SLOT || "evergreen",
      requestedAt,
      trigger: "manual",
    });

const queue = new Queue<AutomationJob>(queueName, {
  connection: { url: redisUrl, maxRetriesPerRequest: null },
});
const queued = await queue.add(job.action, job, {
  jobId: `manual-${randomUUID()}`,
  attempts: 1,
  removeOnComplete: { age: 24 * 60 * 60, count: 100 },
  removeOnFail: { age: 7 * 24 * 60 * 60, count: 100 },
});
console.log(JSON.stringify({ event: "scheduler.manual_queued", jobId: queued.id, queue: queueName }));
await queue.close();
