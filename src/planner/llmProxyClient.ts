import type { DrawingPlan } from "../drawing/types";
import { drawingPlanResponseFormat } from "./drawingPlanSchema";
import type { PlannerInput, PlannerResult } from "./llmPlanner";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type Options = {
  endpoint?: string;
  fetcher?: Fetcher;
};

export async function callLlmPlannerProxy(text: string, options: Options = {}): Promise<PlannerResult> {
  const endpoint = options.endpoint ?? "/api/plan";
  const fetcher = options.fetcher ?? fetch;

  try {
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        responseFormat: drawingPlanResponseFormat
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        message: `LLM planner proxy failed: ${response.status} ${getErrorMessage(payload)}`
      };
    }

    return isPlannerResult(payload) ? payload : { ok: false, message: "LLM planner proxy returned invalid result" };
  } catch (error) {
    return {
      ok: false,
      message: `LLM planner proxy request failed: ${error instanceof Error ? error.message : "unknown error"}`
    };
  }
}

export async function proxyPlanGenerator(input: PlannerInput, options: Options = {}): Promise<PlannerResult> {
  return callLlmPlannerProxy(input.text, options);
}

function getErrorMessage(payload: unknown): string {
  if (isRecord(payload) && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }
  return "unknown error";
}

function isPlannerResult(payload: unknown): payload is PlannerResult {
  if (!isRecord(payload) || typeof payload.ok !== "boolean") {
    return false;
  }

  if (!payload.ok) {
    return typeof payload.message === "string";
  }

  return payload.source === "llm" && isDrawingPlan(payload.plan);
}

function isDrawingPlan(value: unknown): value is DrawingPlan {
  return isRecord(value) && value.type === "plan" && typeof value.title === "string" && Array.isArray(value.steps);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
