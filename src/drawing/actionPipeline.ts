import type { DrawingAction, DrawingInput, DrawingPlan } from "./types";
import { validateAction } from "./validateAction";

type ValidationResult = { ok: true } | { ok: false; message: string };

export function prepareActions(input: unknown): DrawingAction[] {
  if (Array.isArray(input)) {
    return prepareActionList(input);
  }

  if (isDrawingPlan(input)) {
    const result = validatePlan(input);
    if (!result.ok) {
      return [{ type: "error", message: result.message }];
    }
    return input.steps.map((step) => step.action);
  }

  return [{ type: "error", message: "动作格式无效" }];
}

export function getPlanActions(input: DrawingInput): DrawingAction[] {
  return Array.isArray(input) ? input : input.steps.map((step) => step.action);
}

function prepareActionList(actions: unknown[]): DrawingAction[] {
  for (const action of actions) {
    const result = validateAction(action);
    if (!result.ok) {
      return [{ type: "error", message: result.message }];
    }
  }
  return actions as DrawingAction[];
}

function validatePlan(plan: DrawingPlan): ValidationResult {
  if (!plan.title.trim()) {
    return { ok: false, message: "计划标题不能为空" };
  }
  if (plan.steps.length < 1 || plan.steps.length > 20) {
    return { ok: false, message: "计划步骤数量超出范围" };
  }

  const ids = new Set<string>();
  for (const step of plan.steps) {
    if (!step.id.trim() || !step.title.trim()) {
      return { ok: false, message: "计划步骤格式无效" };
    }
    if (ids.has(step.id)) {
      return { ok: false, message: "计划步骤 id 重复" };
    }
    ids.add(step.id);

    const actionResult = validateAction(step.action);
    if (!actionResult.ok) {
      return actionResult;
    }
    if (step.action.type === "error") {
      return { ok: false, message: "计划步骤不能包含错误动作" };
    }
  }

  const readyIds = new Set<string>();
  for (const step of plan.steps) {
    if (!step.dependsOn) {
      readyIds.add(step.id);
      continue;
    }
    if (!Array.isArray(step.dependsOn) || step.dependsOn.some((id) => typeof id !== "string" || !readyIds.has(id))) {
      return { ok: false, message: "计划步骤依赖无效" };
    }
    readyIds.add(step.id);
  }

  return { ok: true };
}

function isDrawingPlan(input: unknown): input is DrawingPlan {
  if (!isRecord(input) || input.type !== "plan" || typeof input.title !== "string" || !Array.isArray(input.steps)) {
    return false;
  }

  return input.steps.every(
    (step) =>
      isRecord(step) &&
      typeof step.id === "string" &&
      typeof step.title === "string" &&
      "action" in step &&
      (step.dependsOn === undefined || Array.isArray(step.dependsOn))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
