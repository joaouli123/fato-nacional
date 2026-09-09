import config from "@payload-config";
import { getPayload } from "payload";
import { slugify } from "@/lib/utils";
import { rankRelatedArticles, type RelatedArticle } from "./related";
import { artifactHash } from "@/lib/agents/editorial-run";
import { isPubliclyEligibleArticle } from "@/lib/editorial-transparency";
import {
  articles as seedArticles,
  categories as seedCategories,
  authorProfiles,
  type Article,
  type ArticleReviewer,
  type Category,
} from "./seed";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1600&q=80";

const seedBySlug = new Map(seedArticles.map((article) => [article.slug, article]));

type LexicalNode = { type?: string; text?: string; children?: LexicalNode[] };

function lexicalToParagraphs(content: unknown): string[] {
  const root = (content as { root?: LexicalNode } | null)?.root;
  if (!root?.children) return [];
  return root.children
    .filter((node) => node.type === "paragraph")
    .map((node) => (node.children ?? []).map((child) => child.text ?? "").join(""))
    .filter((text) => text.trim().length > 0);
}

function readingTimeFor(paragraphs: string[]): string {
  const words = paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min`;
}

type ArticleDoc = {
  slug: string;
  headline: string;
  description?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  content?: unknown;
  contentHtml?: string | null;
  seoTitle?: string | null;
  summary?: string | null;
  readingTime?: string | null;
  updatedAt?: string | null;
  editorialUpdatedAt?: string | null;
  contentType?: "news" | "article" | "guide" | "service" | null;
  riskLevel?: "low" | "medium" | "high" | null;
  meta?: { title?: string | null; description?: string | null } | null;
  primaryCategory?: { slug?: string } | number | string | null;
  author?: { name?: string } | number | string | null;
  tags?: Array<{ name?: string } | string> | null;
  heroImage?: {
    url?: string | null;
    alt?: string | null;
    caption?: string | null;
    credit?: string | null;
  } | number | string | null;
  imagePath?: string | null;
  imageAlt?: string | null;
  imageCaption?: string | null;
  imageCredit?: string | null;
  imageProvider?: string | null;
  imageLicense?: string | null;
  imageSourceUrl?: string | null;
  reviewer?: { id?: string | number; name?: string | null } | number | string | null;
  reviewedAt?: string | null;
  reviewedContentHash?: string | null;
};

function populatedMedia(value: ArticleDoc["heroImage"]) {
  return value && typeof value === "object" ? value : undefined;
}

function mapReviewer(value: ArticleDoc["reviewer"]): ArticleReviewer | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "object") {
    if (value.id === null || value.id === undefined) return undefined;
    return {
      id: String(value.id),
      name: value.name?.trim() || "Revisor registrado no CMS",
    };
  }
  return { id: String(value), name: "Revisor registrado no CMS" };
}

function mapArticle(doc: ArticleDoc): Article {
  const seed = seedBySlug.get(doc.slug);
  // A CMS document is the canonical version. Seed data is used only when an
  // optional CMS field is genuinely absent (or when the slug has no DB doc at
  // all, handled by getArticles below).
  const category =
    doc.primaryCategory && typeof doc.primaryCategory === "object" && "slug" in doc.primaryCategory
      ? (doc.primaryCategory.slug ?? seed?.category ?? "brasil")
      : (seed?.category ?? "brasil");
  const author =
    doc.author && typeof doc.author === "object" && "name" in doc.author
      ? (doc.author.name ?? seed?.author ?? "Redacao")
      : (seed?.author ?? "Redacao");
  const paragraphs = lexicalToParagraphs(doc.content);
  const tags = Array.isArray(doc.tags)
    ? doc.tags
        .map((tag) => (typeof tag === "object" && tag && "name" in tag ? (tag.name ?? "") : String(tag)))
        .filter(Boolean)
    : (seed?.tags ?? []);
  const headline = doc.headline ?? seed?.headline ?? "";
  const html = doc.contentHtml ?? seed?.contentHtml ?? undefined;
  const htmlWords = html ? html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length : 0;
  const media = populatedMedia(doc.heroImage);
  const cmsImage =
    doc.imagePath?.trim() ||
    media?.url?.trim() || undefined;
  const image =
    cmsImage || seed?.image || (html ? `/api/media/articles/${doc.slug}.webp` : FALLBACK_IMAGE);
  const calculatedReadingTime =
    htmlWords > 0
      ? `${Math.max(1, Math.round(htmlWords / 200))} min`
      : paragraphs.length > 0
        ? readingTimeFor(paragraphs)
        : (seed?.readingTime ?? "1 min");
  const editorialUpdatedAt = doc.editorialUpdatedAt ?? seed?.updatedAt ?? undefined;
  const reviewer = mapReviewer(doc.reviewer);
  const reviewedContentHash = doc.reviewedContentHash?.trim() || undefined;
  const reviewedVersionMatches =
    reviewedContentHash && html
      ? reviewedContentHash.replace(/^sha256:/i, "") === artifactHash(html)
      : undefined;
  return {
    slug: doc.slug,
    headline,
    description: doc.description ?? seed?.description ?? "",
    category,
    author,
    publishedAt: doc.publishedAt ?? doc.createdAt ?? new Date(0).toISOString(),
    readingTime: doc.readingTime?.trim() || calculatedReadingTime,
    image,
    imagePath: doc.imagePath?.trim() || undefined,
    imageAlt:
      doc.imageAlt?.trim() ??
      media?.alt?.trim() ??
      seed?.imageAlt ??
      `Ilustração editorial sobre ${headline}`,
    imageCaption:
      doc.imageCaption?.trim() ?? media?.caption?.trim() ?? seed?.imageCaption ?? undefined,
    imageCredit: doc.imageCredit?.trim() ?? media?.credit?.trim() ?? seed?.imageCredit ?? undefined,
    imageProvider: doc.imageProvider?.trim() || undefined,
    imageLicense: doc.imageLicense?.trim() || undefined,
    imageSourceUrl: doc.imageSourceUrl?.trim() || undefined,
    tags,
    content:
      doc.content !== null && doc.content !== undefined ? paragraphs : (seed?.content ?? []),
    contentHtml: html,
    seoTitle: doc.seoTitle ?? doc.meta?.title ?? seed?.seoTitle ?? undefined,
    metaDescription: doc.meta?.description ?? seed?.metaDescription ?? undefined,
    summary: doc.summary ?? seed?.summary ?? undefined,
    editorialUpdatedAt,
    updatedAt: editorialUpdatedAt,
    contentType: doc.contentType ?? seed?.contentType ?? "article",
    riskLevel: doc.riskLevel ?? seed?.riskLevel ?? "low",
    reviewer,
    reviewedAt: doc.reviewedAt ?? undefined,
    reviewedContentHash,
    reviewedVersionMatches,
  };
}

async function dbArticles(): Promise<Article[] | null> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "articles",
      where: { _status: { equals: "published" } },
      depth: 1,
      limit: 200,
      sort: "-publishedAt",
      overrideAccess: true,
    });
    if (!res.docs.length) return null;
    return (res.docs as unknown as ArticleDoc[]).map(mapArticle);
  } catch {
    return null;
  }
}

export async function getArticles(): Promise<Article[]> {
  const db = await dbArticles();
  // Merge DB articles with seed-only curated posts (new articles not yet in the
  // DB), so new high-quality content ships via deploy without a DB write.
  let list: Article[];
  if (!db) {
    list = [...seedArticles];
  } else {
    const dbSlugs = new Set(db.map((a) => a.slug));
    list = [...db, ...seedArticles.filter((a) => !dbSlugs.has(a.slug))];
  }
  return list
    .filter(isPubliclyEligibleArticle)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export async function getArticle(slug: string): Promise<Article | null> {
  return (await getArticles()).find((article) => article.slug === slug) ?? null;
}

/**
 * "Leia também" for an article: only genuinely related posts, ranked by topical
 * relevance (shared tags, same desk + term overlap, or strong term overlap).
 * Returns `[]` when nothing is a real topical match — the page then renders no
 * related section instead of padding with random recent posts.
 */
export async function getRelatedArticles(
  slug: string,
  limit = 4,
): Promise<RelatedArticle[]> {
  const all = await getArticles();
  const source = all.find((article) => article.slug === slug);
  if (!source) return [];
  return rankRelatedArticles(source, all, { limit });
}

async function dbCategories(): Promise<Category[] | null> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "categories",
      depth: 0,
      limit: 100,
      overrideAccess: true,
    });
    if (!res.docs.length) return null;
    return (
      res.docs as unknown as Array<{
        slug: string;
        name: string;
        description?: string | null;
        color?: string | null;
      }>
    ).map((category) => {
      const seed = seedCategories.find((c) => c.slug === category.slug);
      return {
        slug: category.slug,
        name: seed?.name ?? category.name,
        description: seed?.description ?? category.description ?? "",
        color: seed?.color ?? category.color ?? "#0f766e",
      };
    });
  } catch {
    return null;
  }
}

export async function getCategories(): Promise<Category[]> {
  return (await dbCategories()) ?? seedCategories;
}

export async function getCategory(slug: string): Promise<Category | null> {
  return (await getCategories()).find((category) => category.slug === slug) ?? null;
}

export async function getArticlesByCategory(slug: string): Promise<Article[]> {
  return (await getArticles()).filter((article) => article.category === slug);
}

export type Tag = { slug: string; name: string; count: number };

export async function getTags(): Promise<Tag[]> {
  const articles = await getArticles();
  const map = new Map<string, Tag>();
  for (const article of articles) {
    for (const tag of article.tags || []) {
      const slug = slugify(tag);
      if (!slug) continue;
      const current = map.get(slug);
      if (current) current.count += 1;
      else map.set(slug, { slug, name: tag, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export async function getTag(slug: string): Promise<Tag | null> {
  return (await getTags()).find((tag) => tag.slug === slug) ?? null;
}

export async function getArticlesByTag(tagSlug: string): Promise<Article[]> {
  return (await getArticles()).filter((article) =>
    (article.tags || []).some((tag) => slugify(tag) === tagSlug),
  );
}

export type Author = {
  slug: string;
  name: string;
  role?: string;
  bio?: string;
  scope?: string;
  sources?: string;
  review?: string;
  criteria?: string[];
};

export async function getAuthors(): Promise<Author[]> {
  // Derive the editorial desks actually in use from the articles, enriched with
  // the curated bios/roles (E-E-A-T) from authorProfiles.
  const articles = await getArticles();
  const map = new Map<string, Author>();
  for (const article of articles) {
    const slug = slugify(article.author);
    if (!slug || map.has(slug)) continue;
    const profile = authorProfiles.find((p) => p.slug === slug);
    map.set(slug, profile ?? { slug, name: article.author });
  }
  return [...map.values()];
}

export async function getAuthor(slug: string): Promise<Author | null> {
  return (await getAuthors()).find((author) => author.slug === slug) ?? null;
}

export async function getArticlesByAuthor(authorSlug: string): Promise<Article[]> {
  return (await getArticles()).filter((article) => slugify(article.author) === authorSlug);
}
