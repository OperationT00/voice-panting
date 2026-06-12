import type { DrawableShape, DrawingAction, ShapeKind, ShapePosition, ShapeSize } from "./types";

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

      const shapes = state.shapes.map((shape) =>
        targetIds.includes(shape.id) && action.props.color ? { ...shape, color: action.props.color } : shape
      );
      return commit(state, shapes, { selectedIds: targetIds, message: "已更新图形" });
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

function resolveTargetIds(state: DrawingState, target: { ref: "last" | "all" | "selected" }): string[] {
  if (target.ref === "all") {
    return state.shapes.map((shape) => shape.id);
  }
  if (target.ref === "selected") {
    return state.selectedIds;
  }
  return state.selectedIds.length > 0 ? state.selectedIds : state.shapes.slice(-1).map((shape) => shape.id);
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
      strokeWidth: 6
    };
  });
}

function getDimensions(kind: ShapeKind, size: ShapeSize): { width: number; height: number } {
  const base = size === "small" ? 56 : size === "large" ? 132 : 88;
  if (kind === "line") {
    return { width: base * 1.8, height: 0 };
  }
  if (kind === "rect") {
    return { width: base * 1.3, height: base };
  }
  return { width: base, height: base };
}

function getPoints(count: number, position: ShapePosition): Array<[number, number]> {
  if (position === "row" && count > 1) {
    const gap = 140;
    const start = 500 - ((count - 1) * gap) / 2;
    return Array.from({ length: count }, (_, index) => [start + index * gap, 280]);
  }

  const map: Record<ShapePosition, [number, number]> = {
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
