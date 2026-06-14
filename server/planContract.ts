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
  return getPlanValidationError(plan) === undefined;
}

export function getPlanValidationError(plan: ServerDrawingPlan): string | undefined {
  if (!plan.title.trim() || plan.steps.length < 1 || plan.steps.length > 20) {
    return "plan title must be non-empty and steps length must be 1-20";
  }

  const readyIds = new Set<string>();
  for (const step of plan.steps) {
    if (!step.id.trim() || !step.title.trim() || readyIds.has(step.id)) {
      return `step ${step.id || "<empty>"} must have a unique non-empty id and title`;
    }
    if (step.dependsOn && step.dependsOn.some((id) => !readyIds.has(id))) {
      return `step ${step.id} dependsOn may only reference earlier step ids`;
    }
    const actionError = getActionValidationError(step.action);
    if (actionError) {
      return `step ${step.id}: ${actionError}`;
    }
    readyIds.add(step.id);
  }

  return undefined;
}

function getActionValidationError(action: Record<string, unknown>): string | undefined {
  if (typeof action.type !== "string") {
    return "action type must be a string";
  }

  if (action.type === "create") {
    if (!["circle", "rect", "line", "triangle", "text", "ellipse", "diamond", "star", "path"].includes(String(action.shape))) {
      return `unsupported shape "${String(action.shape)}"`;
    }
    if (!Number.isInteger(action.count) || Number(action.count) < 1 || Number(action.count) > 8) {
      return "create count must be an integer from 1 to 8";
    }
    const propsError = getCreatePropsValidationError(action.props, String(action.shape));
    return propsError ? `invalid create props: ${propsError}` : undefined;
  }

  return ["update", "delete", "move", "resize", "bringToFront", "sendToBack", "clear", "export"].includes(action.type)
    ? undefined
    : `unsupported action type "${action.type}"`;
}

function isValidCreateProps(value: unknown, shape: string): boolean {
  return getCreatePropsValidationError(value, shape) === undefined;
}

function getCreatePropsValidationError(value: unknown, shape: string): string | undefined {
  if (!isRecord(value)) {
    return "props must be an object";
  }

  if (!isHexColor(value.color)) {
    return "color must be #RRGGBB";
  }
  if (!["small", "medium", "large"].includes(String(value.size))) {
    return "size must be small, medium, or large";
  }
  if (!isValidPosition(value.position)) {
    return "position must be a preset or x/y coordinate inside the canvas";
  }
  if (value.rotation !== undefined && !isSafeRotation(value.rotation)) {
    return "rotation must be between -180 and 180";
  }
  if (value.strokeColor !== undefined && !isHexColor(value.strokeColor)) {
    return "strokeColor must be #RRGGBB";
  }
  if (value.strokeWidth !== undefined && !isSafeStrokeWidth(value.strokeWidth)) {
    return "strokeWidth must be between 0 and 24";
  }
  if (shape === "path" && !isSafePathData(value.pathData)) {
    return "path shapes require safe pathData using only M, L, Q, C, and Z commands";
  }
  if (value.pathData !== undefined && !isSafePathData(value.pathData)) {
    return "pathData may only use M, L, Q, C, and Z commands with safe canvas coordinates";
  }

  return undefined;
}

function isValidPosition(value: unknown): boolean {
  if (typeof value === "string") {
    return ["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right", "row"].includes(value);
  }

  return (
    isRecord(value) &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    value.x >= 0 &&
    value.x <= 1000 &&
    value.y >= 0 &&
    value.y <= 560
  );
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function isSafeRotation(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

function isSafeStrokeWidth(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 24;
}

function isSafePathData(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 1 || value.length > 300) {
    return false;
  }
  if (!/^[MLQCZmlqcz0-9.,\s-]+$/.test(value)) {
    return false;
  }
  const commands = value.match(/[A-Za-z]/g) ?? [];
  if (commands.some((command) => !["M", "L", "Q", "C", "Z", "m", "l", "q", "c", "z"].includes(command))) {
    return false;
  }

  const numbers = value.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (numbers.some((number) => !Number.isFinite(number))) {
    return false;
  }
  for (let index = 0; index < numbers.length; index += 2) {
    const x = numbers[index];
    const y = numbers[index + 1];
    if (x === undefined || y === undefined || x < 0 || x > 1000 || y < 0 || y > 560) {
      return false;
    }
  }

  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
