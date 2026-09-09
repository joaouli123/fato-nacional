import { getArticles } from "@/lib/data/repository";
import { siteConfig } from "@/lib/site";
import { absoluteUrl, escapeXml } from "@/lib/utils";

export const revalidate = 300;

export async function GET() {
  const articles = (await getArticles()).slice(0, 30);
  const items = articles
    .map((article) => {
      const url = absoluteUrl(`/artigos/${article.slug}`);
      return `    <item>
      <title>${escapeXml(article.headline)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(article.metaDescription || article.description)}</description>
      <category>${escapeXml(article.category)}</category>
      <dc:creator>${escapeXml(article.author)}</dc:creator>
      <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${escapeXml(absoluteUrl())}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>pt-BR</language>
    <lastBuildDate>${new Date(articles[0]?.publishedAt || Date.now()).toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(absoluteUrl("/rss.xml"))}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
