// Assuntos em alta no Brasil — combustível do slot "notícia quente" do cron.
// Fontes gratuitas e estáveis: Google Trends (RSS, geo=BR) + manchetes do G1 (RSS).
// Só extraímos TÍTULOS (descoberta de pauta); o conteúdo é apurado e escrito do zero.

export type TrendItem = { source: string; title: string };

function extractTitles(xml: string, limit: number): string[] {
  const titles: string[] = [];
  const re = /<title>(?:<!\[CDATA\[)?([^<\]]+)(?:\]\]>)?<\/title>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) && titles.length < limit + 1) {
    const t = m[1].trim();
    if (t) titles.push(t);
  }
  return titles.slice(1, limit + 1); // primeiro <title> é o do feed
}

async function fetchXml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; FatoNacionalBot/1.0)" },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function fetchTrendingBR(): Promise<TrendItem[]> {
  const [trends, g1] = await Promise.all([
    fetchXml("https://trends.google.com/trending/rss?geo=BR"),
    fetchXml("https://g1.globo.com/rss/g1/"),
  ]);
  const out: TrendItem[] = [];
  if (trends) for (const t of extractTitles(trends, 20)) out.push({ source: "google-trends", title: t });
  if (g1) for (const t of extractTitles(g1, 15)) out.push({ source: "g1", title: t });
  return out;
}
