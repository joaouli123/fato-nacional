import { z } from "zod";

export const editorialSlotSchema = z.enum(["news", "evergreen", "service", "update"]);
export type EditorialSlot = z.infer<typeof editorialSlotSchema>;

export const interlinkSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,120}$/),
  anchor: z.string().trim().min(3).max(140),
});

export const backlogItemSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{8,90}$/),
  title: z.string().trim().min(20).max(180),
  category: z.string().regex(/^[a-z0-9-]{3,80}$/),
  author: z.string().trim().min(3).max(120),
  type: z.string().trim().min(3).max(80),
  primaryKeyword: z.string().trim().min(3).max(140),
  words: z.string().trim().min(3).max(40),
  ymyl: z.boolean(),
  angle: z.string().trim().min(30).max(1_200),
  mustCover: z.array(z.string().trim().min(5).max(400)).min(3).max(10),
  interlinks: z.array(interlinkSchema).max(5),
});
export type BacklogItem = z.infer<typeof backlogItemSchema>;

/**
 * Texto com teto TOLERANTE: excedente é truncado em vez de derrubar a run
 * (modelos frequentemente passam poucos caracteres do limite). Texto CURTO
 * demais continua reprovando — esse sim é sinal de conteúdo ruim.
 */
const clampedText = (min: number, max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim().slice(0, max) : v),
    z.string().trim().min(min).max(max),
  );

export const generatedPostSchema = z.object({
  headline: clampedText(20, 180),
  summary: clampedText(120, 360),
  seoTitle: clampedText(20, 70),
  metaDescription: clampedText(100, 180),
  tags: z.preprocess(
    (v) => {
      if (Array.isArray(v)) return v.slice(0, 8);
      if (typeof v === "string") {
        return v
          .split(/[,;|\n]+/)
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 8);
      }
      return v;
    },
    z.array(clampedText(2, 60)).min(2).max(8),
  ),
  // Coerção defensiva: modelos ora devolvem 8, ora "8", ora "8 min" — normaliza
  // para "N min" em vez de derrubar a run por um detalhe de formatação.
  readingTime: z.preprocess(
    (v) => {
      if (typeof v === "number" && Number.isFinite(v)) return `${Math.max(1, Math.round(v))} min`;
      if (typeof v === "string") {
        // Aceita qualquer variação ("9", "9 min", "9 minutos", "cerca de 9 min de leitura")
        // e normaliza para "9 min" — formatação nunca derruba uma run.
        const match = v.match(/\d{1,3}/);
        if (match) return `${match[0]} min`;
      }
      return v;
    },
    z.string().trim().regex(/^\d{1,3}\s*min$/i),
  ),
  contentHtml: z.string().min(1_000),
});
export type GeneratedPost = z.infer<typeof generatedPostSchema>;

export const reviewDecisionSchema = z.object({
  score: z.number().min(0).max(100),
  passes: z.boolean(),
  requiredFixes: z.preprocess(
    (v) => (Array.isArray(v) ? v.slice(0, 30) : v),
    z.array(clampedText(3, 500)).max(30),
  ),
});
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;

export const evidenceSourceSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  publisher: z.string().min(2),
  sourceType: z.enum(["primary", "official", "specialist", "recognized_media", "other"]),
  publishedAt: z.string().datetime().nullable().optional(),
  retrievedAt: z.string().datetime(),
  finalUrl: z.string().url(),
  httpStatus: z.number().int().min(100).max(599),
});

export const evidenceClaimSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(10),
  material: z.boolean(),
  sourceIds: z.array(z.string()).min(1),
  confidence: z.number().min(0).max(1),
  conflict: z.string().nullable().optional(),
});

export const evidencePackSchema = z.object({
  topic: z.string().min(3),
  researchedAt: z.string().datetime(),
  sources: z.array(evidenceSourceSchema).min(1),
  claims: z.array(evidenceClaimSchema).min(1),
  unresolvedQuestions: z.array(z.string()),
  updateTriggers: z.array(z.string()),
});
export type EvidencePack = z.infer<typeof evidencePackSchema>;

export const opportunityDossierSchema = z.object({
  topic: z.string().min(3),
  primaryIntent: z.string().min(3),
  secondaryIntents: z.array(z.string()),
  audience: z.string().min(3),
  readerJob: z.string().min(10),
  entities: z.array(z.string()),
  questions: z.array(z.string()).min(1),
  competitorGaps: z.array(z.string()),
  differentiators: z.array(z.string()).min(2),
  clusterId: z.string().min(1),
  riskLevel: z.enum(["low", "medium", "high"]),
  cannibalization: z.object({
    status: z.enum(["clear", "review", "merge", "reject"]),
    competingSlugs: z.array(z.string()),
  }),
});
export type OpportunityDossier = z.infer<typeof opportunityDossierSchema>;

export const articleBriefSchema = z.object({
  promise: z.string().min(10),
  primaryAnswer: z.string().min(20),
  outline: z.array(z.object({
    heading: z.string().min(3),
    purpose: z.string().min(10),
    claimIds: z.array(z.string()),
  })).min(2),
  internalLinks: z.array(interlinkSchema),
  components: z.array(z.enum(["summary", "steps", "comparison", "table", "faq", "calculator", "none"])),
  wordBudget: z.number().int().min(300).max(5_000),
});
export type ArticleBrief = z.infer<typeof articleBriefSchema>;

export const existingArticleInventoryItemSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,120}$/),
  title: z.string().trim().min(10).max(180),
  primaryKeyword: z.string().trim().min(3).max(140).nullable().optional(),
  primaryIntent: z.string().trim().min(3).max(140).nullable().optional(),
  summary: z.string().trim().min(20).max(500).nullable().optional(),
});
export type ExistingArticleInventoryItem = z.infer<typeof existingArticleInventoryItemSchema>;

export const editorialPlanningInputSchema = z.object({
  backlogItem: backlogItemSchema,
  research: z.object({
    text: z.string().trim().min(200).max(80_000),
    researchedAt: z.string().datetime(),
  }),
  existingArticles: z.array(existingArticleInventoryItemSchema).max(500),
}).superRefine((input, context) => {
  if (!/https?:\/\/[^\s<>{}\[\]"]+/i.test(input.research.text)) {
    context.addIssue({
      code: "custom",
      path: ["research", "text"],
      message: "a pesquisa coletada precisa conter pelo menos uma URL HTTP(S)",
    });
  }

  const slugs = input.existingArticles.map((article) => article.slug);
  if (new Set(slugs).size !== slugs.length) {
    context.addIssue({
      code: "custom",
      path: ["existingArticles"],
      message: "o inventÃ¡rio nÃ£o pode conter slugs duplicados",
    });
  }
});
export type EditorialPlanningInput = z.infer<typeof editorialPlanningInputSchema>;

const serpPatternSchema = z.object({
  pattern: z.string().trim().min(10).max(300),
  gap: z.string().trim().min(10).max(400),
});

export const planningOpportunityDossierSchema = opportunityDossierSchema.extend({
  serpPatterns: z.array(serpPatternSchema).min(1).max(8),
  dominantFormats: z.array(z.string().trim().min(3).max(80)).min(1).max(6),
  freshnessNeed: z.enum(["low", "medium", "high"]),
});

const answerTargetSchema = z.object({
  question: z.string().trim().min(10).max(240),
  answerShape: z.enum(["paragraph", "list", "steps", "comparison", "table"]),
  claimIds: z.array(z.string().min(1)).min(1).max(8),
});

const faqDecisionSchema = z.discriminatedUnion("include", [
  z.object({
    include: z.literal(true),
    rationale: z.string().trim().min(20).max(400),
    questions: z.array(z.string().trim().min(10).max(240)).min(2).max(6),
  }),
  z.object({
    include: z.literal(false),
    rationale: z.string().trim().min(20).max(400),
    questions: z.array(z.string()).max(0),
  }),
]);

const tableDecisionSchema = z.discriminatedUnion("include", [
  z.object({
    include: z.literal(true),
    rationale: z.string().trim().min(20).max(400),
    columns: z.array(z.string().trim().min(2).max(80)).min(2).max(8),
    comparisonDimensions: z.array(z.string().trim().min(3).max(120)).min(2).max(12),
  }),
  z.object({
    include: z.literal(false),
    rationale: z.string().trim().min(20).max(400),
    columns: z.array(z.string()).max(0),
    comparisonDimensions: z.array(z.string()).max(0),
  }),
]);

export const planningArticleBriefSchema = articleBriefSchema.extend({
  geoAeo: z.object({
    answerTargets: z.array(answerTargetSchema).min(1).max(8),
    faq: faqDecisionSchema,
    table: tableDecisionSchema,
  }),
});

function normalizedContractText(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

export const editorialPlanningPackageSchema = z.object({
  opportunity: planningOpportunityDossierSchema,
  evidence: evidencePackSchema,
  brief: planningArticleBriefSchema,
}).superRefine((planningPackage, context) => {
  if (normalizedContractText(planningPackage.opportunity.topic) !== normalizedContractText(planningPackage.evidence.topic)) {
    context.addIssue({
      code: "custom",
      path: ["evidence", "topic"],
      message: "o tÃ³pico do EvidencePack deve ser o mesmo do OpportunityDossier",
    });
  }

  const sourceIds = planningPackage.evidence.sources.map((source) => source.id);
  const knownSourceIds = new Set(sourceIds);
  if (knownSourceIds.size !== sourceIds.length) {
    context.addIssue({ code: "custom", path: ["evidence", "sources"], message: "IDs de fontes devem ser Ãºnicos" });
  }

  const claimIds = planningPackage.evidence.claims.map((claim) => claim.id);
  const knownClaimIds = new Set(claimIds);
  if (knownClaimIds.size !== claimIds.length) {
    context.addIssue({ code: "custom", path: ["evidence", "claims"], message: "IDs de claims devem ser Ãºnicos" });
  }

  planningPackage.evidence.claims.forEach((claim, claimIndex) => {
    claim.sourceIds.forEach((sourceId, sourceIndex) => {
      if (!knownSourceIds.has(sourceId)) {
        context.addIssue({
          code: "custom",
          path: ["evidence", "claims", claimIndex, "sourceIds", sourceIndex],
          message: `sourceId desconhecido: ${sourceId}`,
        });
      }
    });
  });

  const usedClaimIds = new Set<string>();
  planningPackage.brief.outline.forEach((section, sectionIndex) => {
    section.claimIds.forEach((claimId, claimIndex) => {
      usedClaimIds.add(claimId);
      if (!knownClaimIds.has(claimId)) {
        context.addIssue({
          code: "custom",
          path: ["brief", "outline", sectionIndex, "claimIds", claimIndex],
          message: `claimId desconhecido: ${claimId}`,
        });
      }
    });
  });
  planningPackage.brief.geoAeo.answerTargets.forEach((target, targetIndex) => {
    target.claimIds.forEach((claimId, claimIndex) => {
      usedClaimIds.add(claimId);
      if (!knownClaimIds.has(claimId)) {
        context.addIssue({
          code: "custom",
          path: ["brief", "geoAeo", "answerTargets", targetIndex, "claimIds", claimIndex],
          message: `claimId desconhecido: ${claimId}`,
        });
      }
    });
  });

  planningPackage.evidence.claims.forEach((claim, claimIndex) => {
    if (claim.material && !usedClaimIds.has(claim.id)) {
      context.addIssue({
        code: "custom",
        path: ["evidence", "claims", claimIndex],
        message: "todo claim material deve aparecer no outline ou em um answer target",
      });
    }
  });

  const componentSet = new Set(planningPackage.brief.components);
  if (componentSet.size !== planningPackage.brief.components.length) {
    context.addIssue({ code: "custom", path: ["brief", "components"], message: "componentes nÃ£o podem se repetir" });
  }
  if (componentSet.has("none") && componentSet.size > 1) {
    context.addIssue({ code: "custom", path: ["brief", "components"], message: "none nÃ£o pode coexistir com outro componente" });
  }
  if (componentSet.has("faq") !== planningPackage.brief.geoAeo.faq.include) {
    context.addIssue({
      code: "custom",
      path: ["brief", "geoAeo", "faq"],
      message: "a decisÃ£o de FAQ deve corresponder ao componente faq",
    });
  }
  if (componentSet.has("table") !== planningPackage.brief.geoAeo.table.include) {
    context.addIssue({
      code: "custom",
      path: ["brief", "geoAeo", "table"],
      message: "a decisÃ£o de tabela deve corresponder ao componente table",
    });
  }
});
export type EditorialPlanningPackage = z.infer<typeof editorialPlanningPackageSchema>;

export const gateDecisionSchema = z.object({
  gateId: z.string().min(1),
  artifactHash: z.string().min(16),
  pass: z.boolean(),
  blockingFindings: z.array(z.string()),
  warnings: z.array(z.string()),
  retryToStage: z.string().nullable(),
  decidedAt: z.string().datetime(),
  reviewerId: z.string().nullable().optional(),
});
export type GateDecision = z.infer<typeof gateDecisionSchema>;

export function parseAgentOutput<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  // Alguns modelos compatíveis envolvem o objeto em uma lista mesmo quando o
  // contrato pede um objeto. Cada candidato ainda precisa satisfazer o schema;
  // quando há mais de um candidato válido, usamos o primeiro de forma
  // determinística e deixamos os gates editoriais fazerem a validação final.
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  if (Array.isArray(value)) {
    const matches = value
      .map((candidate) => schema.safeParse(candidate))
      .filter((result): result is z.ZodSafeParseSuccess<T> => result.success);
    if (matches.length > 0) return matches[0].data;
  }
  const detail = parsed.error.issues
    .slice(0, 8)
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ");
  if (Array.isArray(value) && value.length === 1) {
    const item = schema.safeParse(value[0]);
    if (!item.success) {
      const itemDetail = item.error.issues
        .slice(0, 8)
        .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
        .join("; ");
      throw new Error(`${label} inválido: resposta veio em lista de 1 item; item: ${itemDetail}`);
    }
  }
  if (Array.isArray(value) && value.length > 1) {
    throw new Error(`${label} inválido: lista com ${value.length} itens, mas nenhum candidato satisfaz o schema`);
  }
  throw new Error(`${label} inválido: ${detail}`);
}
