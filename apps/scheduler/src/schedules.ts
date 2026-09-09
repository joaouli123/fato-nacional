import {
  EDITORIAL_QUEUE_NAME,
  automationJobSchema,
  type AutomationJob,
  type EditorialSlot,
} from "@nexo/shared";

export const queueName = process.env.AGENT_QUEUE_NAME || EDITORIAL_QUEUE_NAME;
export const scheduleTimezone = process.env.SCHEDULE_TIMEZONE || "America/Sao_Paulo";

type IngestSchedule = {
  id: string;
  pattern: string;
  action: "ingest";
  slot: "ingest";
};

type PublishSchedule = {
  id: string;
  pattern: string;
  action: "daily_publish";
  slot: EditorialSlot;
};

type EditorialSchedule = IngestSchedule | PublishSchedule;

export const editorialSchedules = [
  {
    id: "ingest-morning",
    pattern: process.env.INGEST_MORNING_CRON || "30 6 * * *",
    action: "ingest",
    slot: "ingest",
  },
  {
    id: "publish-07",
    pattern: process.env.PUBLISH_07_CRON || "0 7 * * *",
    action: "daily_publish",
    slot: "news",
  },
  {
    id: "publish-10",
    pattern: process.env.PUBLISH_10_CRON || "0 10 * * *",
    action: "daily_publish",
    slot: "evergreen",
  },
  {
    id: "publish-13",
    pattern: process.env.PUBLISH_13_CRON || "0 13 * * *",
    action: "daily_publish",
    slot: "evergreen",
  },
  {
    id: "publish-16",
    pattern: process.env.PUBLISH_16_CRON || "0 16 * * *",
    action: "daily_publish",
    slot: "service",
  },
  {
    id: "publish-19",
    pattern: process.env.PUBLISH_19_CRON || "0 19 * * *",
    action: "daily_publish",
    slot: "update",
  },
] as const satisfies readonly EditorialSchedule[];

export function createScheduleJob(schedule: (typeof editorialSchedules)[number]): AutomationJob {
  return automationJobSchema.parse({
    action: schedule.action,
    count: 1,
    dryRun: false,
    slot: schedule.slot,
    requestedAt: new Date().toISOString(),
    trigger: "schedule",
  });
}
