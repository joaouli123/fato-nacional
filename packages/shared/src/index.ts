import { z } from "zod";

export const agentKindSchema = z.enum([
  "collector",
  "radar",
  "topic_analyst",
  "editorial_planner",
  "researcher",
  "serp_analyst",
  "writer",
  "editor",
  "fact_checker",
  "seo_specialist",
  "image",
  "publication_auditor",
  "publisher",
]);

export type AgentKind = z.infer<typeof agentKindSchema>;

export const EDITORIAL_QUEUE_NAME = "editorial-agents";

export const editorialSlotSchema = z.enum(["news", "evergreen", "service", "update"]);
export type EditorialSlot = z.infer<typeof editorialSlotSchema>;

const automationJobBaseSchema = z.object({
  count: z.number().int().min(1).max(5).default(1),
  dryRun: z.boolean().default(false),
  requestedAt: z.string().datetime(),
  trigger: z.enum(["schedule", "manual"]).default("schedule"),
});

/**
 * Queue contract shared by the scheduler and worker.
 *
 * Keeping ingestion as its own discriminated variant prevents an arbitrary
 * human-readable schedule label from silently reaching the publication route.
 */
export const automationJobSchema = z.discriminatedUnion("action", [
  automationJobBaseSchema.extend({
    action: z.literal("ingest"),
    slot: z.literal("ingest"),
  }),
  automationJobBaseSchema.extend({
    action: z.literal("daily_publish"),
    slot: editorialSlotSchema,
  }),
]);

export type AutomationJob = z.infer<typeof automationJobSchema>;

export const riskLevelSchema = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const topicScoreSchema = z.object({
  recentGrowth: z.number().min(0).max(15),
  growthProbability: z.number().min(0).max(15),
  brazilRelevance: z.number().min(0).max(10),
  seoPotential: z.number().min(0).max(15),
  discoverPotential: z.number().min(0).max(10),
  commercialIntent: z.number().min(0).max(10),
  sourceQuality: z.number().min(0).max(10),
  competitorOpportunity: z.number().min(0).max(5),
  originalContentPotential: z.number().min(0).max(10),
});

export type TopicScore = z.infer<typeof topicScoreSchema>;

export function calculateTopicScore(score: TopicScore) {
  return Object.values(score).reduce((total, value) => total + value, 0);
}

export function classifyTopic(total: number) {
  if (total >= 85) return "publicar rapidamente";
  if (total >= 70) return "produzir nas próximas 24 horas";
  if (total >= 55) return "calendário semanal";
  return "acompanhar ou arquivar";
}

export const articleQualitySchema = z.object({
  factualAccuracy: z.number().min(0).max(25),
  originalValue: z.number().min(0).max(20),
  searchIntent: z.number().min(0).max(15),
  editorialClarity: z.number().min(0).max(10),
  authorityTransparency: z.number().min(0).max(10),
  onPageSeo: z.number().min(0).max(8),
  technicalSeo: z.number().min(0).max(7),
  imageDiscover: z.number().min(0).max(5),
  hasSevereFactualError: z.boolean().default(false),
  riskLevel: riskLevelSchema,
});

export type ArticleQuality = z.infer<typeof articleQualitySchema>;

export function calculateArticleQuality(input: ArticleQuality) {
  const score =
    input.factualAccuracy +
    input.originalValue +
    input.searchIntent +
    input.editorialClarity +
    input.authorityTransparency +
    input.onPageSeo +
    input.technicalSeo +
    input.imageDiscover;

  if (input.hasSevereFactualError) {
    return { score, decision: "rejeitar" as const };
  }

  if (input.riskLevel === "high") {
    return { score, decision: "revisão humana obrigatória" as const };
  }

  if (score >= 90) return { score, decision: "publicação automática" as const };
  if (score >= 85) return { score, decision: "revisão rápida" as const };
  if (score >= 75) return { score, decision: "voltar para edição" as const };
  return { score, decision: "rejeitar" as const };
}

export const agentJobSchema = z.object({
  id: z.string(),
  kind: agentKindSchema,
  topic: z.string(),
  payload: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string(),
});

export type AgentJob = z.infer<typeof agentJobSchema>;
