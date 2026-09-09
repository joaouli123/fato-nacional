import { NextResponse } from "next/server";
import { isOpenAIConfigured } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "portal",
    openai: isOpenAIConfigured() ? "configured" : "mock-fallback",
    timestamp: new Date().toISOString(),
  });
}
