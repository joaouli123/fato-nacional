import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { fetchGoogleNews } from "@/lib/ingest/google-news";
import { recommendForTopic } from "@/lib/dedup/similarity";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Editorial trend ingestion: pulls recent Google News headlines per category and
 * upserts them as Topics (+ their outlets as Sources). Token-protected.
 * Trigger: POST with header `x-cron-token: <AUTOMATION_TOKEN>`.
 * CRON_TOKEN and INIT_SCHEMA_TOKEN remain compatibility aliases during migration.
 */
export async function POST(request: Request) {
  const token = request.headers.get("x-cron-token");
  const acceptedTokens = [
    process.env.AUTOMATION_TOKEN,
    process.env.CRON_TOKEN,
    process.env.INIT_SCHEMA_TOKEN,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  if (!token || acceptedTokens.length === 0 || !acceptedTokens.includes(token)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const payload = await getPayload({ config });
  const cats = await payload.find({ collection: "categories", limit: 50, depth: 0, overrideAccess: true });
  const categories = cats.docs as unknown as Array<{ id: number | string; name: string; slug: string }>;

  let topicsCreated = 0;
  let topicsSkipped = 0;
  let sourcesCreated = 0;
  const errors: string[] = [];

  for (const cat of categories) {
    let items;
    try {
      items = await fetchGoogleNews(cat.name, 6);
    } catch (error) {
      errors.push(`${cat.slug}: ${(error as Error).message}`);
      continue;
    }

    for (const item of items) {
      try {
        const existingSrc = await payload.find({
          collection: "sources",
          where: { url: { equals: item.link } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        });
        if (!existingSrc.docs.length) {
          await payload.create({
            collection: "sources",
            data: { name: item.source, url: item.link, sourceType: "recognized_media", reliability: 0.7 },
            overrideAccess: true,
          });
          sourcesCreated++;
        }
      } catch {
        // unique-url races / conflicts — non-fatal
      }

      const tslug = slugify(item.title).slice(0, 80) || `topico-${item.link.length}`;
      try {
        const existingTopic = await payload.find({
          collection: "topics",
          where: { slug: { equals: tslug } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        });
        if (existingTopic.docs.length) {
          topicsSkipped++;
          continue;
        }
        const rec = await recommendForTopic(item.title);
        await payload.create({
          collection: "topics",
          data: {
            title: item.title,
            slug: tslug,
            summary: rec.similarTo
              ? `Tendência via ${item.source}. Similar à matéria "${rec.similarTo.headline}" (${Math.round(rec.similarTo.similarity * 100)}%).`
              : `Tendência capturada do Google News via ${item.source}.`,
            primaryKeyword: cat.name,
            category: cat.id,
            riskLevel: "low",
            recommendedAction: rec.action,
          },
          overrideAccess: true,
        });
        topicsCreated++;
      } catch (error) {
        errors.push(`topic ${tslug}: ${(error as Error).message}`);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    categories: categories.length,
    topicsCreated,
    topicsSkipped,
    sourcesCreated,
    errors: errors.slice(0, 5),
  });
}
