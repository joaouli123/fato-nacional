import { getArticles } from "@/lib/data/repository";
import { absoluteUrl, escapeXml } from "@/lib/utils";

export async function GET() {
  const articles = await getArticles();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${articles
  .map(
    (article) => {
      const imageUrl = article.image.startsWith("http")
        ? article.image
        : absoluteUrl(article.image);
      return `<url><loc>${escapeXml(absoluteUrl(`/artigos/${article.slug}`))}</loc><image:image><image:loc>${escapeXml(imageUrl)}</image:loc><image:caption>${escapeXml(article.imageAlt || article.headline)}</image:caption><image:title>${escapeXml(article.headline)}</image:title></image:image></url>`;
    },
  )
  .join("")}
</urlset>`;

  return new Response(body, {
    headers: {
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      "content-type": "application/xml; charset=utf-8",
    },
  });
}
