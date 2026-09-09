import { Queue } from "bullmq";
import type { AutomationJob } from "@nexo/shared";
import { queueName } from "./schedules.js";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("REDIS_URL is required");

const queue = new Queue<AutomationJob>(queueName, {
  connection: { url: redisUrl, maxRetriesPerRequest: null },
});
const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
const jobs = await queue.getJobs(["waiting", "active", "completed", "failed", "delayed"], 0, 9, true);
const schedules = await queue.getJobSchedulers(0, -1, true);
console.log(JSON.stringify({
  queue: queueName,
  counts,
  schedules: schedules.map(({ key, name, pattern, tz, next }) => ({ key, name, pattern, tz, next })),
  jobs: await Promise.all(jobs.map(async (job) => ({
    id: job.id,
    name: job.name,
    state: await job.getState(),
    failedReason: job.failedReason || undefined,
    result: job.returnvalue && typeof job.returnvalue === "object"
      ? {
          ok: "ok" in job.returnvalue ? job.returnvalue.ok : undefined,
          published: "published" in job.returnvalue && Array.isArray(job.returnvalue.published)
            ? job.returnvalue.published.length
            : undefined,
          skipped: "skipped" in job.returnvalue && Array.isArray(job.returnvalue.skipped)
            ? job.returnvalue.skipped.length
            : undefined,
          firstSkippedReason: "skipped" in job.returnvalue
            && Array.isArray(job.returnvalue.skipped)
            && typeof job.returnvalue.skipped[0]?.reason === "string"
            ? job.returnvalue.skipped[0].reason.slice(0, 160)
            : undefined,
        }
      : undefined,
  }))),
}));
await queue.close();
