import { describe, expect, it } from "vitest";
import { prepareActions } from "./actionPipeline";

describe("prepareActions", () => {
  it("passes through valid actions", () => {
    const actions = [
      {
        type: "move",
        target: { ref: "last" },
        dx: 60,
        dy: 0
      }
    ];

    expect(prepareActions(actions)).toEqual(actions);
  });

  it("converts invalid actions into an error action", () => {
    expect(
      prepareActions([
        {
          type: "move",
          target: { ref: "last" },
          dx: 999,
          dy: 0
        }
      ])
    ).toEqual([
      {
        type: "error",
        message: "移动距离超出安全范围"
      }
    ]);
  });

  it("expands a drawing plan into ordered actions", () => {
    const firstAction = {
      type: "create",
      shape: "rect",
      count: 1,
      props: {
        color: "#f97316",
        size: "large",
        position: { x: 500, y: 330 }
      }
    };
    const secondAction = {
      type: "create",
      shape: "triangle",
      count: 1,
      props: {
        color: "#ef4444",
        size: "medium",
        position: { x: 500, y: 230 }
      }
    };

    expect(
      prepareActions({
        type: "plan",
        title: "画一座小房子",
        steps: [
          { id: "body", title: "画房身", action: firstAction },
          { id: "roof", title: "画屋顶", action: secondAction, dependsOn: ["body"] }
        ]
      })
    ).toEqual([firstAction, secondAction]);
  });

  it("converts invalid plans into an error action", () => {
    expect(
      prepareActions({
        type: "plan",
        title: "重复步骤",
        steps: [
          {
            id: "shape",
            title: "画圆",
            action: {
              type: "create",
              shape: "circle",
              count: 1,
              props: { color: "#ef4444", size: "medium", position: "center" }
            }
          },
          {
            id: "shape",
            title: "再画圆",
            action: {
              type: "create",
              shape: "circle",
              count: 1,
              props: { color: "#2563eb", size: "medium", position: "right" }
            }
          }
        ]
      })
    ).toEqual([{ type: "error", message: "计划步骤 id 重复" }]);
  });

  it("rejects plans that depend on future steps", () => {
    expect(
      prepareActions({
        type: "plan",
        title: "错误依赖",
        steps: [
          {
            id: "roof",
            title: "画屋顶",
            dependsOn: ["body"],
            action: {
              type: "create",
              shape: "triangle",
              count: 1,
              props: { color: "#ef4444", size: "medium", position: "top" }
            }
          },
          {
            id: "body",
            title: "画房身",
            action: {
              type: "create",
              shape: "rect",
              count: 1,
              props: { color: "#f97316", size: "large", position: "center" }
            }
          }
        ]
      })
    ).toEqual([{ type: "error", message: "计划步骤依赖无效" }]);
  });
});
