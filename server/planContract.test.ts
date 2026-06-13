import { describe, expect, it } from "vitest";
import { hasValidPlanShape, type ServerDrawingPlan } from "./planContract";

describe("hasValidPlanShape", () => {
  it("accepts optional sketch style props on create actions", () => {
    const plan: ServerDrawingPlan = {
      type: "plan",
      title: "Styled leaf",
      steps: [
        {
          id: "leaf",
          title: "Draw a rotated leaf",
          dependsOn: [],
          action: {
            type: "create",
            shape: "ellipse",
            count: 1,
            props: {
              color: "#16a34a",
              size: "small",
              position: { x: 520, y: 220 },
              rotation: -28,
              strokeColor: "#14532d",
              strokeWidth: 4
            }
          }
        }
      ]
    };

    expect(hasValidPlanShape(plan)).toBe(true);
  });

  it("rejects unsafe sketch style props on create actions", () => {
    const plan: ServerDrawingPlan = {
      type: "plan",
      title: "Bad styled leaf",
      steps: [
        {
          id: "leaf",
          title: "Draw a rotated leaf",
          dependsOn: [],
          action: {
            type: "create",
            shape: "ellipse",
            count: 1,
            props: {
              color: "#16a34a",
              size: "small",
              position: { x: 520, y: 220 },
              rotation: 720,
              strokeColor: "#14532d",
              strokeWidth: 4
            }
          }
        }
      ]
    };

    expect(hasValidPlanShape(plan)).toBe(false);
  });
});
