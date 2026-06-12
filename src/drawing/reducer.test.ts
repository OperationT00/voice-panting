import { describe, expect, it } from "vitest";
import { createInitialDrawingState, drawingReducer } from "./reducer";

describe("drawingReducer", () => {
  it("creates multiple row-arranged shapes", () => {
    const state = drawingReducer(createInitialDrawingState(), {
      type: "create",
      shape: "circle",
      count: 3,
      color: "#ef4444",
      size: "medium",
      position: "row"
    });

    expect(state.shapes).toHaveLength(3);
    expect(state.shapes.map((shape) => shape.kind)).toEqual(["circle", "circle", "circle"]);
    expect(state.shapes.map((shape) => shape.color)).toEqual(["#ef4444", "#ef4444", "#ef4444"]);
    expect(state.selectedIds).toEqual(["shape-1", "shape-2", "shape-3"]);
  });

  it("updates the selected shape color", () => {
    const created = drawingReducer(createInitialDrawingState(), {
      type: "create",
      shape: "rect",
      count: 1,
      color: "#2563eb",
      size: "medium",
      position: "center"
    });

    const updated = drawingReducer(created, {
      type: "update",
      target: "last",
      props: { color: "#9333ea" }
    });

    expect(updated.shapes[0].color).toBe("#9333ea");
  });

  it("supports undo and redo", () => {
    const created = drawingReducer(createInitialDrawingState(), {
      type: "create",
      shape: "triangle",
      count: 1,
      color: "#16a34a",
      size: "medium",
      position: "center"
    });

    const undone = drawingReducer(created, { type: "undo" });
    const redone = drawingReducer(undone, { type: "redo" });

    expect(undone.shapes).toHaveLength(0);
    expect(redone.shapes).toHaveLength(1);
    expect(redone.shapes[0].kind).toBe("triangle");
  });
});
