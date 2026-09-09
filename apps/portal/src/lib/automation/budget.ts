import { getPool } from "@/lib/db/pool";
import type { AutomationSettings } from "./settings";

// Guarda de orçamento da automação: soma o gasto real registrado no generation_log
// (todas as chamadas de IA logam custo lá) e bloqueia novas gerações quando o teto
// diário/mensal configurado no /admin é atingido.

export type BudgetStatus = {
  dailyBudgetUsd: number;
  monthlyBudgetUsd: number;
  spentTodayUsd: number;
  spentMonthUsd: number;
  blocked: boolean;
  reason: string | null;
};

export async function getBudgetStatus(settings: AutomationSettings): Promise<BudgetStatus> {
  let spentToday = 0;
  let spentMonth = 0;
  try {
    const res = await getPool().query(`
      SELECT
        coalesce(sum(cost_usd) FILTER (WHERE created_at >= date_trunc('day', now())), 0)::float AS day,
        coalesce(sum(cost_usd) FILTER (WHERE created_at >= date_trunc('month', now())), 0)::float AS month
      FROM generation_log
    `);
    spentToday = Number(res.rows[0]?.day) || 0;
    spentMonth = Number(res.rows[0]?.month) || 0;
  } catch {
    // Sem log de custos (tabela ausente/erro transitório): não bloqueia, apenas não mede.
  }

  let reason: string | null = null;
  if (settings.dailyBudgetUsd > 0 && spentToday >= settings.dailyBudgetUsd) {
    reason = `gasto de hoje (US$ ${spentToday.toFixed(2)}) atingiu o teto diário (US$ ${settings.dailyBudgetUsd.toFixed(2)})`;
  } else if (settings.monthlyBudgetUsd > 0 && spentMonth >= settings.monthlyBudgetUsd) {
    reason = `gasto do mês (US$ ${spentMonth.toFixed(2)}) atingiu o teto mensal (US$ ${settings.monthlyBudgetUsd.toFixed(2)})`;
  }

  return {
    dailyBudgetUsd: settings.dailyBudgetUsd,
    monthlyBudgetUsd: settings.monthlyBudgetUsd,
    spentTodayUsd: Math.round(spentToday * 100) / 100,
    spentMonthUsd: Math.round(spentMonth * 100) / 100,
    blocked: reason !== null,
    reason,
  };
}

/**
 * Posts criados hoje PELA AUTOMAÇÃO (para o teto maxPostsPerDay).
 * Filtra por editorial_run_id: migrações, seeds e criações manuais no CMS
 * não consomem a cota do dia.
 */
export async function countArticlesCreatedToday(): Promise<number> {
  try {
    const res = await getPool().query(
      "SELECT count(*)::int AS n FROM articles WHERE created_at >= date_trunc('day', now()) AND editorial_run_id IS NOT NULL",
    );
    return Number(res.rows[0]?.n) || 0;
  } catch {
    return 0;
  }
}
