import type { DrawingAction, PresetPosition, ShapeKind, ShapePosition, ShapeSize, TargetRef } from "./types";

type ValidationResult = { ok: true } | { ok: false; message: string };

const shapes: ShapeKind[] = ["circle", "rect", "line", "triangle", "text"];
const sizes: ShapeSize[] = ["small", "medium", "large"];
const positions: PresetPosition[] = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
  "row"
];
const refs = ["last", "all", "selected"];
const spatialTargets = ["leftmost", "rightmost", "topmost", "bottommost"];

export function validateAction(action: unknown): ValidationResult {
  if (!isRecord(action) || typeof action.type !== "string") {
    return { ok: false, message: "动作格式无效" };
  }

  switch (action.type) {
    case "create":
      return validateCreateAction(action);
    case "update":
      return validateTargetAction(action, true);
    case "delete":
      return validateTargetAction(action, false);
    case "move":
      return validateMoveAction(action);
    case "resize":
      return validateResizeAction(action);
    case "bringToFront":
    case "sendToBack":
      return validateTargetAction(action, false);
    case "undo":
    case "redo":
    case "clear":
    case "export":
      return { ok: true };
    case "error":
      return typeof action.message === "string" ? { ok: true } : { ok: false, message: "错误消息格式无效" };
    default:
      return { ok: false, message: "不支持的动作类型" };
  }
}

export function validateActions(actions: unknown[]): ValidationResult {
  for (const action of actions) {
    const result = validateAction(action);
    if (!result.ok) {
      return result;
    }
  }
  return { ok: true };
}

function validateCreateAction(action: Record<string, unknown>): ValidationResult {
  if (!isShape(action.shape)) {
    return { ok: false, message: "不支持的图形类型" };
  }
  if (!Number.isInteger(action.count) || Number(action.count) < 1 || Number(action.count) > 8) {
    return { ok: false, message: "一次最多创建 8 个图形" };
  }
  return validateShapeProps(action.props, true);
}

function validateTargetAction(action: Record<string, unknown>, needsProps: boolean): ValidationResult {
  const targetResult = validateTarget(action.target);
  if (!targetResult.ok) {
    return targetResult;
  }
  return needsProps ? validateShapeProps(action.props, false) : { ok: true };
}

function validateMoveAction(action: Record<string, unknown>): ValidationResult {
  const targetResult = validateTarget(action.target);
  if (!targetResult.ok) {
    return targetResult;
  }
  if (!isSafeDelta(action.dx) || !isSafeDelta(action.dy)) {
    return { ok: false, message: "移动距离超出安全范围" };
  }
  return { ok: true };
}

function validateResizeAction(action: Record<string, unknown>): ValidationResult {
  const targetResult = validateTarget(action.target);
  if (!targetResult.ok) {
    return targetResult;
  }
  if (typeof action.scale !== "number" || action.scale < 0.25 || action.scale > 2) {
    return { ok: false, message: "缩放比例超出安全范围" };
  }
  return { ok: true };
}

function validateShapeProps(value: unknown, requireAll: boolean): ValidationResult {
  if (!isRecord(value)) {
    return { ok: false, message: "图形属性格式无效" };
  }
  if ((requireAll || value.color !== undefined) && !isHexColor(value.color)) {
    return { ok: false, message: "颜色必须是 #RRGGBB 格式" };
  }
  if ((requireAll || value.size !== undefined) && !sizes.includes(value.size as ShapeSize)) {
    return { ok: false, message: "不支持的尺寸" };
  }
  if (requireAll || value.position !== undefined) {
    const positionResult = validatePosition(value.position);
    if (!positionResult.ok) {
      return positionResult;
    }
  }
  return { ok: true };
}

function validatePosition(value: unknown): ValidationResult {
  if (typeof value === "string") {
    return positions.includes(value as PresetPosition) ? { ok: true } : { ok: false, message: "不支持的位置" };
  }

  if (!isRecord(value) || typeof value.x !== "number" || typeof value.y !== "number") {
    return { ok: false, message: "不支持的位置" };
  }

  if (!Number.isFinite(value.x) || !Number.isFinite(value.y) || value.x < 0 || value.x > 1000 || value.y < 0 || value.y > 560) {
    return { ok: false, message: "坐标超出画布范围" };
  }

  return { ok: true };
}

function validateTarget(value: unknown): ValidationResult {
  if (!isRecord(value)) {
    return { ok: false, message: "目标引用格式无效" };
  }
  const target = value as Partial<TargetRef> & Record<string, unknown>;

  if ("ref" in target) {
    return refs.includes(String(target.ref)) ? { ok: true } : { ok: false, message: "不支持的目标引用" };
  }
  if ("kind" in target) {
    if (!isShape(target.kind)) {
      return { ok: false, message: "不支持的图形类型" };
    }
    if (target.index !== undefined && (!Number.isInteger(target.index) || Number(target.index) < 1 || Number(target.index) > 20)) {
      return { ok: false, message: "目标序号超出范围" };
    }
    return { ok: true };
  }
  if ("color" in target) {
    return isHexColor(target.color) ? { ok: true } : { ok: false, message: "颜色必须是 #RRGGBB 格式" };
  }
  if ("spatial" in target) {
    return spatialTargets.includes(String(target.spatial)) ? { ok: true } : { ok: false, message: "不支持的空间目标" };
  }
  return { ok: false, message: "目标引用格式无效" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isShape(value: unknown): value is ShapeKind {
  return shapes.includes(value as ShapeKind);
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function isSafeDelta(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 300;
}

export function getValidActions(actions: DrawingAction[]): DrawingAction[] {
  return actions.filter((action) => validateAction(action).ok);
}
