import type { DrawableShape, DrawingAction, PresetPosition, ShapeKind, ShapePosition, ShapeProps, ShapeSize } from "./types";
import { resolveTargetIds } from "./resolveTargetIds";

export type DrawingState = {
  shapes: DrawableShape[];
  selectedIds: string[];
  past: DrawableShape[][];
  future: DrawableShape[][];
  nextId: number;
  message: string;
};

export function createInitialDrawingState(): DrawingState {
  return {
    shapes: [],
    selectedIds: [],
    past: [],
    future: [],
    nextId: 1,
    message: "准备好了"
  };
}

export function drawingReducer(state: DrawingState, action: DrawingAction): DrawingState {
  switch (action.type) {
    case "create": {
      const created = createShapes(
        action.shape,
        action.count,
        action.props.color,
        action.props.size,
        action.props.position,
        action.props.rotation,
        action.props.strokeColor,
        action.props.strokeWidth,
        action.props.pathData,
        state.nextId
      );
      return commit(state, [...state.shapes, ...created], {
        selectedIds: created.map((shape) => shape.id),
        nextId: state.nextId + created.length,
        message: `已画 ${created.length} 个图形`
      });
    }
    case "update": {
      const targetIds = resolveTargetIds(state, action.target);
      if (targetIds.length === 0) {
        return { ...state, message: "没有可修改的图形" };
      }

      const shapes = state.shapes.map((shape) => (targetIds.includes(shape.id) ? updateShapeProps(shape, action.props) : shape));
      return commit(state, shapes, { selectedIds: targetIds, message: "已更新图形" });
    }
    case "delete": {
      const targetIds = resolveTargetIds(state, action.target);
      if (targetIds.length === 0) {
        return { ...state, message: "没有可删除的图形" };
      }

      const shapes = state.shapes.filter((shape) => !targetIds.includes(shape.id));
      return commit(state, shapes, { selectedIds: [], message: "已删除图形" });
    }
    case "move": {
      const targetIds = resolveTargetIds(state, action.target);
      if (targetIds.length === 0) {
        return { ...state, message: "没有可移动的图形" };
      }

      const shapes = state.shapes.map((shape) =>
        targetIds.includes(shape.id) ? { ...shape, x: shape.x + action.dx, y: shape.y + action.dy } : shape
      );
      return commit(state, shapes, { selectedIds: targetIds, message: "已移动图形" });
    }
    case "rotate": {
      const targetIds = resolveTargetIds(state, action.target);
      if (targetIds.length === 0) {
        return { ...state, message: "没有可旋转的图形" };
      }

      const shapes = state.shapes.map((shape) =>
        targetIds.includes(shape.id) ? { ...shape, rotation: normalizeRotation((shape.rotation ?? 0) + action.degrees) } : shape
      );
      return commit(state, shapes, { selectedIds: targetIds, message: "已旋转图形" });
    }
    case "resize": {
      const targetIds = resolveTargetIds(state, action.target);
      if (targetIds.length === 0) {
        return { ...state, message: "没有可缩放的图形" };
      }

      const shapes = state.shapes.map((shape) =>
        targetIds.includes(shape.id)
          ? { ...shape, width: Math.round(shape.width * action.scale), height: Math.round(shape.height * action.scale) }
          : shape
      );
      return commit(state, shapes, { selectedIds: targetIds, message: "已缩放图形" });
    }
    case "bringToFront": {
      const targetIds = resolveTargetIds(state, action.target);
      if (targetIds.length === 0) {
        return { ...state, message: "没有可调整的图形" };
      }

      const shapes = reorderShapes(state.shapes, targetIds, "front");
      return commit(state, shapes, { selectedIds: targetIds, message: "已置顶图形" });
    }
    case "sendToBack": {
      const targetIds = resolveTargetIds(state, action.target);
      if (targetIds.length === 0) {
        return { ...state, message: "没有可调整的图形" };
      }

      const shapes = reorderShapes(state.shapes, targetIds, "back");
      return commit(state, shapes, { selectedIds: targetIds, message: "已置底图形" });
    }
    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) {
        return { ...state, message: "没有可撤销的操作" };
      }
      return {
        ...state,
        shapes: previous,
        selectedIds: [],
        past: state.past.slice(0, -1),
        future: [state.shapes, ...state.future],
        message: "已撤销"
      };
    }
    case "redo": {
      const next = state.future[0];
      if (!next) {
        return { ...state, message: "没有可重做的操作" };
      }
      return {
        ...state,
        shapes: next,
        selectedIds: next.map((shape) => shape.id).slice(-1),
        past: [...state.past, state.shapes],
        future: state.future.slice(1),
        message: "已重做"
      };
    }
    case "clear":
      return commit(state, [], { selectedIds: [], message: "画布已清空" });
    case "export":
      return { ...state, message: "正在导出 SVG" };
    case "error":
      return { ...state, message: action.message };
    default:
      return state;
  }
}

function reorderShapes(shapes: DrawableShape[], targetIds: string[], direction: "front" | "back"): DrawableShape[] {
  const targetSet = new Set(targetIds);
  const targets = shapes.filter((shape) => targetSet.has(shape.id));
  const rest = shapes.filter((shape) => !targetSet.has(shape.id));
  return direction === "front" ? [...rest, ...targets] : [...targets, ...rest];
}

function commit(state: DrawingState, shapes: DrawableShape[], patch: Partial<DrawingState>): DrawingState {
  return {
    ...state,
    ...patch,
    shapes,
    past: [...state.past, state.shapes],
    future: []
  };
}

function createShapes(
  kind: ShapeKind,
  count: number,
  color: string,
  size: ShapeSize,
  position: ShapePosition,
  rotation: number | undefined,
  strokeColor: string | undefined,
  strokeWidth: number | undefined,
  pathData: string | undefined,
  firstId: number
): DrawableShape[] {
  const points = getPoints(count, position);
  return points.map(([x, y], index) => {
    const dimensions = getDimensions(kind, size);
    return {
      id: `shape-${firstId + index}`,
      kind,
      x,
      y,
      width: dimensions.width,
      height: dimensions.height,
      color,
      rotation: rotation ?? 0,
      strokeColor,
      strokeWidth: strokeWidth ?? 6,
      pathData
    };
  });
}

function updateShapeProps(shape: DrawableShape, props: Partial<ShapeProps>): DrawableShape {
  return {
    ...shape,
    color: props.color ?? shape.color,
    rotation: props.rotation ?? shape.rotation,
    strokeColor: props.strokeColor ?? shape.strokeColor,
    strokeWidth: props.strokeWidth ?? shape.strokeWidth,
    pathData: props.pathData ?? shape.pathData
  };
}

function normalizeRotation(value: number): number {
  if (value > 180) {
    return value - 360;
  }
  if (value < -180) {
    return value + 360;
  }
  return value;
}

function getDimensions(kind: ShapeKind, size: ShapeSize): { width: number; height: number } {
  const base = size === "small" ? 56 : size === "large" ? 132 : 88;
  if (kind === "line") {
    return { width: base * 1.8, height: 0 };
  }
  if (kind === "rect") {
    return { width: base * 1.3, height: base };
  }
  if (kind === "ellipse") {
    return { width: base * 1.45, height: base };
  }
  if (kind === "diamond") {
    return { width: base * 1.1, height: base * 1.1 };
  }
  if (kind === "star") {
    return { width: base * 1.15, height: base * 1.15 };
  }
  return { width: base, height: base };
}

function getPoints(count: number, position: ShapePosition): Array<[number, number]> {
  if (typeof position !== "string") {
    return Array.from({ length: count }, (_, index) => [position.x + index * 24, position.y + index * 24]);
  }

  if (position === "row" && count > 1) {
    const gap = 140;
    const start = 500 - ((count - 1) * gap) / 2;
    return Array.from({ length: count }, (_, index) => [start + index * gap, 280]);
  }

  const map: Record<PresetPosition, [number, number]> = {
    "top-left": [180, 130],
    top: [500, 120],
    "top-right": [820, 130],
    left: [170, 280],
    center: [500, 280],
    right: [830, 280],
    "bottom-left": [180, 430],
    bottom: [500, 440],
    "bottom-right": [820, 430],
    row: [500, 280]
  };

  return Array.from({ length: count }, (_, index) => [map[position][0] + index * 24, map[position][1] + index * 24]);
}
