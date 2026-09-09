import { describe, it, expect } from "vitest";
import { rankRelatedArticles } from "./related";
import type { Article } from "./seed";

const NOW = new Date("2026-07-01T00:00:00.000Z").getTime();

function makeArticle(slug: string, overrides: Partial<Article> = {}): Article {
  return {
    slug,
    headline: overrides.headline ?? slug,
    description: overrides.description ?? "",
    category: overrides.category ?? "brasil",
    author: overrides.author ?? "Redação",
    // Uniform date by default so the recency tie-breaker never perturbs
    // assertions that are meant to isolate topical relevance.
    publishedAt: overrides.publishedAt ?? "2026-06-01T00:00:00.000Z",
    readingTime: overrides.readingTime ?? "5 min",
    image: overrides.image ?? "/img.webp",
    tags: overrides.tags ?? [],
    content: overrides.content ?? [],
    summary: overrides.summary,
    contentHtml: overrides.contentHtml,
    contentType: overrides.contentType,
  };
}

const slugs = (articles: { slug: string }[]) => articles.map((a) => a.slug);

describe("rankRelatedArticles", () => {
  it("ranks a shared-tag match above a same-desk term-overlap match", () => {
    const source = makeArticle("pix-automatico", {
      category: "financas",
      tags: ["Pix", "Pagamentos"],
      headline: "Pix automático: como funciona nos pagamentos",
      summary: "Autorização recorrente de pagamentos com Pix e segurança",
    });
    const sharedTag = makeArticle("pix-golpes", {
      category: "financas",
      tags: ["Pix", "Segurança"],
      headline: "Golpes no Pix: como se proteger",
    });
    // No shared tag, but 3+ overlapping significant terms in the same category.
    const sameDeskTerms = makeArticle("autorizacao-pagamentos", {
      category: "financas",
      tags: ["Bancos"],
      headline: "Autorização recorrente de pagamentos em débito",
    });

    const result = rankRelatedArticles(source, [sharedTag, sameDeskTerms], {
      now: NOW,
    });

    expect(slugs(result)).toEqual(["pix-golpes", "autorizacao-pagamentos"]);
    expect(result[0].relevanceScore).toBeGreaterThan(result[1].relevanceScore);
  });

  it("drops a same-category article with no tag or term overlap (no random padding)", () => {
    const source = makeArticle("pix-automatico", {
      category: "financas",
      tags: ["Pix", "Pagamentos"],
      headline: "Pix automático: como funciona nos pagamentos",
      summary: "Autorização recorrente de pagamentos com Pix",
    });
    const related = makeArticle("pix-golpes", {
      category: "brasil",
      tags: ["Pix"],
      headline: "Golpes no Pix",
    });
    const sameCategoryUnrelated = makeArticle("o-que-e-cdi", {
      category: "financas",
      tags: ["CDI", "Renda Fixa"],
      headline: "O que é o CDI na renda fixa",
    });

    const result = rankRelatedArticles(source, [related, sameCategoryUnrelated], {
      now: NOW,
    });

    expect(slugs(result)).toEqual(["pix-golpes"]);
    expect(slugs(result)).not.toContain("o-que-e-cdi");
  });

  it("returns an empty list when nothing is genuinely related", () => {
    const source = makeArticle("o-que-e-cdi", {
      category: "financas",
      tags: ["CDI"],
      headline: "O que é o CDI",
    });
    const candidates = [
      makeArticle("bolsa-sobe", {
        category: "financas",
        tags: ["Bolsa"],
        headline: "Ações da bolsa sobem hoje",
      }),
      makeArticle("futebol-final", {
        category: "esportes",
        tags: ["Futebol"],
        headline: "Final do campeonato brasileiro de futebol",
      }),
    ];

    expect(rankRelatedArticles(source, candidates, { now: NOW })).toEqual([]);
  });

  it("never crosses categories on term overlap alone (requires a shared tag)", () => {
    const source = makeArticle("reforma-tributaria", {
      category: "brasil",
      tags: ["Reforma Tributária"],
      headline: "Reforma tributária muda impostos sobre consumo",
    });
    // Different category, no shared tag, but 3 overlapping terms (reforma,
    // impostos, consumo). Coincidental generic overlap must NOT relate them.
    const crossCategoryTerms = makeArticle("impostos-consumo", {
      category: "financas",
      tags: ["Economia"],
      headline: "Impostos e consumo mudam na reforma",
    });

    const result = rankRelatedArticles(source, [crossCategoryTerms], { now: NOW });

    expect(result).toEqual([]);
  });

  it("never includes the source article itself", () => {
    const source = makeArticle("pix-automatico", {
      category: "financas",
      tags: ["Pix"],
      headline: "Pix automático",
    });
    const other = makeArticle("pix-golpes", {
      category: "financas",
      tags: ["Pix"],
      headline: "Golpes no Pix",
    });

    const result = rankRelatedArticles(source, [source, other], { now: NOW });

    expect(slugs(result)).toEqual(["pix-golpes"]);
  });

  it("respects the limit", () => {
    const source = makeArticle("pix-automatico", { tags: ["Pix"] });
    const candidates = Array.from({ length: 6 }, (_, i) =>
      makeArticle(`pix-${i}`, { tags: ["Pix"], headline: `Pix assunto ${i}` }),
    );

    const result = rankRelatedArticles(source, candidates, { limit: 3, now: NOW });

    expect(result).toHaveLength(3);
  });

  it("uses recency only as a tie-breaker between equally relevant articles", () => {
    const source = makeArticle("pix-hoje", {
      category: "financas",
      tags: ["Pix"],
      headline: "Pix hoje",
    });
    const older = makeArticle("pix-antigo", {
      category: "financas",
      tags: ["Pix"],
      headline: "Pix explicado",
      publishedAt: "2026-06-01T00:00:00.000Z",
    });
    const newer = makeArticle("pix-recente", {
      category: "financas",
      tags: ["Pix"],
      headline: "Pix detalhado",
      publishedAt: "2026-06-20T00:00:00.000Z",
    });

    const result = rankRelatedArticles(source, [older, newer], { now: NOW });

    expect(slugs(result)).toEqual(["pix-recente", "pix-antigo"]);
  });
});
