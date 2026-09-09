import { Queue } from "bullmq";
import type { AutomationJob } from "@nexo/shared";
import { createScheduleJob, editorialSchedules, queueName, scheduleTimezone } from "./schedules.js";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is required by the scheduler");
}

const queue = new Queue<AutomationJob>(queueName, {
  connection: { url: redisUrl, maxRetriesPerRequest: null },
});

const expectedScheduleIds = new Set<string>(editorialSchedules.map(({ id }) => id));
const existingSchedules = await queue.getJobSchedulers(0, -1, true);
const unmanagedSchedules = existingSchedules.filter(({ key }) => !expectedScheduleIds.has(key));

// Never delete an unknown scheduler automatically. The queue can be shared by a
// migration or a manually managed job, and destructive cleanup could stop it.
if (unmanagedSchedules.length > 0) {
  console.warn(JSON.stringify({
    event: "scheduler.unmanaged_schedules_detected",
    action: "preserved",
    schedules: unmanagedSchedules.map(({ key, name }) => ({ key, name })),
  }));
}

for (const schedule of editorialSchedules) {
  await queue.upsertJobScheduler(
    schedule.id,
    { pattern: schedule.pattern, tz: scheduleTimezone },
    {
      name: schedule.action,
      data: createScheduleJob(schedule),
      opts: {
        attempts: 3,
        backoff: { type: "exponential", delay: 60_000 },
        removeOnComplete: { age: 7 * 24 * 60 * 60, count: 1000 },
        removeOnFail: { age: 30 * 24 * 60 * 60, count: 1000 },
      },
    },
  );
}

console.log(JSON.stringify({
  event: "scheduler.ready",
  queue: queueName,
  timezone: scheduleTimezone,
  schedules: editorialSchedules.map(({ id, pattern }) => ({ id, pattern })),
}));

const heartbeat = setInterval(() => {
  console.log(JSON.stringify({ event: "scheduler.heartbeat", schedules: editorialSchedules.length }));
}, 15 * 60 * 1000);

async function shutdown(signal: string) {
  clearInterval(heartbeat);
  console.log(JSON.stringify({ event: "scheduler.shutdown", signal }));
  await queue.close();
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
