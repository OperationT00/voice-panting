export type ServerDrawingPlan = {
  type: "plan";
  title: string;
  steps: Array<{
    id: string;
    title: string;
    dependsOn?: string[];
    action: Record<string, unknown>;
  }>;
};

export type ServerPlannerResult =
  | {
      ok: true;
      source: "llm" | "mock" | "template";
      plan: ServerDrawingPlan;
    }
  | {
      ok: false;
      message: string;
    };

export const serverDrawingPlanResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "drawing_plan",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["type", "title", "steps"],
      properties: {
        type: { const: "plan" },
        title: { type: "string", minLength: 1 },
        steps: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "title", "dependsOn", "action"],
            properties: {
              id: { type: "string", minLength: 1 },
              title: { type: "string", minLength: 1 },
              dependsOn: {
                type: "array",
                items: { type: "string", minLength: 1 },
                uniqueItems: true
              },
              action: {
                type: "object"
              }
            }
          }
        }
      }
    }
  }
} as const;

export function isServerDrawingPlan(value: unknown): value is ServerDrawingPlan {
  if (!isRecord(value) || value.type !== "plan" || typeof value.title !== "string" || !Array.isArray(value.steps)) {
    return false;
  }

  return value.steps.every(
    (step) =>
      isRecord(step) &&
      typeof step.id === "string" &&
      typeof step.title === "string" &&
      isRecord(step.action) &&
      (step.dependsOn === undefined || Array.isArray(step.dependsOn))
  );
}

export function hasValidPlanShape(plan: ServerDrawingPlan): boolean {
  if (!plan.title.trim() || plan.steps.length < 1 || plan.steps.length > 20) {
    return false;
  }

  const readyIds = new Set<string>();
  for (const step of plan.steps) {
    if (!step.id.trim() || !step.title.trim() || readyIds.has(step.id)) {
      return false;
    }
    if (step.dependsOn && step.dependsOn.some((id) => !readyIds.has(id))) {
      return false;
    }
    if (!isSupportedAction(step.action)) {
      return false;
    }
    readyIds.add(step.id);
  }

  return true;
}

function isSupportedAction(action: Record<string, unknown>): boolean {
  if (typeof action.type !== "string") {
    return false;
  }

  if (action.type === "create") {
    return (
      ["circle", "rect", "line", "triangle", "text", "ellipse", "diamond", "star"].includes(String(action.shape)) &&
      Number.isInteger(action.count) &&
      Number(action.count) >= 1 &&
      Number(action.count) <= 8 &&
      isRecord(action.props)
    );
  }

  return ["update", "delete", "move", "resize", "bringToFront", "sendToBack", "clear", "export"].includes(action.type);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
