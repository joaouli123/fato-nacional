import { NextResponse } from "next/server";
import { r2Get } from "@/lib/images/r2";

export const runtime = "nodejs";

// Serves R2 objects through the app (authenticated S3 GET), so the bucket can
// stay private. Cloudflare edge-caches the response (immutable, 1y).
// 404s must NOT be cached — otherwise a miss before the image exists gets
// pinned at the edge and the real image never shows.
const notFound = () =>
  new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const path = (key ?? []).join("/");
  if (!path) return notFound();

  const obj = await r2Get(path);
  if (!obj) return notFound();

  return new NextResponse(new Uint8Array(obj.body), {
    headers: {
      "Content-Type": obj.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
