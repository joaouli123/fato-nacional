import { describe, expect, it } from "vitest";
import {
  getPublicReviewStatus,
  isPubliclyEligibleArticle,
  isSensitiveArticle,
} from "@/lib/editorial-transparency";
import type { Article } from "@/lib/data/seed";

const validHash = "a".repeat(64);

function article(overrides: Partial<Article> = {}): Article {
  return {
    slug: "exemplo",
    headline: "Exemplo",
    description: "Exemplo",
    category: "brasil",
    author: "Redação Fato Nacional",
    publishedAt: "2026-07-10T12:00:00.000Z",
    readingTime: "5 min",
    image: "/imagem.webp",
    tags: [],
    content: [],
    ...overrides,
  };
}

describe("public editorial transparency", () => {
  it("treats finance and high-risk content as sensitive", () => {
    expect(isSensitiveArticle(article({ category: "financas" }))).toBe(true);
    expect(isSensitiveArticle(article({ riskLevel: "high" }))).toBe(true);
    expect(isSensitiveArticle(article())).toBe(false);
  });

  it("quarantines sensitive content without a hash-bound human review", () => {
    expect(isPubliclyEligibleArticle(article({ category: "financas" }))).toBe(false);
    expect(
      isPubliclyEligibleArticle(
        article({
          category: "financas",
          reviewer: { id: "reviewer-1", name: "Maria" },
          reviewedAt: "2026-07-10T12:00:00.000Z",
          reviewedContentHash: validHash,
          reviewedVersionMatches: false,
        }),
      ),
    ).toBe(false);
  });

  it("allows sensitive content only when the exact version has verified review", () => {
    const reviewed = article({
      category: "financas",
      reviewer: { id: "reviewer-1", name: "Maria" },
      reviewedAt: "2026-07-10T12:00:00.000Z",
      reviewedContentHash: validHash,
      reviewedVersionMatches: true,
    });

    expect(getPublicReviewStatus(reviewed).kind).toBe("verified");
    expect(isPubliclyEligibleArticle(reviewed)).toBe(true);
  });

  it("keeps low-risk content public while reporting no human reviewer", () => {
    const unreviewed = article();
    expect(getPublicReviewStatus(unreviewed)).toEqual({ kind: "none" });
    expect(isPubliclyEligibleArticle(unreviewed)).toBe(true);
  });
});
