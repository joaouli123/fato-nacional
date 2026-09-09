import { NextResponse } from "next/server";
import { authenticatePayload } from "@/lib/auth";
import {
  getAutomationSettings,
  saveAutomationSettings,
  type AutomationSettings,
} from "@/lib/automation/settings";
import { getBudgetStatus, countArticlesCreatedToday } from "@/lib/automation/budget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Leitura/gravação das configurações da automação editorial.
// Auth: sessão do Payload (admin/editor) — usada pelo formulário do /admin —
// ou token de automação (mesmos aceitos pelo cron) para uso programático.

const STAFF_ROLES = new Set(["admin", "editor"]);

async function authorize(request: Request): Promise<{ ok: boolean; who: string }> {
  const token = request.headers.get("x-admin-token") || request.headers.get("x-cron-token");
  if (token) {
    const accepted = [process.env.AUTOMATION_TOKEN, process.env.CRON_TOKEN, process.env.IMAGE_GEN_TOKEN]
      .filter((value): value is string => Boolean(value));
    if (accepted.some((value) => value === token)) return { ok: true, who: "token" };
  }
  try {
    const { user } = await authenticatePayload(request.headers);
    const role = (user as { role?: string } | null)?.role || "";
    if (user && STAFF_ROLES.has(role)) return { ok: true, who: user.email || `user:${user.id}` };
  } catch {
    // sem sessão válida
  }
  return { ok: false, who: "" };
}

export async function GET(request: Request) {
  const auth = await authorize(request);
  if (!auth.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await getAutomationSettings();
  const [budget, postsToday] = await Promise.all([
    getBudgetStatus(settings),
    countArticlesCreatedToday(),
  ]);
  return NextResponse.json(
    { ok: true, settings, budget, postsToday },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (!auth.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as Partial<AutomationSettings> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "corpo inválido" }, { status: 400 });
  }

  const saved = await saveAutomationSettings(body, auth.who);
  const budget = await getBudgetStatus(saved);
  return NextResponse.json({ ok: true, settings: saved, budget });
}
