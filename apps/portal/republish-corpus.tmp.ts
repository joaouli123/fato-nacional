// @ts-nocheck — script utilitário de uso único (removido após a execução); fora do gate de build.
// Republicação do acervo corrigido — roda LOCALMENTE apontando para o Postgres de
// produção (DATABASE_URL), com NODE_ENV=production (Payload nunca faz push de schema
// em produção). Usa a Payload local API para que os hooks oficiais (recibo de revisão,
// validações) sejam aplicados. Uso único; removido após a execução.
import { readFileSync, existsSync } from "node:fs";
import { getPayload } from "payload";
import config from "./src/payload.config";
import { articles as seedArticles } from "./src/lib/data/seed";

type PlanItem = {
  slug: string;
  headline: string;
  source: "db" | "seed";
  approved: boolean;
};

const SCRATCH = process.env.SCRATCH_DIR!;
const REVIEWER_EMAIL = process.env.REVIEWER_EMAIL || "jl.uli1996@gmail.com";

function minimalLexical(text: string) {
  return {
    root: {
      type: "root", format: "", indent: 0, version: 1, direction: "ltr" as const,
      children: [
        {
          type: "paragraph", format: "", indent: 0, version: 1, direction: "ltr" as const,
          children: [{ type: "text", detail: 0, format: 0, mode: "normal", style: "", text, version: 1 }],
        },
      ],
    },
  };
}

function fixedHtml(slug: string): string | null {
  const path = `${SCRATCH}/review-corpus/fixed/${slug}.html`;
  if (!existsSync(path)) return null;
  let html = readFileSync(path, "utf8");
  // Remove o <h1> de exportação (primeira linha) — o headline vive fora do corpo.
  html = html.replace(/^<h1>[\s\S]*?<\/h1>\s*/i, "");
  return html.trim();
}

async function main() {
  const plan: PlanItem[] = JSON.parse(readFileSync(`${SCRATCH}/republish-plan.json`, "utf8"));
  const payload = await getPayload({ config });

  // Usuário revisor (admin) — os hooks estampam o recibo com ele.
  const users = await payload.find({
    collection: "users",
    where: { email: { equals: REVIEWER_EMAIL } },
    limit: 1,
    overrideAccess: true,
  });
  const reviewer = users.docs[0];
  if (!reviewer) throw new Error(`usuário revisor não encontrado: ${REVIEWER_EMAIL}`);
  const reqUser = { ...reviewer, collection: "users" as const };
  console.log(`REVIEWER: id=${reviewer.id} ${reviewer.email} role=${(reviewer as { role?: string }).role}`);

  const categories = await payload.find({ collection: "categories", limit: 100, overrideAccess: true });
  const catBySlug = new Map(categories.docs.map((c) => [(c as { slug: string }).slug, c.id]));
  const authors = await payload.find({ collection: "authors", limit: 100, overrideAccess: true });
  const authorByName = new Map(authors.docs.map((a) => [(a as { name: string }).name, a.id]));

  const results: Array<{ slug: string; action: string; ok: boolean; error?: string }> = [];

  const only = process.env.SLUG_ONLY;
  let step = "";
  for (const item of plan) {
    if (only && item.slug !== only) continue;
    if (!item.approved) {
      results.push({ slug: item.slug, action: "pulado (não aprovado na re-verificação)", ok: true });
      continue;
    }
    const html = fixedHtml(item.slug);
    try {
      if (item.source === "db") {
        const found = await payload.find({
          collection: "articles",
          where: { slug: { equals: item.slug } },
          limit: 1,
          overrideAccess: true,
        });
        const doc = found.docs[0];
        if (!doc) throw new Error("artigo não encontrado no CMS");
        await payload.update({
          collection: "articles",
          id: doc.id,
          data: {
            ...(html ? { contentHtml: html } : {}),
            status: "published",
            _status: "published",
            editorialUpdatedAt: new Date().toISOString(),
          },
          user: reqUser,
          overrideAccess: true,
        });
        results.push({ slug: item.slug, action: html ? "db: corrigido + republicado c/ recibo" : "db: republicado c/ recibo", ok: true });
      } else {
        const seed = seedArticles.find((a) => a.slug === item.slug);
        if (!seed) throw new Error("seed não encontrado");
        if (!html) throw new Error("HTML corrigido ausente");
        const categoryId = catBySlug.get(seed.category);
        if (!categoryId) throw new Error(`categoria inexistente no CMS: ${seed.category}`);
        let authorId = authorByName.get(seed.author);
        if (!authorId) {
          const createdAuthor = await payload.create({
            collection: "authors",
            data: {
              name: seed.author,
              slug: seed.author.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
              role: "Redação",
            },
            overrideAccess: true,
          });
          authorId = createdAuthor.id;
          authorByName.set(seed.author, authorId);
        }
        const description = seed.description || seed.summary || seed.headline;
        step = `create(author=${authorId},cat=${categoryId})`;
        // Passo 1: cria como rascunho SEM user (o hook de conteúdo sensível só exige
        // revisor na publicação). Passo 2: publica COM user → hook estampa o recibo.
        const created = await payload.create({
          collection: "articles",
          data: {
            headline: seed.headline,
            seoTitle: (seed.seoTitle || seed.headline).slice(0, 70),
            socialTitle: (seed.seoTitle || seed.headline).slice(0, 70),
            description,
            slug: seed.slug,
            primaryKeyword: (seed.tags && seed.tags[0]) || seed.headline.slice(0, 80),
            primaryCategory: categoryId,
            author: authorId,
            summary: seed.summary || description,
            readingTime: seed.readingTime,
            content: minimalLexical(seed.summary || description),
            contentHtml: html,
            imagePath: seed.imagePath || seed.image,
            imageAlt: seed.imageAlt,
            imageCaption: seed.imageCaption,
            imageCredit: seed.imageCredit,
            imageProvider: seed.imageProvider,
            imageLicense: seed.imageLicense,
            imageSourceUrl: seed.imageSourceUrl,
            contentType: seed.contentType || "article",
            riskLevel: seed.riskLevel || "low",
            status: "approved",
            _status: "draft",
            publishedAt: seed.publishedAt,
            meta: { title: (seed.seoTitle || seed.headline).slice(0, 70), description: seed.metaDescription || description.slice(0, 160) },
          },
          overrideAccess: true,
        });
        step = `update(id=${created.id})`;
        await payload.update({
          collection: "articles",
          id: created.id,
          data: {
            status: "published",
            _status: "published",
            editorialUpdatedAt: new Date().toISOString(),
          },
          user: reqUser,
          overrideAccess: true,
        });
        results.push({ slug: item.slug, action: "seed → CMS: criado + publicado c/ recibo", ok: true });
      }
    } catch (e) {
      const detail = JSON.stringify((e as { data?: unknown }).data ?? {}).slice(0, 300);
      results.push({ slug: item.slug, action: `${item.source} @${step}`, ok: false, error: (e as Error).message.slice(0, 160) + " :: " + detail });
    }
  }

  for (const r of results) {
    console.log(`${r.ok ? "OK " : "ERR"} | ${r.action} | ${r.slug}${r.error ? " | " + r.error : ""}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`DONE ok=${results.length - failed} failed=${failed}`);
  process.exit(0);
}

main().catch((e) => { console.error("FATAL: " + e.message); process.exit(1); });
