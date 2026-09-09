import { automationJobSchema } from "@nexo/shared";
import { createScheduleJob, editorialSchedules } from "./schedules.js";

const jobs = editorialSchedules.map(createScheduleJob);
if (jobs.length !== 6 || jobs.some((job) => !automationJobSchema.safeParse(job).success || job.trigger !== "schedule")) {
  throw new Error("scheduler smoke failed");
}

const publishSlots = jobs
  .filter((job) => job.action === "daily_publish")
  .map((job) => job.slot);

if (publishSlots.join(",") !== "news,evergreen,evergreen,service,update") {
  throw new Error(`scheduler mapped the wrong publication slots: ${publishSlots.join(",")}`);
}

if (jobs[0]?.action !== "ingest" || jobs[0].slot !== "ingest") {
  throw new Error("scheduler mapped ingestion to a publication slot");
}

console.log("scheduler smoke ok");
