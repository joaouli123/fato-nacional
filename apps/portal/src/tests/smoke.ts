import { getArticle, getArticles } from "@/lib/data/repository";
import { runAgent } from "@/lib/agents/orchestrator";
import { createNewsArticleJsonLd } from "@/lib/seo";
import { GET as getNewsSitemap } from "@/app/news-sitemap.xml/route";

async function main() {
  const articles = await getArticles();
  if (articles.length < 3) {
    throw new Error("portal smoke failed: seed articles missing");
  }

  if (!(await getArticle(articles[0].slug))) {
    throw new Error("portal smoke failed: article lookup broken");
  }

  const jsonLd = await createNewsArticleJsonLd(articles[0]);
  if (jsonLd["@type"] !== "NewsArticle" || !jsonLd.mainEntityOfPage["@id"]) {
    throw new Error("portal smoke failed: NewsArticle structured data incomplete");
  }

  const now = Date.now();
  const expectedNewsCount = articles.filter((article) => {
    const publishedAt = new Date(article.publishedAt).getTime();
    return publishedAt >= now - 48 * 60 * 60 * 1000 && publishedAt <= now;
  }).length;
  const newsXml = await (await getNewsSitemap()).text();
  const actualNewsCount = newsXml.match(/<news:news>/g)?.length || 0;
  if (actualNewsCount !== expectedNewsCount) {
    throw new Error("portal smoke failed: news sitemap window is incorrect");
  }

  const result = await runAgent("radar", "teste editorial");
  if (!result.topicScore || !result.quality) {
    throw new Error("portal smoke failed: agent result incomplete");
  }

  console.log("portal smoke ok");
}

void main();
