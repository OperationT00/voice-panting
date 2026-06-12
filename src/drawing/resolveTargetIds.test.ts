import { describe, expect, it } from "vitest";
import { resolveTargetIds } from "./resolveTargetIds";
import type { DrawingState } from "./reducer";

const baseState: DrawingState = {
  shapes: [
    { id: "shape-1", kind: "circle", x: 100, y: 200, width: 80, height: 80, color: "#ef4444", strokeWidth: 6 },
    { id: "shape-2", kind: "rect", x: 300, y: 120, width: 120, height: 80, color: "#2563eb", strokeWidth: 6 },
    { id: "shape-3", kind: "circle", x: 500, y: 420, width: 80, height: 80, color: "#ef4444", strokeWidth: 6 },
    { id: "shape-4", kind: "triangle", x: 820, y: 260, width: 80, height: 80, color: "#16a34a", strokeWidth: 6 }
  ],
  selectedIds: ["shape-2"],
  past: [],
  future: [],
  nextId: 5,
  message: "ready"
};

describe("resolveTargetIds", () => {
  it("resolves built-in references", () => {
    expect(resolveTargetIds(baseState, { ref: "last" })).toEqual(["shape-2"]);
    expect(resolveTargetIds(baseState, { ref: "selected" })).toEqual(["shape-2"]);
    expect(resolveTargetIds(baseState, { ref: "all" })).toEqual(["shape-1", "shape-2", "shape-3", "shape-4"]);
  });

  it("falls back to the final shape when last has no selection", () => {
    expect(resolveTargetIds({ ...baseState, selectedIds: [] }, { ref: "last" })).toEqual(["shape-4"]);
  });

  it("resolves by shape kind and one-based index", () => {
    expect(resolveTargetIds(baseState, { kind: "circle" })).toEqual(["shape-1", "shape-3"]);
    expect(resolveTargetIds(baseState, { kind: "circle", index: 2 })).toEqual(["shape-3"]);
  });

  it("resolves by color", () => {
    expect(resolveTargetIds(baseState, { color: "#ef4444" })).toEqual(["shape-1", "shape-3"]);
  });

  it("resolves spatial targets", () => {
    expect(resolveTargetIds(baseState, { spatial: "leftmost" })).toEqual(["shape-1"]);
    expect(resolveTargetIds(baseState, { spatial: "rightmost" })).toEqual(["shape-4"]);
    expect(resolveTargetIds(baseState, { spatial: "topmost" })).toEqual(["shape-2"]);
    expect(resolveTargetIds(baseState, { spatial: "bottommost" })).toEqual(["shape-3"]);
  });
});
