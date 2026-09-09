import config from "@payload-config";
import { getPayload } from "payload";
import { estimateCostUsd } from "./cost";

export type AgentRunLog = {
  agent: string;
  provider: string;
  model: string;
  status: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  input?: unknown;
  output?: unknown;
  error?: string;
};

/**
 * Persists one AI execution to the `agent-runs` collection (model, cost, tokens,
 * duration, status). Wrapped so observability can never break the pipeline.
 */
export async function logAgentRun(run: AgentRunLog): Promise<void> {
  try {
    const payload = await getPayload({ config });
    const costUsd = estimateCostUsd(run.model, run.inputTokens ?? 0, run.outputTokens ?? 0);
    await payload.create({
      collection: "agent-runs",
      data: {
        agent: run.agent,
        provider: run.provider,
        model: run.model,
        status: run.status,
        durationMs: run.durationMs,
        costUsd,
        input: (run.input ?? null) as Record<string, unknown> | null,
        output: (run.output ?? null) as Record<string, unknown> | null,
        error: run.error,
      },
      overrideAccess: true,
    });
  } catch {
    // observability must never break the editorial pipeline
  }
}
