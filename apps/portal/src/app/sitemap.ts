import type { MetadataRoute } from "next";
import { getArticles, getAuthors, getCategories } from "@/lib/data/repository";
import { institutionalPages } from "@/lib/institutional";
import { absoluteUrl, slugify } from "@/lib/utils";

export const revalidate = 300;

function latestModified(
  articles: Array<{ publishedAt: string; updatedAt?: string }>,
): Date | undefined {
  const timestamps = articles
    .map((article) => new Date(article.updatedAt || article.publishedAt).getTime())
    .filter(Number.isFinite);
  if (timestamps.length === 0) return undefined;
  return new Date(Math.max(...timestamps));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // `absoluteUrl()` returns the site root with a trailing slash when called
  // without a path. Strip it before appending route segments so the sitemap
  // never emits URLs such as `//artigos/...` (double slash), which Search
  // Console treats as separate discovered URLs.
  const base = absoluteUrl().replace(/\/$/, "");
  const [articles, categories, authors] = await Promise.all([
    getArticles(),
    getCategories(),
    getAuthors(),
  ]);
  const siteModified = latestModified(articles);

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: base,
      ...(siteModified ? { lastModified: siteModified } : {}),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${base}/autores`,
      ...(siteModified ? { lastModified: siteModified } : {}),
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  const institutionalEntries: MetadataRoute.Sitemap = Object.keys(institutionalPages).map(
    (slug) => ({
      url: `${base}/${slug}`,
      changeFrequency: "monthly",
      priority: 0.4,
    }),
  );

  return [
    ...staticEntries,
    ...articles.map((article) => ({
      url: `${base}/artigos/${article.slug}`,
      lastModified: new Date(article.updatedAt || article.publishedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...categories.map((category) => {
      const lastModified = latestModified(
        articles.filter((article) => article.category === category.slug),
      );
      return {
        url: `${base}/categoria/${category.slug}`,
        ...(lastModified ? { lastModified } : {}),
        changeFrequency: "daily" as const,
        priority: 0.6,
      };
    }),
    ...authors.map((author) => {
      const lastModified = latestModified(
        articles.filter((article) => slugify(article.author) === author.slug),
      );
      return {
        url: `${base}/autores/${author.slug}`,
        ...(lastModified ? { lastModified } : {}),
        changeFrequency: "weekly" as const,
        priority: 0.4,
      };
    }),
    ...institutionalEntries,
  ];
}
