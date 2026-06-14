import type { DrawingPlan } from "../drawing/types";
import type { PlanTemplate } from "./planTemplates";

export const USER_TEMPLATE_STORAGE_KEY = "voice-painting:user-templates:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function createUserPlanTemplate({
  keyword,
  plan,
  now = Date.now()
}: {
  keyword: string;
  plan: DrawingPlan;
  now?: number;
}): PlanTemplate {
  const normalizedKeyword = keyword.trim() || plan.title || "用户模板";
  return {
    id: `user-template-${now}`,
    category: "object",
    source: "user",
    keywords: [normalizedKeyword],
    description: `用户保存的模板：${normalizedKeyword}`,
    plan
  };
}

export function loadUserPlanTemplates(storage = getDefaultStorage()): PlanTemplate[] {
  if (!storage) {
    return [];
  }

  try {
    const rawValue = storage.getItem(USER_TEMPLATE_STORAGE_KEY);
    const parsedValue: unknown = rawValue ? JSON.parse(rawValue) : [];
    if (!Array.isArray(parsedValue)) {
      return [];
    }
    return parsedValue.filter(isUserPlanTemplate);
  } catch {
    return [];
  }
}

export function saveUserPlanTemplate(template: PlanTemplate, storage = getDefaultStorage()): void {
  if (!storage) {
    return;
  }

  const templates = loadUserPlanTemplates(storage);
  const nextTemplates = [...templates.filter((item) => item.id !== template.id), template];
  storage.setItem(USER_TEMPLATE_STORAGE_KEY, JSON.stringify(nextTemplates));
}

function getDefaultStorage(): StorageLike | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function isUserPlanTemplate(value: unknown): value is PlanTemplate {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    (value.category === "scene" || value.category === "object") &&
    value.source === "user" &&
    Array.isArray(value.keywords) &&
    value.keywords.every((keyword) => typeof keyword === "string") &&
    typeof value.description === "string" &&
    isDrawingPlan(value.plan)
  );
}

function isDrawingPlan(value: unknown): value is DrawingPlan {
  if (!isRecord(value) || value.type !== "plan" || typeof value.title !== "string" || !Array.isArray(value.steps)) {
    return false;
  }
  return value.steps.every((step) => isRecord(step) && typeof step.id === "string" && typeof step.title === "string" && isRecord(step.action));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
