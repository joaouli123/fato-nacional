import {
  automationJobSchema,
  calculateArticleQuality,
  calculateTopicScore,
  classifyTopic,
  editorialSlotSchema,
} from "./index.js";

const topicScore = calculateTopicScore({
  recentGrowth: 14,
  growthProbability: 13,
  brazilRelevance: 8,
  seoPotential: 14,
  discoverPotential: 8,
  commercialIntent: 7,
  sourceQuality: 9,
  competitorOpportunity: 4,
  originalContentPotential: 9,
});

const article = calculateArticleQuality({
  factualAccuracy: 24,
  originalValue: 18,
  searchIntent: 14,
  editorialClarity: 9,
  authorityTransparency: 9,
  onPageSeo: 8,
  technicalSeo: 7,
  imageDiscover: 5,
  hasSevereFactualError: false,
  riskLevel: "low",
});

if (classifyTopic(topicScore) !== "publicar rapidamente") {
  throw new Error("Topic scoring smoke test failed");
}

if (article.decision !== "publicação automática") {
  throw new Error("Article quality smoke test failed");
}

for (const slot of ["news", "evergreen", "service", "update"] as const) {
  editorialSlotSchema.parse(slot);
  automationJobSchema.parse({
    action: "daily_publish",
    count: 1,
    dryRun: false,
    slot,
    requestedAt: new Date().toISOString(),
    trigger: "schedule",
  });
}

automationJobSchema.parse({
  action: "ingest",
  count: 1,
  dryRun: false,
  slot: "ingest",
  requestedAt: new Date().toISOString(),
  trigger: "schedule",
});

if (automationJobSchema.safeParse({
  action: "daily_publish",
  slot: "publicacao das 07h",
  requestedAt: new Date().toISOString(),
}).success) {
  throw new Error("Automation job accepted a display label as an editorial slot");
}

if (automationJobSchema.safeParse({
  action: "ingest",
  slot: "news",
  requestedAt: new Date().toISOString(),
}).success) {
  throw new Error("Automation job accepted an editorial slot for ingestion");
}

console.log("shared smoke ok");
