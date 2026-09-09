import type { AgentKind } from "@nexo/shared";

/**
 * Model router — picks the right OpenCode Zen model for each editorial task,
 * following the PRD's specialty split (writing != fact-check != triage != SEO).
 * Every model is overridable via env so cost/quality can be tuned without a deploy.
 *
 * Base URL/key come from OPENAI_BASE_URL (https://opencode.ai/zen/go/v1) + OPENAI_API_KEY.
 */

export type AiTask =
  | "triage"
  | "research"
  | "writing"
  | "editing"
  | "fact_check"
  | "seo"
  | "image"
  | "audit";

/** Each of the 13 editorial agents mapped to its task specialty. */
export const agentTask: Record<AgentKind, AiTask> = {
  collector: "triage",
  radar: "triage",
  topic_analyst: "triage",
  editorial_planner: "audit",
  researcher: "research",
  serp_analyst: "research",
  writer: "writing",
  editor: "editing",
  fact_checker: "fact_check",
  seo_specialist: "seo",
  image: "image",
  publication_auditor: "audit",
  publisher: "audit",
};

/**
 * Per-task model (OpenCode Zen ids). Rationale:
 * - writing  → top long-form prose model
 * - fact_check → a DIFFERENT provider than the writer (independent second opinion, per PRD)
 * - research → fast, strong-synthesis model
 * - triage/seo → cheap "mini" model + deterministic rules downstream
 * - editing/audit → strong reasoning, mid cost
 * - image → fast model for alt-text/caption (actual image gen is a separate provider)
 */
export const taskModel: Record<AiTask, string> = {
  triage: process.env.AI_MODEL_TRIAGE || "gpt-5.4-mini",
  research: process.env.AI_MODEL_RESEARCH || "gpt-5-search-api",
  writing: process.env.AI_MODEL_WRITING || "gpt-5.5",
  editing: process.env.AI_MODEL_EDITING || "claude-opus-4-8",
  fact_check: process.env.AI_MODEL_FACTCHECK || "deepseek-v4-pro",
  seo: process.env.AI_MODEL_SEO || "gpt-5.5",
  image: process.env.AI_MODEL_IMAGE || "gpt-5.4-mini",
  audit: process.env.AI_MODEL_AUDIT || "gpt-5.5",
};

/** Recommended sampling temperature per task (factual tasks run cooler). */
export const taskTemperature: Record<AiTask, number> = {
  triage: 0.2,
  research: 0.3,
  writing: 0.7,
  editing: 0.4,
  fact_check: 0.1,
  seo: 0.2,
  image: 0.6,
  audit: 0.2,
};

export type RoutedModel = { task: AiTask; model: string; temperature: number };

export function modelForAgent(kind: AgentKind): RoutedModel {
  const task = agentTask[kind];
  return { task, model: taskModel[task], temperature: taskTemperature[task] };
}

export function modelForTask(task: AiTask): RoutedModel {
  return { task, model: taskModel[task], temperature: taskTemperature[task] };
}
