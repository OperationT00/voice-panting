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
      ["circle", "rect", "line", "triangle", "text", "ellipse", "diamond", "star", "path"].includes(String(action.shape)) &&
      Number.isInteger(action.count) &&
      Number(action.count) >= 1 &&
      Number(action.count) <= 8 &&
      isValidCreateProps(action.props, String(action.shape))
    );
  }

  return ["update", "delete", "move", "resize", "bringToFront", "sendToBack", "clear", "export"].includes(action.type);
}

function isValidCreateProps(value: unknown, shape: string): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isHexColor(value.color) &&
    ["small", "medium", "large"].includes(String(value.size)) &&
    isValidPosition(value.position) &&
    (value.rotation === undefined || isSafeRotation(value.rotation)) &&
    (value.strokeColor === undefined || isHexColor(value.strokeColor)) &&
    (value.strokeWidth === undefined || isSafeStrokeWidth(value.strokeWidth)) &&
    (shape !== "path" || isSafePathData(value.pathData)) &&
    (value.pathData === undefined || isSafePathData(value.pathData))
  );
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
