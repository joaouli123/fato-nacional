// @ts-nocheck — script utilitário de uso único (removido após a execução).
// Varredura total do acervo: pontua TODOS os artigos publicados com o scorer
// determinístico (com slugs válidos + recibo) e exporta os que estão abaixo da
// barra (92 YMYL / 85 geral) para o corpus de correção — qualquer editoria.
import { writeFileSync, mkdirSync } from "node:fs";
import { getArticles } from "./src/lib/data/repository";
import { scoreArticle, YMYL_CATEGORIES } from "./src/lib/agents/score";
import { articles as seedArticles } from "./src/lib/data/seed";

const OUT = process.env.CORPUS_DIR!;
mkdirSync(OUT, { recursive: true });
mkdirSync(OUT + "/fixed", { recursive: true });

const articles = await getArticles();
const validInternalSlugs = new Set(articles.map((a) => a.slug));
const seedSlugs = new Set(seedArticles.map((a) => a.slug));

const items = [];
const summary = [];
for (const a of articles) {
  const result = scoreArticle(a, {
    validInternalSlugs,
    humanReview:
      a.reviewer && a.reviewedAt && a.reviewedContentHash && a.reviewedVersionMatches === true
        ? { reviewerId: a.reviewer.id, approvedAt: a.reviewedAt, contentHash: a.reviewedContentHash }
        : undefined,
  });
  const sensitive = YMYL_CATEGORIES.includes(a.category);
  const bar = sensitive ? 92 : 85;
  summary.push(`${String(result.score).padStart(3)} | bar ${bar} | ${a.category} | ${a.slug.slice(0, 55)}`);
  if (result.score >= bar) continue;

  const html = a.contentHtml || (a.content || []).join("\n");
  const htmlFile = `${OUT}/${a.slug}.html`;
  writeFileSync(htmlFile, `<h1>${a.headline}</h1>\n` + html);
  // Deficiências do scorer viram contexto/issues iniciais para o corretor.
  const deficiencies = (result.criteria || result.findings || [])
    ? JSON.stringify(result, (k, v) => (k === "metrics" ? undefined : v), 1).slice(0, 4000)
    : "";
  const issuesFile = `${OUT}/${a.slug}.score.json`;
  writeFileSync(issuesFile, JSON.stringify({ score: result.score, bar, detail: result }, null, 1));
  items.push({
    slug: a.slug,
    headline: a.headline,
    category: a.category,
    sensitive,
    score: result.score,
    bar,
    source: seedSlugs.has(a.slug) && !a.reviewedContentHash ? "seed" : "db",
    htmlFile,
    scoreFile: issuesFile,
    fixedFile: `${OUT}/fixed/${a.slug}.html`,
  });
}

writeFileSync(`${OUT}/corpus.json`, JSON.stringify({ items, validSlugs: [...validInternalSlugs] }));
console.log(summary.sort().join("\n"));
console.log(`\nBELOW-BAR: ${items.length} artigos exportados para correção`);
for (const i of items) console.log(`  ${i.score}/${i.bar} | ${i.category} | [${i.source}] ${i.slug.slice(0, 55)}`);
process.exit(0);
