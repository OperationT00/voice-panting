import { describe, expect, it } from "vitest";
import { parseCommand } from "./parseCommand";

describe("parseCommand", () => {
  it("creates a red circle from a basic Chinese voice command", () => {
    expect(parseCommand("画一个红色圆")).toEqual([
      {
        type: "create",
        shape: "circle",
        count: 1,
        props: {
          color: "#ef4444",
          size: "medium",
          position: "center"
        }
      }
    ]);
  });

  it("creates multiple blue rectangles arranged from left to right", () => {
    expect(parseCommand("画三个蓝色矩形，从左到右排列")).toEqual([
      {
        type: "create",
        shape: "rect",
        count: 3,
        props: {
          color: "#2563eb",
          size: "medium",
          position: "row"
        }
      }
    ]);
  });

  it("updates the last shape color", () => {
    expect(parseCommand("把刚才的图形改成紫色")).toEqual([
      {
        type: "update",
        target: { ref: "last" },
        props: {
          color: "#9333ea"
        }
      }
    ]);
  });

  it("parses undo redo clear and export commands", () => {
    expect(parseCommand("撤销")).toEqual([{ type: "undo" }]);
    expect(parseCommand("重做")).toEqual([{ type: "redo" }]);
    expect(parseCommand("清空画布")).toEqual([{ type: "clear" }]);
    expect(parseCommand("导出SVG")).toEqual([{ type: "export" }]);
  });

  it("returns an error action for unsupported commands", () => {
    expect(parseCommand("随便来点抽象艺术")).toEqual([
      {
        type: "error",
        message: "没听懂图形或操作，请换一种说法"
      }
    ]);
  });
});
