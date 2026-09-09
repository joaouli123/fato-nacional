import { getPool } from "@/lib/db/pool";

export type GenKind = "text" | "image";

export type GenLogEntry = {
  slug?: string | null;
  title?: string | null;
  kind: GenKind;
  /** Etapa do pipeline: pauta, pesquisa, escrita, revisão, correção, lapidação, seo, reparo, atualização, imagem. */
  stage?: string | null;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd: number;
};

/** Estimated USD cost of one gpt-image-1 render (1536x1024). Labelled as estimate. */
export const IMAGE_COST_ESTIMATE = 0.08;

const SEED_IMAGE_SLUGS = [
  "taxa-selic-decisao-copom-impacto-investimentos-renda-fixa",
  "regulamentacao-ia-brasil-impacto-empresas-direitos",
  "inflacao-alimentos-brasil-previsao-segundo-semestre",
  "guerra-comercial-chips-tecnologia-global-consequencias",
  "pix-automatico-como-funciona-o-que-muda-pagamentos",
  "agentes-de-ia-na-redacao-fluxo-editorial-revisao-humana",
  "calendario-editorial-semanal-21-pautas-sem-canibalizacao",
];

let ready = false;

async function ensureTable(): Promise<void> {
  if (ready) return;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS generation_log (
      id SERIAL PRIMARY KEY,
      slug TEXT,
      title TEXT,
      kind TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd NUMERIC(10, 5) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`ALTER TABLE generation_log ADD COLUMN IF NOT EXISTS stage TEXT`);
  // Backfill the 7 initial article images (idempotent).
  for (const slug of SEED_IMAGE_SLUGS) {
    await pool.query(
      `INSERT INTO generation_log (slug, kind, provider, model, output_tokens, cost_usd)
       SELECT $1, 'image', 'openai', 'gpt-image-1', 1568, $2
       WHERE NOT EXISTS (SELECT 1 FROM generation_log WHERE slug = $1 AND kind = 'image')`,
      [slug, IMAGE_COST_ESTIMATE],
    );
  }
  ready = true;
}

export async function logGeneration(e: GenLogEntry): Promise<void> {
  try {
    await ensureTable();
    await getPool().query(
      `INSERT INTO generation_log (slug, title, kind, stage, provider, model, input_tokens, output_tokens, cost_usd)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        e.slug ?? null,
        e.title ?? null,
        e.kind,
        e.stage ?? null,
        e.provider,
        e.model,
        e.inputTokens ?? 0,
        e.outputTokens ?? 0,
        e.costUsd,
      ],
    );
  } catch {
    // logging must never break generation
  }
}

export type CostRow = {
  slug: string | null;
  title: string | null;
  kind: string;
  stage: string | null;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: string;
  created_at: string;
};

export type CostData = {
  rows: CostRow[];
  totalUsd: number;
  count: number;
  tokens: number;
  byDay: Array<{ day: string; usd: number }>;
  byProvider: Array<{ provider: string; usd: number; count: number }>;
};

/** Dados de custo. `days` limita a janela (undefined = tudo). */
export async function getCostData(days?: number): Promise<CostData> {
  try {
    await ensureTable();
    const pool = getPool();
    const where = days ? `WHERE created_at >= now() - interval '${Math.max(1, Math.floor(days))} days'` : "";
    const rows = (
      await pool.query(
        `SELECT slug, title, kind, stage, provider, model, input_tokens, output_tokens, cost_usd, created_at
         FROM generation_log ${where} ORDER BY created_at DESC LIMIT 1000`,
      )
    ).rows as CostRow[];
    const totalRow = (
      await pool.query(
        `SELECT COALESCE(SUM(cost_usd),0) AS s, COUNT(*) AS c,
                COALESCE(SUM(input_tokens + output_tokens),0) AS t
         FROM generation_log ${where}`,
      )
    ).rows[0];
    const byDay = (
      await pool.query(
        `SELECT to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS day, SUM(cost_usd) AS usd
         FROM generation_log ${where} GROUP BY day ORDER BY day DESC LIMIT 30`,
      )
    ).rows;
    const byProvider = (
      await pool.query(
        `SELECT provider, SUM(cost_usd) AS usd, COUNT(*) AS count FROM generation_log ${where} GROUP BY provider ORDER BY usd DESC`,
      )
    ).rows;
    return {
      rows,
      totalUsd: Number(totalRow.s),
      count: Number(totalRow.c),
      tokens: Number(totalRow.t),
      byDay: byDay.map((r) => ({ day: r.day, usd: Number(r.usd) })),
      byProvider: byProvider.map((r) => ({ provider: r.provider, usd: Number(r.usd), count: Number(r.count) })),
    };
  } catch {
    return { rows: [], totalUsd: 0, count: 0, tokens: 0, byDay: [], byProvider: [] };
  }
}
