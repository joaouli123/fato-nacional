import { NextResponse } from "next/server";
import sharp from "sharp";
import { getArticles } from "@/lib/data/repository";
import { generateArticleImage, imagePromptFor } from "@/lib/images/openai-image";
import { fetchStockImage } from "@/lib/images/stock";
import { r2Put, r2Configured } from "@/lib/images/r2";
import { logGeneration, IMAGE_COST_ESTIMATE } from "@/lib/cost/generation-log";

// gpt-image-1 pricing (USD per 1M tokens): input text $5, output image $40.
function imageCostUsd(inputTokens: number, outputTokens: number): number {
  const cost = (inputTokens / 1_000_000) * 5 + (outputTokens / 1_000_000) * 40;
  return cost > 0 ? Math.round(cost * 1e5) / 1e5 : IMAGE_COST_ESTIMATE;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Token-protected. source="stock" pulls a free, relevant stock photo (Pexels/
// Pixabay/Openverse, no per-image cost); source="ai" generates via OpenAI.
// Always optimizes to a light 16:9 WebP before uploading to R2.
export async function POST(req: Request) {
  const token = req.headers.get("x-admin-token");
  if (!token || token !== process.env.IMAGE_GEN_TOKEN) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!r2Configured()) {
    return NextResponse.json({ ok: false, error: "R2 not configured" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    slug?: string;
    prompt?: string;
    source?: "ai" | "stock";
    query?: string;
  };
  const source = body.source === "stock" ? "stock" : "ai";
  if (source === "ai" && !process.env.OPENAI_IMAGE_API_KEY) {
    return NextResponse.json({ ok: false, error: "OpenAI not configured" }, { status: 400 });
  }

  const articles = (await getArticles()).filter((a) => !body.slug || a.slug === body.slug);
  const generated: Record<string, string> = {};
  const credits: Record<string, string> = {};
  const errors: Record<string, string> = {};

  for (const article of articles) {
    try {
      let webp: Buffer;

      if (source === "stock") {
        const query = body.query || article.headline;
        const stock = await fetchStockImage(query);
        if (!stock) {
          errors[article.slug] = "nenhuma imagem de banco encontrada";
          continue;
        }
        webp = await sharp(stock.buffer)
          .resize(1600, 900, { fit: "cover", position: "attention" })
          .webp({ quality: 80 })
          .toBuffer();
        credits[article.slug] = stock.credit;
        await logGeneration({
          slug: article.slug,
          title: article.headline,
          kind: "image",
          provider: `stock:${stock.provider}`,
          model: stock.provider,
          costUsd: 0,
        });
      } else {
        const prompt = body.prompt || imagePromptFor(article.headline, article.category);
        const img = await generateArticleImage(prompt, { size: "1536x1024" });
        if (!img?.base64) {
          errors[article.slug] = "generation returned empty";
          continue;
        }
        webp = await sharp(Buffer.from(img.base64, "base64")).webp({ quality: 82 }).toBuffer();
        const inT = img.usage?.inputTokens ?? 0;
        const outT = img.usage?.outputTokens ?? 0;
        await logGeneration({
          slug: article.slug,
          title: article.headline,
          kind: "image",
          provider: "openai",
          model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
          inputTokens: inT,
          outputTokens: outT,
          costUsd: imageCostUsd(inT, outT),
        });
      }

      const key = `articles/${article.slug}.webp`;
      await r2Put(key, webp, "image/webp");
      generated[article.slug] = `/api/media/${key}`;
    } catch (e) {
      errors[article.slug] = (e as Error).message;
    }
  }

  return NextResponse.json({ ok: true, count: Object.keys(generated).length, source, generated, credits, errors });
}
