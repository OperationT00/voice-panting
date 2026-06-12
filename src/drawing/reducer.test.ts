import { describe, expect, it } from "vitest";
import { createInitialDrawingState, drawingReducer } from "./reducer";

describe("drawingReducer", () => {
  it("creates multiple row-arranged shapes", () => {
    const state = drawingReducer(createInitialDrawingState(), {
      type: "create",
      shape: "circle",
      count: 3,
      props: {
        color: "#ef4444",
        size: "medium",
        position: "row"
      }
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
      props: {
        color: "#2563eb",
        size: "medium",
        position: "center"
      }
    });

    const updated = drawingReducer(created, {
      type: "update",
      target: { ref: "last" },
      props: { color: "#9333ea" }
    });

    expect(updated.shapes[0].color).toBe("#9333ea");
  });

  it("updates shapes matched by kind target", () => {
    const state = {
      ...createInitialDrawingState(),
      shapes: [
        { id: "shape-1", kind: "circle" as const, x: 100, y: 100, width: 80, height: 80, color: "#ef4444", strokeWidth: 6 },
        { id: "shape-2", kind: "rect" as const, x: 200, y: 100, width: 120, height: 80, color: "#ef4444", strokeWidth: 6 },
        { id: "shape-3", kind: "circle" as const, x: 300, y: 100, width: 80, height: 80, color: "#2563eb", strokeWidth: 6 }
      ]
    };

    const updated = drawingReducer(state, {
      type: "update",
      target: { kind: "circle" },
      props: { color: "#16a34a" }
    });

    expect(updated.shapes.map((shape) => shape.color)).toEqual(["#16a34a", "#ef4444", "#16a34a"]);
  });

  it("updates shapes matched by color target", () => {
    const state = {
      ...createInitialDrawingState(),
      shapes: [
        { id: "shape-1", kind: "circle" as const, x: 100, y: 100, width: 80, height: 80, color: "#ef4444", strokeWidth: 6 },
        { id: "shape-2", kind: "rect" as const, x: 200, y: 100, width: 120, height: 80, color: "#2563eb", strokeWidth: 6 },
        { id: "shape-3", kind: "triangle" as const, x: 300, y: 100, width: 80, height: 80, color: "#ef4444", strokeWidth: 6 }
      ]
    };

    const updated = drawingReducer(state, {
      type: "update",
      target: { color: "#ef4444" },
      props: { color: "#9333ea" }
    });

    expect(updated.shapes.map((shape) => shape.color)).toEqual(["#9333ea", "#2563eb", "#9333ea"]);
  });

  it("deletes shapes matched by target", () => {
    const state = {
      ...createInitialDrawingState(),
      shapes: [
        { id: "shape-1", kind: "circle" as const, x: 100, y: 100, width: 80, height: 80, color: "#ef4444", strokeWidth: 6 },
        { id: "shape-2", kind: "rect" as const, x: 200, y: 100, width: 120, height: 80, color: "#2563eb", strokeWidth: 6 }
      ]
    };

    const updated = drawingReducer(state, {
      type: "delete",
      target: { kind: "circle" }
    });

    expect(updated.shapes.map((shape) => shape.id)).toEqual(["shape-2"]);
  });

  it("moves shapes matched by target", () => {
    const state = {
      ...createInitialDrawingState(),
      shapes: [{ id: "shape-1", kind: "circle" as const, x: 100, y: 100, width: 80, height: 80, color: "#ef4444", strokeWidth: 6 }],
      selectedIds: ["shape-1"]
    };

    const updated = drawingReducer(state, {
      type: "move",
      target: { ref: "selected" },
      dx: 60,
      dy: -20
    });

    expect(updated.shapes[0]).toMatchObject({ x: 160, y: 80 });
  });

  it("resizes shapes matched by target", () => {
    const state = {
      ...createInitialDrawingState(),
      shapes: [{ id: "shape-1", kind: "rect" as const, x: 100, y: 100, width: 120, height: 80, color: "#2563eb", strokeWidth: 6 }],
      selectedIds: ["shape-1"]
    };

    const updated = drawingReducer(state, {
      type: "resize",
      target: { ref: "selected" },
      scale: 1.5
    });

    expect(updated.shapes[0]).toMatchObject({ width: 180, height: 120 });
  });

  it("supports undo and redo", () => {
    const created = drawingReducer(createInitialDrawingState(), {
      type: "create",
      shape: "triangle",
      count: 1,
      props: {
        color: "#16a34a",
        size: "medium",
        position: "center"
      }
    });

    const undone = drawingReducer(created, { type: "undo" });
    const redone = drawingReducer(undone, { type: "redo" });

    expect(undone.shapes).toHaveLength(0);
    expect(redone.shapes).toHaveLength(1);
    expect(redone.shapes[0].kind).toBe("triangle");
  });
});
