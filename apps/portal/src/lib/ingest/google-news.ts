import Parser from "rss-parser";

export type TrendItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
};

const parser = new Parser({ timeout: 15000 });

/**
 * Fetches recent Brazilian news for a query from Google News RSS (no API key).
 * Google News titles come as "Headline - Source"; we split that out.
 */
export async function fetchGoogleNews(query: string, limit = 8): Promise<TrendItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  const feed = await parser.parseURL(url);
  return (feed.items || [])
    .slice(0, limit)
    .map((item) => {
      const rawTitle = (item.title || "").trim();
      const dash = rawTitle.lastIndexOf(" - ");
      const title = dash > 0 ? rawTitle.slice(0, dash).trim() : rawTitle;
      const sourceField = (item as { source?: { _?: string } | string }).source;
      const source =
        (typeof sourceField === "object" && sourceField?._) ||
        (typeof sourceField === "string" ? sourceField : "") ||
        (dash > 0 ? rawTitle.slice(dash + 3).trim() : "Google News");
      return {
        title,
        link: (item.link || "").trim(),
        source,
        publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
      };
    })
    .filter((item) => item.title.length > 8 && item.link.startsWith("http"));
}
