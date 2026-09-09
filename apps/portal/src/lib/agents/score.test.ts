import { describe, expect, it } from "vitest";
import type { Article } from "@/lib/data/seed";
import { analyzeTextQuality, scoreArticle, type ScoreArticleOptions } from "./score";

function uniqueWords(count: number): string {
  return Array.from({ length: count }, (_, index) => `conteudo${index}`).join(" ");
}

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    slug: "guia-editorial-confiavel",
    headline: "Guia editorial confiável para decisões conscientes",
    description: "Descrição do artigo",
    category: "brasil",
    author: "Mesa Editorial",
    publishedAt: "2026-07-10T10:00:00.000Z",
    readingTime: "8 min",
    image: "/api/media/articles/guia.webp",
    imageAlt: "Ilustração editorial do assunto",
    tags: ["Guia"],
    content: [],
    seoTitle: "Guia editorial confiável para decisões conscientes",
    metaDescription: "Uma explicação editorial detalhada, verificável e prática para ajudar o leitor brasileiro a tomar decisões com contexto e segurança.",
    updatedAt: "2026-07-10T11:00:00.000Z",
    ...overrides,
  };
}

function completeHtml(body = uniqueWords(1_250)): string {
  return `
    <p class="article-lead">Explicação direta, verificável e útil para o leitor.</p>
    <h2>Resumo em 5 pontos</h2>
    <ul>
      <li>Ponto concreto número um para decidir</li>
      <li>Ponto concreto número dois para comparar</li>
      <li>Ponto concreto número três para conferir</li>
      <li>Ponto concreto número quatro para evitar</li>
      <li>Ponto concreto número cinco para agir</li>
    </ul>
    <blockquote>Este conteúdo é educativo e não constitui recomendação individual.</blockquote>
    <h2>Como funciona</h2><p>${body}</p>
    <h2>Como comparar</h2><p>Critérios objetivos ajudam a comparar alternativas.</p>
    <h2>O que fazer</h2><p>Confira as condições e os documentos antes de decidir.</p>
    <table>
      <thead><tr><th>Critério</th><th>Como conferir</th></tr></thead>
      <tbody><tr><td>Prazo</td><td>Leia o contrato</td></tr></tbody>
    </table>
    <h2>Perguntas frequentes</h2>
    <h3>Como começar a análise?</h3><p>Compare primeiro as condições verificáveis.</p>
    <h3>Quando pedir ajuda?</h3><p>Procure orientação profissional quando necessário.</p>
    <h2>Fontes consultadas</h2>
    <ul>
      <li><a href="https://www.bcb.gov.br/estabilidadefinanceira/pix">Banco Central</a></li>
      <li><a href="https://www.gov.br/fazenda/pt-br/assuntos/noticias/guia">Ministério da Fazenda</a></li>
      <li><a href="https://www.camara.leg.br/noticias/123456-guia-oficial/">Câmara</a></li>
    </ul>
    <p>
      <a href="/artigos/artigo-um">Artigo um</a>
      <a href="/artigos/artigo-dois">Artigo dois</a>
      <a href="/artigos/artigo-tres">Artigo três</a>
    </p>`;
}

const strictOptions: ScoreArticleOptions = {
  validInternalSlugs: new Set(["artigo-um", "artigo-dois", "artigo-tres"]),
  strictInternalLinks: true,
};

describe("detector de repetição e genericidade", () => {
  it("não transforma repetição em profundidade", () => {
    const paragraph =
      "Planejamento exige contexto fonte data exemplo comparação risco prazo custo decisão responsável para cada pessoa.";
    const repeatedHtml = Array.from({ length: 100 }, () => `<p>${paragraph}</p>`).join("");
    const article = makeArticle({ contentHtml: repeatedHtml });

    const result = scoreArticle(article);
    const depth = result.checks.find((check) => check.key === "profundidade");

    expect(result.metrics.rawWordCount).toBeGreaterThan(1_200);
    expect(result.metrics.effectiveWordCount).toBeLessThan(300);
    expect(depth?.points).toBe(0);
    expect(result.hardBlockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "severe_repetition" })]),
    );
    expect(result.passes).toBe(false);
  });

  it("sinaliza clichês editoriais recorrentes", () => {
    const cliches = `
      No cenário atual, é importante destacar escolhas. Em um mundo cada vez mais conectado, vale ressaltar limites.
      Nos dias de hoje, este tema desempenha um papel crucial. Neste artigo, continue lendo porque isso pode fazer toda a diferença.
      Em suma, no cenário atual, é importante destacar escolhas. Em um mundo cada vez mais conectado, vale ressaltar limites.
      Nos dias de hoje, este tema desempenha um papel fundamental. Neste artigo, continue lendo porque isso pode fazer toda a diferença.`;
    const metrics = analyzeTextQuality(`<p>${cliches}</p><p>${uniqueWords(250)}</p>`);
    const result = scoreArticle(makeArticle({ contentHtml: `<p>${cliches}</p><p>${uniqueWords(250)}</p>` }));

    expect(metrics.generic).toBe(true);
    expect(metrics.genericitySignals.length).toBeGreaterThanOrEqual(4);
    expect(result.penalties).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "genericidade" })]),
    );
    expect(result.hardBlockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "generic_content" })]),
    );
  });
});

describe("validação adversarial de evidências e componentes", () => {
  it("não considera links externos genéricos como fontes oficiais", () => {
    const html = `
      <h2>Fontes consultadas</h2>
      <a href="https://example.com/estudo">Exemplo</a>
      <a href="https://medium.com/@autor/texto">Medium</a>
      <a href="https://meublog.blogspot.com/post">Blog</a>
      <a href="https://www.gov.br/">Home de órgão público sem página específica</a>`;
    const result = scoreArticle(makeArticle({ category: "financas", contentHtml: html }), {
      humanReview: { reviewerId: "editor-1", approvedAt: "2026-07-10T12:00:00.000Z" },
      officialSourceUrls: ["https://example.com/estudo"],
      isOfficialSource: () => true,
    });

    expect(result.metrics.externalLinkCount).toBe(4);
    expect(result.metrics.officialSourceCount).toBe(0);
    expect(result.checks.find((check) => check.key === "fontesOficiais")?.points).toBe(0);
    expect(result.hardBlockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "insufficient_official_sources" })]),
    );
  });

  it("não pontua wrappers vazios de FAQ e tabela", () => {
    const html = `
      <h2>Perguntas frequentes</h2><h3></h3><p></p><h3> </h3><p> </p>
      <table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td></td><td></td></tr></tbody></table>`;
    const result = scoreArticle(makeArticle({ contentHtml: html }));

    expect(result.metrics.meaningfulFaqPairs).toBe(0);
    expect(result.metrics.meaningfulTableCount).toBe(0);
    expect(result.checks.find((check) => check.key === "uxTabelaFaq")?.points).toBe(0);
  });

  it("pontua FAQ e tabela somente quando têm conteúdo útil", () => {
    const result = scoreArticle(makeArticle({ contentHtml: completeHtml() }), strictOptions);

    expect(result.metrics.meaningfulFaqPairs).toBe(2);
    expect(result.metrics.meaningfulTableCount).toBe(1);
    expect(result.checks.find((check) => check.key === "uxTabelaFaq")?.points).toBe(10);
  });

  it("não transforma componentes omitidos pelo brief em requisitos artificiais", () => {
    const noComponents = scoreArticle(makeArticle({ contentHtml: "<h2>Resposta direta</h2><p>Conteúdo objetivo e útil.</p>" }), {
      expectedComponents: [],
    });
    const faqRequired = scoreArticle(makeArticle({ contentHtml: "<h2>Resposta direta</h2><p>Conteúdo objetivo e útil.</p>" }), {
      expectedComponents: ["faq"],
    });

    expect(noComponents.checks.find((check) => check.key === "uxTabelaFaq")?.points).toBe(10);
    expect(faqRequired.checks.find((check) => check.key === "uxTabelaFaq")?.points).toBe(5);
  });
});

describe("contrato de links internos", () => {
  it("pontua somente alvos presentes no conjunto publicado e bloqueia os demais", () => {
    const html = `
      <a href="/artigos/existe">Existe</a>
      <a href="/artigos/quebrado-um">Quebrado um</a>
      <a href="/artigos/quebrado-dois">Quebrado dois</a>`;
    const result = scoreArticle(makeArticle({ contentHtml: html }), {
      validInternalSlugs: new Set(["existe"]),
    });

    expect(result.metrics.validInternalLinkCount).toBe(1);
    expect(result.metrics.invalidInternalSlugs).toEqual(["quebrado-um", "quebrado-dois"]);
    expect(result.checks.find((check) => check.key === "linksInternos")?.points).toBe(5);
    expect(result.hardBlockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "invalid_internal_link" })]),
    );
  });

  it("não pontua links sem resolver e permite fail-closed explícito", () => {
    const html = `<a href="/artigos/alvo">Alvo</a>`;
    const compatible = scoreArticle(makeArticle({ contentHtml: html }));
    const strict = scoreArticle(makeArticle({ contentHtml: html }), { strictInternalLinks: true });

    expect(compatible.metrics.validInternalLinkCount).toBe(0);
    expect(compatible.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "unverified_internal_links" })]),
    );
    expect(strict.hardBlockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "internal_link_validation_unavailable" })]),
    );
  });

  it("aceita um resolver síncrono como alternativa ao conjunto", () => {
    const result = scoreArticle(
      makeArticle({ contentHtml: `<a href="/artigos/alvo-real">Alvo real</a>` }),
      { resolveInternalLink: (slug) => slug === "alvo-real" },
    );

    expect(result.metrics.validInternalLinkCount).toBe(1);
    expect(result.hardBlockers.some((issue) => issue.code === "invalid_internal_link")).toBe(false);
  });

  it("não deixa um caminho interno malformado desaparecer da auditoria", () => {
    const result = scoreArticle(makeArticle({ contentHtml: `<a href="/artigos/">Sem slug</a>` }), {
      validInternalSlugs: new Set(["artigo-real"]),
    });

    expect(result.metrics.internalLinkCount).toBe(1);
    expect(result.hardBlockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "invalid_internal_link" })]),
    );
  });
});

describe("decisão estruturada do portão", () => {
  it("aprova um artigo completo de baixo risco e preserva a escala 0–100", () => {
    const result = scoreArticle(makeArticle({ contentHtml: completeHtml() }), strictOptions);

    expect(result.score).toBe(100);
    expect(result.max).toBe(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.hardBlockers).toEqual([]);
    expect(result.decision).toBe("approved");
    expect(result.passes).toBe(true);
  });

  it("exige revisão humana identificada em YMYL mesmo com nota máxima", () => {
    const article = makeArticle({ category: "financas", contentHtml: completeHtml() });
    const withoutReview = scoreArticle(article, strictOptions);
    const withReview = scoreArticle(article, {
      ...strictOptions,
      contentHash: "sha256:versao-1",
      humanReview: {
        reviewerId: "editor-financas-1",
        approvedAt: "2026-07-10T12:00:00.000Z",
        contentHash: "sha256:versao-1",
      },
    });

    expect(withoutReview.score).toBe(100);
    expect(withoutReview.decision).toBe("human_review_required");
    expect(withoutReview.passes).toBe(false);
    expect(withReview.hardBlockers).toEqual([]);
    expect(withReview.passes).toBe(true);
  });

  it("bloqueia achados factuais críticos independentemente da nota", () => {
    const result = scoreArticle(makeArticle({ contentHtml: completeHtml() }), {
      ...strictOptions,
      criticalIssues: ["A taxa citada não corresponde à fonte primária."],
    });

    expect(result.score).toBe(100);
    expect(result.passes).toBe(false);
    expect(result.decision).toBe("rejected");
    expect(result.hardBlockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "critical_factual_issue" })]),
    );
  });

  it("mantém compatibilidade da chamada com um único argumento", () => {
    const result = scoreArticle(makeArticle({ contentHtml: "<p>Texto curto, porém válido.</p>" }));

    expect(result).toEqual(
      expect.objectContaining({
        slug: "guia-editorial-confiavel",
        max: 100,
        checks: expect.any(Array),
        missing: expect.any(Array),
      }),
    );
  });
});
