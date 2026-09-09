/**
 * Free stock-image fetcher with provider fallback. Returns the first relevant,
 * legally-usable image. Pexels/Pixabay (free key, no per-image billing, best
 * quality) are tried first; Openverse (keyless, CC) is the no-account fallback.
 */
export type StockImage = {
  buffer: Buffer;
  contentType: string;
  credit: string;
  provider: string;
  license: string;
  sourceUrl: string;
};

type StockCandidate = {
  url: string;
  credit: string;
  license: string;
  sourceUrl: string;
};

const UA = "FatoNacional/1.0 (+https://fatonacional.com)";

// Escolhe entre os N primeiros resultados de forma determinística por query
// (em vez de sempre o primeiro) — evita que buscas parecidas caiam sempre na
// mesma foto quando dois artigos usam termos próximos.
function pickIndex(query: string, count: number): number {
  if (count <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < query.length; i++) hash = (hash * 31 + query.charCodeAt(i)) >>> 0;
  return hash % count;
}

async function download(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "image/jpeg";
    if (!ct.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 3000) return null; // reject tiny/placeholder
    return { buffer: buf, contentType: ct };
  } catch {
    return null;
  }
}

async function pexels(query: string): Promise<StockCandidate | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&size=large&per_page=5`,
      { headers: { Authorization: key } },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as {
      photos?: Array<{ src?: Record<string, string>; photographer?: string; url?: string }>;
    };
    const photos = j.photos || [];
    const p = photos[pickIndex(query, photos.length)];
    const url = p?.src?.large2x || p?.src?.large || p?.src?.original;
    if (!url) return null;
    return {
      url,
      credit: `Foto: ${p?.photographer ?? "Pexels"} / Pexels`,
      license: "Pexels License",
      sourceUrl: p?.url || "https://www.pexels.com/license/",
    };
  } catch {
    return null;
  }
}

async function pixabay(query: string): Promise<StockCandidate | null> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=5&safesearch=true`,
    );
    if (!res.ok) return null;
    const j = (await res.json()) as {
      hits?: Array<{ largeImageURL?: string; webformatURL?: string; user?: string; pageURL?: string }>;
    };
    const hits = j.hits || [];
    const h = hits[pickIndex(query, hits.length)];
    const url = h?.largeImageURL || h?.webformatURL;
    if (!url) return null;
    return {
      url,
      credit: `Imagem: ${h?.user ?? "Pixabay"} / Pixabay`,
      license: "Pixabay Content License",
      sourceUrl: h?.pageURL || "https://pixabay.com/service/license-summary/",
    };
  } catch {
    return null;
  }
}

async function openverse(query: string): Promise<StockCandidate | null> {
  try {
    const res = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license_type=commercial&size=large&page_size=8`,
      { headers: { "User-Agent": UA } },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as {
      results?: Array<{
        url?: string;
        creator?: string;
        license?: string;
        license_url?: string;
        foreign_landing_url?: string;
      }>;
    };
    const results = (j.results || []).filter((x) => x.url);
    const r = results[pickIndex(query, results.length)];
    if (!r?.url) return null;
    return {
      url: r.url,
      credit: `${r.creator ?? "Openverse"} / ${(r.license ?? "CC").toUpperCase()}`,
      license: (r.license ?? "CC").toUpperCase(),
      sourceUrl: r.foreign_landing_url || r.license_url || "https://openverse.org/",
    };
  } catch {
    return null;
  }
}

export async function fetchStockImage(query: string): Promise<StockImage | null> {
  const providers: Array<[string, (q: string) => Promise<StockCandidate | null>]> = [
    ["pexels", pexels],
    ["pixabay", pixabay],
    ["openverse", openverse],
  ];
  for (const [name, provider] of providers) {
    const r = await provider(query);
    if (r?.url) {
      const dl = await download(r.url);
      if (dl) {
        return {
          ...dl,
          credit: r.credit,
          provider: name,
          license: r.license,
          sourceUrl: r.sourceUrl,
        };
      }
    }
  }
  return null;
}
