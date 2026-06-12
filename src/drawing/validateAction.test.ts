import { describe, expect, it } from "vitest";
import { validateAction } from "./validateAction";
import type { DrawingAction } from "./types";

describe("validateAction", () => {
  it("accepts a valid create action", () => {
    const action: DrawingAction = {
      type: "create",
      shape: "circle",
      count: 3,
      props: {
        color: "#ef4444",
        size: "medium",
        position: "row"
      }
    };

    expect(validateAction(action)).toEqual({ ok: true });
  });

  it("rejects invalid colors", () => {
    const action = {
      type: "create",
      shape: "circle",
      count: 1,
      props: {
        color: "red",
        size: "medium",
        position: "center"
      }
    };

    expect(validateAction(action)).toEqual({ ok: false, message: "颜色必须是 #RRGGBB 格式" });
  });

  it("rejects unsafe create counts", () => {
    const action = {
      type: "create",
      shape: "circle",
      count: 20,
      props: {
        color: "#ef4444",
        size: "medium",
        position: "row"
      }
    };

    expect(validateAction(action)).toEqual({ ok: false, message: "一次最多创建 8 个图形" });
  });

  it("rejects unsafe move distances", () => {
    const action = {
      type: "move",
      target: { ref: "last" },
      dx: 999,
      dy: 0
    };

    expect(validateAction(action)).toEqual({ ok: false, message: "移动距离超出安全范围" });
  });

  it("rejects unsafe resize scales", () => {
    const action = {
      type: "resize",
      target: { ref: "last" },
      scale: 4
    };

    expect(validateAction(action)).toEqual({ ok: false, message: "缩放比例超出安全范围" });
  });
});
