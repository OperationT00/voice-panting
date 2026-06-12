import type { DrawingState } from "./reducer";
import type { DrawableShape, TargetRef } from "./types";

export function resolveTargetIds(state: DrawingState, target: TargetRef): string[] {
  if ("ref" in target) {
    return resolveReferenceTarget(state, target.ref);
  }

  if ("kind" in target) {
    const matches = state.shapes.filter((shape) => shape.kind === target.kind);
    if (target.index === undefined) {
      return matches.map((shape) => shape.id);
    }
    return matches[target.index - 1] ? [matches[target.index - 1].id] : [];
  }

  if ("color" in target) {
    return state.shapes.filter((shape) => shape.color === target.color).map((shape) => shape.id);
  }

  if ("spatial" in target) {
    const match = pickSpatialShape(state.shapes, target.spatial);
    return match ? [match.id] : [];
  }

  return [];
}

function resolveReferenceTarget(state: DrawingState, ref: "last" | "all" | "selected"): string[] {
  if (ref === "all") {
    return state.shapes.map((shape) => shape.id);
  }

  if (ref === "selected") {
    return state.selectedIds;
  }

  return state.selectedIds.length > 0 ? state.selectedIds : state.shapes.slice(-1).map((shape) => shape.id);
}

function pickSpatialShape(shapes: DrawableShape[], spatial: "leftmost" | "rightmost" | "topmost" | "bottommost") {
  if (shapes.length === 0) {
    return undefined;
  }

  const sorted = [...shapes].sort((a, b) => {
    if (spatial === "leftmost") {
      return a.x - b.x;
    }
    if (spatial === "rightmost") {
      return b.x - a.x;
    }
    if (spatial === "topmost") {
      return a.y - b.y;
    }
    return b.y - a.y;
  });

  return sorted[0];
}
