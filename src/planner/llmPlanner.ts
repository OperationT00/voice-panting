import type { DrawingPlan } from "../drawing/types";
import { drawingPlanResponseFormat } from "./drawingPlanSchema";
import { findPlanTemplate } from "./planTemplates";

export type PlannerSource = "template" | "llm" | "mock";

export type PlannerInput = {
  text: string;
  responseFormat: typeof drawingPlanResponseFormat;
};

export type PlannerResult =
  | {
      ok: true;
      source: PlannerSource;
      plan: DrawingPlan;
    }
  | {
      ok: false;
      message: string;
    };

export type PlanGenerator = (input: PlannerInput) => Promise<PlannerResult>;

export async function planFromText(text: string, fallbackGenerator: PlanGenerator = mockPlanGenerator): Promise<PlannerResult> {
  const templatePlan = findPlanTemplate(text);
  if (templatePlan) {
    return {
      ok: true,
      source: "template",
      plan: templatePlan
    };
  }

  return fallbackGenerator({
    text,
    responseFormat: drawingPlanResponseFormat
  });
}

export async function mockPlanGenerator(): Promise<PlannerResult> {
  return {
    ok: false,
    message: "暂未接入真实 LLM planner"
  };
}
