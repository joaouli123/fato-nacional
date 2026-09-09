import { NextResponse } from "next/server";
import { articlePurgeUrls, purgeCloudflare, purgeConfigured, purgeEverything } from "@/lib/cache/purge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Token-protected manual cache purge.
// Body: { all?: boolean } | { urls?: string[] } | { slug?: string, category?: string, author?: string }
export async function POST(req: Request) {
  const token = req.headers.get("x-admin-token");
  if (!token || token !== process.env.IMAGE_GEN_TOKEN) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!purgeConfigured()) {
    return NextResponse.json(
      { ok: false, error: "cloudflare purge not configured (set CLOUDFLARE_ZONE_ID + CLOUDFLARE_PURGE_TOKEN)" },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    all?: boolean;
    urls?: string[];
    slug?: string;
    category?: string;
    author?: string;
  };

  if (body.all) {
    const result = await purgeEverything();
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  }

  const urls = body.urls?.length
    ? body.urls
    : body.slug
      ? articlePurgeUrls(body.slug, body.category, body.author)
      : [];

  if (!urls.length) {
    return NextResponse.json({ ok: false, error: "nothing to purge (pass all, urls or slug)" }, { status: 400 });
  }

  const result = await purgeCloudflare(urls);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
