import { NextResponse } from "next/server";
import { getAutomationSettings } from "@/lib/automation/settings";
import { getBudgetStatus, countArticlesCreatedToday } from "@/lib/automation/budget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Plano do dia para o agendador (apps/cron): grade horária configurada no /admin,
// teto diário e estado do orçamento. O cron consulta antes de cada disparo.

function authorized(request: Request): boolean {
  const token = request.headers.get("x-cron-token") || request.headers.get("x-admin-token");
  if (!token) return false;
  const accepted = [process.env.AUTOMATION_TOKEN, process.env.CRON_TOKEN, process.env.IMAGE_GEN_TOKEN]
    .filter((value): value is string => Boolean(value));
  return accepted.some((value) => token === value);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await getAutomationSettings();
  const [budget, postsToday] = await Promise.all([
    getBudgetStatus(settings),
    countArticlesCreatedToday(),
  ]);

  return NextResponse.json(
    {
      ok: true,
      enabled: settings.enabled,
      maxPostsPerDay: settings.maxPostsPerDay,
      postsToday,
      schedule: settings.schedule.filter((e) => e.enabled),
      budget,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
