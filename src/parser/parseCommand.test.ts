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

  it("creates a shape at an explicit coordinate", () => {
    expect(parseCommand("在坐标200,300画一个红色圆")).toEqual([
      {
        type: "create",
        shape: "circle",
        count: 1,
        props: {
          color: "#ef4444",
          size: "medium",
          position: { x: 200, y: 300 }
        }
      }
    ]);
  });

  it("creates a default sketch curve path", () => {
    expect(parseCommand("画一条黑色曲线")).toEqual([
      {
        type: "create",
        shape: "path",
        count: 1,
        props: {
          color: "#111827",
          size: "medium",
          position: "center",
          pathData: "M 430 310 Q 500 250 570 310",
          strokeWidth: 5
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

  it("updates a shape by kind and one-based index", () => {
    expect(parseCommand("把第二个圆改成蓝色")).toEqual([
      {
        type: "update",
        target: { kind: "circle", index: 2 },
        props: {
          color: "#2563eb"
        }
      }
    ]);
  });

  it("updates all shapes by kind", () => {
    expect(parseCommand("把所有圆改成绿色")).toEqual([
      {
        type: "update",
        target: { kind: "circle" },
        props: {
          color: "#16a34a"
        }
      }
    ]);
  });

  it("updates all shapes by current color", () => {
    expect(parseCommand("把所有红色图形改成蓝色")).toEqual([
      {
        type: "update",
        target: { color: "#ef4444" },
        props: {
          color: "#2563eb"
        }
      }
    ]);
  });

  it("deletes shapes by target", () => {
    expect(parseCommand("删除第二个圆")).toEqual([
      {
        type: "delete",
        target: { kind: "circle", index: 2 }
      }
    ]);
  });

  it("moves the last shape by direction", () => {
    expect(parseCommand("把刚才的图形向右移动一点")).toEqual([
      {
        type: "move",
        target: { ref: "last" },
        dx: 60,
        dy: 0
      }
    ]);
  });

  it("parses micro movement commands", () => {
    expect(parseCommand("把刚才的图形向左微调一点")).toEqual([
      {
        type: "move",
        target: { ref: "last" },
        dx: -16,
        dy: 0
      }
    ]);
  });

  it("parses rotation and stroke tuning commands", () => {
    expect(parseCommand("把刚才的图形顺时针旋转一点")).toEqual([
      {
        type: "rotate",
        target: { ref: "last" },
        degrees: 10
      }
    ]);

    expect(parseCommand("把刚才的图形描边加粗")).toEqual([
      {
        type: "update",
        target: { ref: "last" },
        props: { strokeWidth: 10 }
      }
    ]);
  });

  it("parses voice template save commands", () => {
    expect(parseCommand("保存为模板")).toEqual([{ type: "saveTemplate" }]);
    expect(parseCommand("保存此模板")).toEqual([{ type: "saveTemplate" }]);
    expect(parseCommand("保存当前模板")).toEqual([{ type: "saveTemplate" }]);
  });

  it("resizes shapes by target", () => {
    expect(parseCommand("把所有圆放大")).toEqual([
      {
        type: "resize",
        target: { kind: "circle" },
        scale: 1.25
      }
    ]);
  });

  it("parses layer ordering commands", () => {
    expect(parseCommand("把第二个圆置顶")).toEqual([
      {
        type: "bringToFront",
        target: { kind: "circle", index: 2 }
      }
    ]);

    expect(parseCommand("把第二个圆置底")).toEqual([
      {
        type: "sendToBack",
        target: { kind: "circle", index: 2 }
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

  it("parses a complex scene command into an ordered drawing plan", () => {
    expect(parseCommand("画一幅小房子")).toEqual({
      type: "plan",
      title: "画一幅小房子",
      steps: [
        {
          id: "house-body",
          title: "画房身",
          action: {
            type: "create",
            shape: "rect",
            count: 1,
            props: { color: "#f97316", size: "large", position: { x: 500, y: 340 } }
          }
        },
        {
          id: "house-roof",
          title: "画屋顶",
          dependsOn: ["house-body"],
          action: {
            type: "create",
            shape: "triangle",
            count: 1,
            props: { color: "#ef4444", size: "large", position: { x: 500, y: 230 } }
          }
        },
        {
          id: "sun",
          title: "画太阳",
          action: {
            type: "create",
            shape: "circle",
            count: 1,
            props: { color: "#eab308", size: "medium", position: { x: 830, y: 110 } }
          }
        }
      ]
    });
  });
});
