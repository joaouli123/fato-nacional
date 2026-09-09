import { describe, expect, it } from "vitest";
import { estimateCostUsd } from "@/lib/agents/cost";
import { modelForAgent, taskModel } from "@/lib/agents/model-router";
import { parseJsonResponse } from "@/lib/agents/provider";

describe("estimateCostUsd", () => {
  it("returns 0 for zero tokens", () => {
    expect(estimateCostUsd("gpt-5.5", 0, 0)).toBe(0);
  });
  it("prices a full model higher than a mini model for the same tokens", () => {
    const full = estimateCostUsd("gpt-5.5", 1000, 1000);
    const mini = estimateCostUsd("gpt-5.4-mini", 1000, 1000);
    expect(full).toBeGreaterThan(mini);
    expect(full).toBeGreaterThan(0);
  });
  it("computes a finite cost for known models", () => {
    expect(estimateCostUsd("gemini-3.5-flash", 10_000, 5_000)).toBeGreaterThan(0);
    expect(Number.isFinite(estimateCostUsd("deepseek-v4-pro", 1000, 1000))).toBe(true);
  });
});

describe("model router", () => {
  it("routes each agent to its task specialty model", () => {
    expect(modelForAgent("writer").task).toBe("writing");
    expect(modelForAgent("fact_checker").task).toBe("fact_check");
    expect(modelForAgent("seo_specialist").task).toBe("seo");
    expect(modelForAgent("radar").task).toBe("triage");
  });
  it("uses a different model for writing vs fact-checking (independent verifier)", () => {
    expect(taskModel.writing).not.toBe(taskModel.fact_check);
  });
  it("returns a non-empty model id for every task", () => {
    for (const model of Object.values(taskModel)) {
      expect(typeof model).toBe("string");
      expect(model.length).toBeGreaterThan(0);
    }
  });
});

describe("parseJsonResponse", () => {
  it("parses direct and fenced JSON", () => {
    expect(parseJsonResponse('{"ok":true}')).toEqual({ ok: true });
    expect(parseJsonResponse('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });

  it("extracts JSON wrapped in provider reasoning", () => {
    expect(parseJsonResponse('Analysis first. Final answer: {"ok":true,"items":[1,2]} done.')).toEqual({
      ok: true,
      items: [1, 2],
    });
  });

  it("prefers the final JSON response over an earlier reasoning example", () => {
    const response = 'I should return {"contentHtml":""}. Final: {"contentHtml":"<p>Ready</p>"}';
    expect(parseJsonResponse(response)).toEqual({ contentHtml: "<p>Ready</p>" });
  });

  it("returns null when no complete JSON value exists", () => {
    expect(parseJsonResponse('not json {"ok":')).toBeNull();
  });
});
