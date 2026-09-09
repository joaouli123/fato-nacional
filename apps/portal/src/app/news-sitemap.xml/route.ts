import { getArticles } from "@/lib/data/repository";
import { siteConfig } from "@/lib/site";
import { absoluteUrl, escapeXml } from "@/lib/utils";

export async function GET() {
  const now = Date.now();
  const cutoff = now - 48 * 60 * 60 * 1000;
  const allArticles = await getArticles();
  const recentArticles = allArticles.filter((article) => {
    const publishedAt = new Date(article.publishedAt).getTime();
    return article.contentType === "news" && publishedAt >= cutoff && publishedAt <= now;
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${recentArticles
  .map(
    (article) => `<url><loc>${escapeXml(absoluteUrl(`/artigos/${article.slug}`))}</loc><news:news><news:publication><news:name>${escapeXml(siteConfig.name)}</news:name><news:language>pt</news:language></news:publication><news:publication_date>${escapeXml(article.publishedAt)}</news:publication_date><news:title>${escapeXml(article.headline)}</news:title></news:news></url>`,
  )
  .join("")}
</urlset>`;

  return new Response(body, {
    headers: {
      "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=300",
      "content-type": "application/xml; charset=utf-8",
    },
  });
}
