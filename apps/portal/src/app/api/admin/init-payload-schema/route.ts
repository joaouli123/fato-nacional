import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const token = request.headers.get("x-init-schema-token");
  if (!process.env.INIT_SCHEMA_TOKEN || token !== process.env.INIT_SCHEMA_TOKEN) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    message: "Payload schema initialization is managed by Payload migrations/runtime.",
  });
}
