import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { modelForAgent, type AiTask } from "./model-router";
import type { AgentKind } from "@nexo/shared";

/**
 * Multi-provider client — picks the API by model id prefix:
 *   gpt-* / o*        → OpenAI oficial (CHATGPT_API_KEY / OPENAI_CHATGPT_API_KEY)
 *   claude-*          → Anthropic (ANTHROPIC_API_KEY, endpoint OpenAI-compatible);
 *                       sem chave, cai para o motor GPT (a automação nunca trava)
 *   demais (glm, etc) → OpenCode Zen (OPENAI_API_KEY + OPENAI_BASE_URL)
 */

const clients = new Map<string, OpenAI>();

function cached(key: string, make: () => OpenAI): OpenAI {
  let c = clients.get(key);
  if (!c) {
    c = make();
    clients.set(key, c);
  }
  return c;
}

function openaiOfficialKey(): string | undefined {
  return (
    process.env.CHATGPT_API_KEY ||
    process.env.OPENAI_CHATGPT_API_KEY
  );
}

export function getAiClient() {
  const key = process.env.OPENCODE_API || process.env.OPENAI_API_KEY;
  if (!key) return null;
  return cached(
    "zen",
    () =>
      new OpenAI({
        apiKey: key,
        baseURL: process.env.OPENAI_BASE_URL || "https://opencode.ai/zen/go/v1",
        defaultHeaders: {
          // Console Go requires a stable session id to route compatible requests.
          "x-opencode-session": process.env.OPENCODE_SESSION_ID || randomUUID(),
        },
      }),
  );
}

type Routed = { client: OpenAI; provider: string; model: string };

function routeModel(model: string): Routed | null {
  const isGptFamily = /^(gpt-|o\d)/.test(model);
  const isClaudeFamily = /^claude-/.test(model);

  if (isClaudeFamily) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (key) {
      return {
        client: cached("anthropic", () => new OpenAI({ apiKey: key, baseURL: "https://api.anthropic.com/v1/" })),
        provider: "anthropic",
        model,
      };
    }
  }
  if (isGptFamily || isClaudeFamily) {
    const key = openaiOfficialKey();
    if (key) {
      // claude sem ANTHROPIC_API_KEY → lapidação roda no GPT (fallback transparente).
      const effective = isClaudeFamily ? process.env.AI_MODEL_HUMANIZE_FALLBACK || "gpt-5.5" : model;
      return {
        // baseURL explícito: sem ele o SDK herda OPENAI_BASE_URL (que aponta p/ Zen).
        client: cached("openai", () => new OpenAI({ apiKey: key, baseURL: "https://api.openai.com/v1" })),
        provider: isClaudeFamily ? "openai-fallback" : "openai",
        model: effective,
      };
    }
  }
  const zen = getAiClient();
  if (!zen) return null;
  // Zen não serve gpt-*/claude-*: sem a chave certa, degrada para o melhor modelo
  // da Zen em vez de quebrar a automação (o report registra o modelo usado).
  const effective = isGptFamily || isClaudeFamily ? process.env.AI_MODEL_ZEN_FALLBACK || "glm-5.2" : model;
  return {
    client: zen,
    provider: isGptFamily || isClaudeFamily ? "zen-fallback" : process.env.AI_PROVIDER || "opencode-zen",
    model: effective,
  };
}

/** Presença (não valores) das credenciais de IA — para diagnóstico remoto. */
export function providerHealth() {
  return {
    openaiOfficial: Boolean(openaiOfficialKey()),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    zen: Boolean(process.env.OPENCODE_API || process.env.OPENAI_API_KEY),
    zenBaseUrl: process.env.OPENAI_BASE_URL || "https://opencode.ai/zen/go/v1",
  };
}

export type GenerateOptions = {
  model: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
};

export type GenerateResult = {
  provider: string;
  model: string;
  text: string;
  usage: { inputTokens: number; outputTokens: number } | null;
};

export async function generateText(prompt: string, opts: GenerateOptions): Promise<GenerateResult> {
  const routed = routeModel(opts.model);
  if (!routed) {
    return {
      provider: "mock-fallback",
      model: opts.model,
      text: `Resumo operacional (mock, sem OPENAI_API_KEY): ${prompt.slice(0, 220)}`,
      usage: null,
    };
  }
  try {
    return await callProvider(prompt, opts, routed);
  } catch (e) {
    // Cota/billing da OpenAI esgotada (429 etc.) → degrada para a Zen para a
    // automação nunca parar. O portão de qualidade continua o mesmo. EXCEÇÃO:
    // modelos de busca não têm equivalente na Zen (um modelo sem web fingiria
    // ter pesquisado) — nesses casos o erro sobe e a etapa vira best-effort.
    const zen = getAiClient();
    const isSearchModel = routed.model.includes("search");
    if (!zen || isSearchModel || !routed.provider.startsWith("openai")) throw e;
    const fallbackModel = process.env.AI_MODEL_ZEN_FALLBACK || "glm-5.2";
    try {
      return await callProvider(prompt, opts, { client: zen, provider: "zen-quota-fallback", model: fallbackModel });
    } catch {
      // Fallback também indisponível → o erro ORIGINAL da OpenAI é o diagnóstico
      // verdadeiro (ex.: cota esgotada), não o 401 do Zen.
      throw e;
    }
  }
}

async function callProvider(prompt: string, opts: GenerateOptions, routed: Routed): Promise<GenerateResult> {
  const model = routed.model;
  const isClaude = /^claude-/.test(model);
  const isGpt5 = /^(gpt-5|o\d)/.test(model);
  const isSearch = model.includes("search");
  // gpt-5*/o* e claude só aceitam temperature padrão; search models rejeitam vários params.
  const sendTemperature = opts.temperature !== undefined && !isClaude && !isGpt5 && !isSearch;

  const res = await routed.client.chat.completions.create({
    model,
    ...(sendTemperature ? { temperature: opts.temperature } : {}),
    ...(opts.maxTokens && !isSearch
      ? isGpt5
        ? { max_completion_tokens: opts.maxTokens }
        : { max_tokens: opts.maxTokens }
      : {}),
    // response_format só onde é suportado (Anthropic compat e search rejeitam).
    ...(opts.json && !isClaude && !isSearch ? { response_format: { type: "json_object" as const } } : {}),
    messages: [
      ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
      // claude/search sem response_format: reforço explícito de JSON puro via system.
      ...(opts.json && (isClaude || isSearch)
        ? [{ role: "system" as const, content: "Responda SOMENTE com um objeto JSON válido. Sem texto antes ou depois, sem cercas de código (```)." }]
        : []),
      { role: "user" as const, content: prompt },
    ],
  });

  const usage = res.usage
    ? { inputTokens: res.usage.prompt_tokens ?? 0, outputTokens: res.usage.completion_tokens ?? 0 }
    : null;

  return {
    provider: routed.provider,
    model,
    text: res.choices[0]?.message?.content ?? "",
    usage,
  };
}

export function parseJsonResponse<T = unknown>(text: string): T | null {
  const trimmed = text.trim();
  const candidates = [trimmed];
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1];
  if (fenced) candidates.push(fenced);
  // Modelos de raciocínio (claude) costumam escrever análise ANTES do fence:
  // aceita o primeiro bloco ```json ... ``` em qualquer posição do texto.
  const anyFence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  if (anyFence && anyFence !== fenced) candidates.push(anyFence);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // Some compatible providers wrap valid JSON in explanatory text.
    }
  }

  let parsed: T | null = null;
  for (let start = 0; start < trimmed.length; start += 1) {
    if (trimmed[start] !== "{" && trimmed[start] !== "[") continue;
    const stack: string[] = [];
    let inString = false;
    let escaped = false;

    for (let end = start; end < trimmed.length; end += 1) {
      const char = trimmed[end];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === "{" || char === "[") stack.push(char);
      else if (char === "}" || char === "]") {
        const opener = stack.pop();
        if ((char === "}" && opener !== "{") || (char === "]" && opener !== "[")) break;
        if (stack.length === 0) {
          try {
            parsed = JSON.parse(trimmed.slice(start, end + 1)) as T;
            start = end;
          } catch {
            // Keep scanning for a later complete JSON response.
          }
          break;
        }
      }
    }
  }

  return parsed;
}

/** Generate JSON and parse it. Returns data=null if the model returned invalid JSON. */
export async function generateJson<T = unknown>(
  prompt: string,
  opts: GenerateOptions,
): Promise<{ provider: string; model: string; data: T | null; raw: string; usage: GenerateResult["usage"] }> {
  const r = await generateText(prompt, { ...opts, json: true });
  const data = parseJsonResponse<T>(r.text);
  return { provider: r.provider, model: r.model, data, raw: r.text, usage: r.usage };
}

/** Run a prompt through the model routed for a specific editorial agent. */
export async function generateForAgent(kind: AgentKind, prompt: string, system?: string) {
  const routed = modelForAgent(kind);
  const result = await generateText(prompt, {
    model: routed.model,
    temperature: routed.temperature,
    maxTokens: 8_000,
    system,
  });
  return { ...result, task: routed.task as AiTask };
}

/**
 * Backwards-compatible helper used by the existing orchestrator.
 * Routes through the "audit" task model by default.
 */
export async function generateAgentText(prompt: string) {
  const r = await generateText(prompt, { model: process.env.AI_MODEL_AUDIT || "gpt-5.5", temperature: 0.4, maxTokens: 8_000 });
  return { provider: r.provider, text: r.text };
}
