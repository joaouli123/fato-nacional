import { createHash, randomUUID } from "node:crypto";
import type { Payload } from "payload";
import type { EditorialSlot, GateDecision } from "./pipeline-contracts";

export const EDITORIAL_SCHEMA_VERSION = "1";
export const EDITORIAL_PROMPT_VERSION = "2026-07-p0";

export function artifactHash(value: unknown): string {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return createHash("sha256").update(serialized).digest("hex");
}

export type EditorialRunHandle = {
  id: string | number;
  runId: string;
  inputHash: string;
  gates: GateDecision[];
  artifacts: Record<string, unknown>;
};

export async function startEditorialRun(
  payload: Payload,
  input: { articleSlug: string; slot: EditorialSlot; request: unknown; modelRequested?: string },
): Promise<EditorialRunHandle> {
  const runId = randomUUID();
  const inputHash = artifactHash(input.request);
  const doc = await payload.create({
    collection: "editorial-runs",
    data: {
      runId,
      articleSlug: input.articleSlug,
      slot: input.slot,
      stage: "research",
      runStatus: "running",
      attempt: 1,
      inputHash,
      schemaVersion: EDITORIAL_SCHEMA_VERSION,
      promptVersion: EDITORIAL_PROMPT_VERSION,
      modelRequested: input.modelRequested,
      artifacts: { request: input.request },
      gateDecisions: [],
      startedAt: new Date().toISOString(),
    },
    overrideAccess: true,
  });
  return {
    id: doc.id,
    runId,
    inputHash,
    gates: [],
    artifacts: { request: input.request },
  };
}

export async function checkpointEditorialRun(
  payload: Payload,
  handle: EditorialRunHandle,
  update: {
    stage: string;
    artifact?: unknown;
    gate?: GateDecision;
    modelResolved?: string;
    providerResolved?: string;
  },
): Promise<void> {
  if (update.gate) handle.gates.push(update.gate);
  if (update.artifact !== undefined) handle.artifacts[update.stage] = update.artifact;
  await payload.update({
    collection: "editorial-runs",
    id: handle.id,
    data: {
      stage: update.stage,
      ...(update.artifact === undefined
        ? {}
        : { artifactHash: artifactHash(update.artifact), artifacts: handle.artifacts }),
      gateDecisions: handle.gates,
      modelResolved: update.modelResolved,
      providerResolved: update.providerResolved,
    },
    overrideAccess: true,
  });
}

export async function finishEditorialRun(
  payload: Payload,
  handle: EditorialRunHandle,
  input: {
    status: "human_review_required" | "approved" | "published" | "failed" | "quarantined";
    stage: string;
    artifact?: unknown;
    error?: string;
  },
): Promise<void> {
  if (input.artifact !== undefined) handle.artifacts[input.stage] = input.artifact;
  await payload.update({
    collection: "editorial-runs",
    id: handle.id,
    data: {
      stage: input.stage,
      runStatus: input.status,
      ...(input.artifact === undefined
        ? {}
        : { artifactHash: artifactHash(input.artifact), artifacts: handle.artifacts }),
      gateDecisions: handle.gates,
      error: input.error,
      finishedAt: new Date().toISOString(),
    },
    overrideAccess: true,
  });
}
