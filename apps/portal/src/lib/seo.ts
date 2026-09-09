import type { Article } from "@/lib/data/seed";
import { getCategory } from "@/lib/data/repository";
import { absoluteUrl, slugify } from "@/lib/utils";
import { siteConfig } from "@/lib/site";
import { getPublicReviewStatus } from "@/lib/editorial-transparency";

const LOGO_URL = absoluteUrl("/logo.svg");

/** Publisher block reused across schemas (NewsMediaOrganization). */
function publisher() {
  return {
    "@type": "NewsMediaOrganization",
    name: siteConfig.name,
    url: absoluteUrl(),
    logo: { "@type": "ImageObject", url: LOGO_URL, width: 600, height: 60 },
  };
}

/** Organization / publisher schema for the site root. */
export function createOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: siteConfig.name,
    url: absoluteUrl(),
    logo: { "@type": "ImageObject", url: LOGO_URL, width: 600, height: 60 },
    description: siteConfig.description,
    email: "contato@fatonacional.com",
    foundingDate: "2026",
    knowsLanguage: "pt-BR",
    diversityPolicy: absoluteUrl("/politica-editorial"),
    ethicsPolicy: absoluteUrl("/politica-editorial"),
    correctionsPolicy: absoluteUrl("/politica-de-correcoes"),
  };
}

/** WebSite schema with a SearchAction so Google can offer a sitelinks searchbox. */
export function createWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: absoluteUrl(),
    inLanguage: "pt-BR",
    publisher: publisher(),
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/busca")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export type Crumb = { name: string; url: string };

export function createBreadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

/** FAQPage schema from extracted Q&A pairs. Returns null if empty. */
export function createFaqJsonLd(faq: Array<{ q: string; a: string }>) {
  if (!faq || faq.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

/** Extract FAQ pairs from a contentHtml body (the <h2>FAQ</h2> section of <h3>q</h3><p>a</p>). */
export function extractFaqFromHtml(html: string): Array<{ q: string; a: string }> {
  if (!html) return [];
  const lower = html.toLowerCase();
  const idx = lower.indexOf("perguntas frequentes");
  if (idx === -1) return [];
  const section = html.slice(idx);
  const pairs: Array<{ q: string; a: string }> = [];
  const re = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    const q = m[1].replace(/<[^>]+>/g, "").trim();
    const a = m[2].replace(/<[^>]+>/g, "").trim();
    if (q && a) pairs.push({ q, a });
  }
  return pairs;
}

/** Normalize any date/datetime string to full ISO 8601 (with time + timezone). */
function toIso(d: string): string {
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? d : parsed.toISOString();
}

const ORGANIZATIONAL_BYLINE =
  /(?:^|\s)(mesa|equipe|reda[cç][aã]o|diretoria|correspondente|analista)(?:\s|$)/i;

/** A desk/team byline must not be represented as a fictional Person entity. */
export function articleAuthorSchemaType(authorName: string): "Person" | "Organization" {
  return ORGANIZATIONAL_BYLINE.test(authorName) ? "Organization" : "Person";
}

/**
 * Build the article schema. The legacy function name is retained for callers,
 * but evergreen explainers use the generic Article type; NewsArticle is used
 * only when the CMS explicitly classifies the content as news.
 */
export async function createNewsArticleJsonLd(article: Article) {
  const category = await getCategory(article.category);
  const articleUrl = absoluteUrl(`/artigos/${article.slug}`);
  const imageUrl = article.image.startsWith("http") ? article.image : absoluteUrl(article.image);
  // dateModified must never precede datePublished.
  const publishedMs = new Date(article.publishedAt).getTime();
  const editorialUpdatedAt = article.editorialUpdatedAt || article.updatedAt;
  const updatedMs = editorialUpdatedAt ? new Date(editorialUpdatedAt).getTime() : NaN;
  const modified =
    !Number.isNaN(updatedMs) && updatedMs >= publishedMs
      ? (editorialUpdatedAt as string)
      : article.publishedAt;
  const review = getPublicReviewStatus(article);

  return {
    "@context": "https://schema.org",
    "@type": article.contentType === "news" ? "NewsArticle" : "Article",
    "@id": `${articleUrl}#article`,
    headline: article.headline,
    ...(article.seoTitle && article.seoTitle !== article.headline
      ? { alternativeHeadline: article.seoTitle }
      : {}),
    description: article.metaDescription || article.description,
    isAccessibleForFree: true,
    image: {
      "@type": "ImageObject",
      url: imageUrl,
      caption: article.imageCaption || article.imageAlt || article.headline,
      width: 1600,
      height: 900,
      representativeOfPage: true,
    },
    datePublished: toIso(article.publishedAt),
    dateModified: toIso(modified),
    inLanguage: "pt-BR",
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    articleSection: category?.name || article.category,
    keywords: article.tags.join(", "),
    author: {
      "@type": articleAuthorSchemaType(article.author),
      name: article.author,
      url: absoluteUrl(`/autores/${slugify(article.author)}`),
    },
    ...(review.kind === "verified"
      ? {
          reviewedBy: {
            "@type": "Person",
            name: review.reviewer.name,
          },
        }
      : {}),
    publisher: publisher(),
  };
}
