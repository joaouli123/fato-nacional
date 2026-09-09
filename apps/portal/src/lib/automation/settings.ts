import { getPool } from "@/lib/db/pool";

// Configurações da automação editorial, controladas pelo /admin.
// Persistidas em uma tabela própria (linha única, JSONB) via pool pg compartilhado —
// mesmo padrão auto-criável do generation_log/newsletter, sem drift de schema Payload.

export type AutomationSlot = "news" | "evergreen" | "service" | "update";

export type ScheduleEntry = {
  /** Hora UTC (0-23) em que o slot dispara (minuto fixo :05). */
  hourUtc: number;
  slot: AutomationSlot;
  /** Quantos posts gerar neste horário (1-3). */
  count: number;
  enabled: boolean;
};

export type AutomationSettings = {
  /** Chave geral: desligada, o cron não publica nada. */
  enabled: boolean;
  /** Teto duro de posts criados por dia (contando todos os slots). */
  maxPostsPerDay: number;
  /** Grade horária configurável (substitui a grade fixa do cron). */
  schedule: ScheduleEntry[];
  /** Slugs das editorias que a automação pode pautar. */
  categoriesEnabled: string[];
  /** Temas/keywords a priorizar quando houver demanda real. */
  preferredTopics: string[];
  /** Temas proibidos (pauta é rejeitada se título/keyword contiver o termo). */
  blockedTopics: string[];
  /** Teto de gasto em USD por dia (0 = sem limite). */
  dailyBudgetUsd: number;
  /** Teto de gasto em USD por mês (0 = sem limite). */
  monthlyBudgetUsd: number;
  /** true = TODO post (não só YMYL) nasce como rascunho aguardando revisão humana. */
  requireHumanReviewAll: boolean;
  updatedAt?: string;
  updatedBy?: string;
};

export const AUTOMATION_SLOTS: readonly AutomationSlot[] = ["news", "evergreen", "service", "update"];

export const KNOWN_CATEGORIES = [
  "financas",
  "brasil",
  "tecnologia-e-ia",
  "mundo",
  "esportes",
  "games",
  "entretenimento",
] as const;

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  enabled: true,
  maxPostsPerDay: 5,
  schedule: [
    { hourUtc: 11, slot: "news", count: 1, enabled: true },
    { hourUtc: 14, slot: "evergreen", count: 1, enabled: true },
    { hourUtc: 17, slot: "evergreen", count: 1, enabled: true },
    { hourUtc: 20, slot: "service", count: 1, enabled: true },
    { hourUtc: 23, slot: "update", count: 1, enabled: true },
  ],
  categoriesEnabled: [...KNOWN_CATEGORIES],
  preferredTopics: [],
  blockedTopics: [],
  dailyBudgetUsd: 0,
  monthlyBudgetUsd: 0,
  requireHumanReviewAll: false,
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? Math.round(value) : parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function clampMoney(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n * 100) / 100;
}

function cleanStringList(value: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .map((v) => String(v ?? "").trim().slice(0, maxLen))
      .filter(Boolean),
  )].slice(0, maxItems);
}

/** Normaliza qualquer entrada para um AutomationSettings seguro. */
export function sanitizeAutomationSettings(raw: Partial<AutomationSettings> | null | undefined): AutomationSettings {
  const d = DEFAULT_AUTOMATION_SETTINGS;
  const input = raw ?? {};

  const schedule: ScheduleEntry[] = Array.isArray(input.schedule)
    ? input.schedule
        .map((e) => ({
          hourUtc: clampInt(e?.hourUtc, 0, 23, -1),
          slot: (AUTOMATION_SLOTS as readonly string[]).includes(String(e?.slot)) ? (e!.slot as AutomationSlot) : "evergreen",
          count: clampInt(e?.count, 1, 3, 1),
          enabled: e?.enabled !== false,
        }))
        .filter((e) => e.hourUtc >= 0)
        .slice(0, 24)
    : d.schedule;

  const categories = cleanStringList(input.categoriesEnabled, 20, 60)
    .map((c) => c.toLowerCase());

  return {
    enabled: input.enabled !== false,
    maxPostsPerDay: clampInt(input.maxPostsPerDay, 1, 20, d.maxPostsPerDay),
    schedule: schedule.length ? schedule : d.schedule,
    categoriesEnabled: categories.length ? categories : d.categoriesEnabled,
    preferredTopics: cleanStringList(input.preferredTopics, 30, 120),
    blockedTopics: cleanStringList(input.blockedTopics, 50, 120),
    dailyBudgetUsd: clampMoney(input.dailyBudgetUsd, d.dailyBudgetUsd),
    monthlyBudgetUsd: clampMoney(input.monthlyBudgetUsd, d.monthlyBudgetUsd),
    requireHumanReviewAll: input.requireHumanReviewAll === true,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : undefined,
    updatedBy: typeof input.updatedBy === "string" ? input.updatedBy : undefined,
  };
}

let tableReady = false;
async function ensureTable(): Promise<void> {
  if (tableReady) return;
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS automation_settings (
      id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  tableReady = true;
}

/** Lê as configurações; em qualquer erro cai nos defaults (comportamento atual). */
export async function getAutomationSettings(): Promise<AutomationSettings> {
  try {
    await ensureTable();
    const res = await getPool().query("SELECT data, updated_at FROM automation_settings WHERE id = 1");
    if (!res.rows.length) return { ...DEFAULT_AUTOMATION_SETTINGS };
    const saved = sanitizeAutomationSettings(res.rows[0].data as Partial<AutomationSettings>);
    saved.updatedAt = new Date(res.rows[0].updated_at).toISOString();
    return saved;
  } catch {
    return { ...DEFAULT_AUTOMATION_SETTINGS };
  }
}

export async function saveAutomationSettings(
  patch: Partial<AutomationSettings>,
  updatedBy?: string,
): Promise<AutomationSettings> {
  await ensureTable();
  const current = await getAutomationSettings();
  const next = sanitizeAutomationSettings({ ...current, ...patch });
  next.updatedAt = new Date().toISOString();
  next.updatedBy = updatedBy || patch.updatedBy || current.updatedBy;
  await getPool().query(
    `INSERT INTO automation_settings (id, data, updated_at) VALUES (1, $1, now())
     ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = now()`,
    [JSON.stringify(next)],
  );
  return next;
}

/** true se o texto contém algum dos temas bloqueados (case/acento-insensível básico). */
export function matchesBlockedTopic(text: string, blockedTopics: string[]): string | null {
  if (!blockedTopics.length) return null;
  const norm = (v: string) => v.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const haystack = norm(text);
  for (const topic of blockedTopics) {
    const needle = norm(topic).trim();
    if (needle && haystack.includes(needle)) return topic;
  }
  return null;
}
