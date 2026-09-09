import { NextResponse } from "next/server";
import { agentKindSchema } from "@nexo/shared";
import { z } from "zod";
import { runAgent } from "@/lib/agents/orchestrator";
import { authenticatePayload } from "@/lib/auth";

const requestSchema = z.object({
  kind: agentKindSchema.default("radar"),
  topic: z.string().trim().min(3).max(300).default("tendencias de busca"),
});

export async function POST(request: Request) {
  let user;
  try {
    ({ user } = await authenticatePayload(request.headers));
  } catch (error) {
    console.error("[api/agents/run] authentication unavailable", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 503 });
  }
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await runAgent(parsed.data.kind, parsed.data.topic);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/agents/run] agent execution failed", {
      error: error instanceof Error ? error.message : String(error),
      kind: parsed.data.kind,
    });
    return NextResponse.json({ error: "Agent execution failed" }, { status: 502 });
  }
}
