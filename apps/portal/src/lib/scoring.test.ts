import { describe, expect, it } from "vitest";
import { calculateTopicScore, classifyTopic, calculateArticleQuality } from "@nexo/shared";

describe("topic scoring", () => {
  it("sums all components", () => {
    const score = calculateTopicScore({
      recentGrowth: 15,
      growthProbability: 15,
      brazilRelevance: 10,
      seoPotential: 15,
      discoverPotential: 10,
      commercialIntent: 10,
      sourceQuality: 10,
      competitorOpportunity: 5,
      originalContentPotential: 10,
    });
    expect(score).toBe(100);
  });
  it("classifies by threshold", () => {
    expect(classifyTopic(90)).toBe("publicar rapidamente");
    expect(classifyTopic(72)).toBe("produzir nas próximas 24 horas");
    expect(classifyTopic(60)).toBe("calendário semanal");
    expect(classifyTopic(40)).toBe("acompanhar ou arquivar");
  });
});

describe("article quality", () => {
  const base = {
    factualAccuracy: 25,
    originalValue: 20,
    searchIntent: 15,
    editorialClarity: 10,
    authorityTransparency: 10,
    onPageSeo: 8,
    technicalSeo: 7,
    imageDiscover: 5,
    hasSevereFactualError: false,
    riskLevel: "low" as const,
  };
  it("rejects when there is a severe factual error", () => {
    expect(calculateArticleQuality({ ...base, hasSevereFactualError: true }).decision).toBe("rejeitar");
  });
  it("requires human review when risk is high", () => {
    expect(calculateArticleQuality({ ...base, riskLevel: "high" }).decision).toBe(
      "revisão humana obrigatória",
    );
  });
  it("auto-publishes a high-score low-risk article", () => {
    const result = calculateArticleQuality(base);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.decision).toBe("publicação automática");
  });
});
