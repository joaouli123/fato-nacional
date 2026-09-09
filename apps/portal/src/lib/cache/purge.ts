const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://fatonacional.com").replace(/\/$/, "");
const ZONE = process.env.CLOUDFLARE_ZONE_ID;
const TOKEN = process.env.CLOUDFLARE_PURGE_TOKEN;

/** True when a Cloudflare zone + a token with Cache Purge permission are configured. */
export function purgeConfigured(): boolean {
  return Boolean(ZONE && TOKEN);
}

type PurgeResult = { ok: boolean; purged?: number; error?: string; skipped?: boolean };

/** Purge specific URLs from the Cloudflare edge cache. No-op (skipped) until configured. */
export async function purgeCloudflare(urls: string[]): Promise<PurgeResult> {
  if (!purgeConfigured()) return { ok: true, skipped: true };
  const files = Array.from(new Set(urls.filter(Boolean)));
  if (files.length === 0) return { ok: true, purged: 0 };

  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE}/purge_cache`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      // Cloudflare accepts at most 30 files per call.
      body: JSON.stringify({ files: files.slice(0, 30) }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      errors?: Array<{ message?: string }>;
    };
    if (!res.ok || json?.success === false) {
      return { ok: false, error: json?.errors?.[0]?.message || `HTTP ${res.status}` };
    }
    return { ok: true, purged: files.length };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Purge everything in the zone (use sparingly, e.g. after a full redeploy). */
export async function purgeEverything(): Promise<PurgeResult> {
  if (!purgeConfigured()) return { ok: true, skipped: true };
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE}/purge_cache`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ purge_everything: true }),
    });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; errors?: Array<{ message?: string }> };
    if (!res.ok || json?.success === false) {
      return { ok: false, error: json?.errors?.[0]?.message || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** The standard set of URLs to purge when an article is published or updated. */
export function articlePurgeUrls(slug: string, categorySlug?: string, authorSlug?: string): string[] {
  const b = SITE;
  const urls = [
    `${b}/artigos/${slug}`,
    `${b}/`,
    `${b}/rss.xml`,
    `${b}/sitemap.xml`,
    `${b}/news-sitemap.xml`,
    `${b}/image-sitemap.xml`,
  ];
  if (categorySlug) urls.push(`${b}/categoria/${categorySlug}`);
  if (authorSlug) urls.push(`${b}/autores/${authorSlug}`);
  return urls;
}
