import { describe, expect, it } from "vitest";
import { getPlanValidationError, hasValidPlanShape, type ServerDrawingPlan } from "./planContract";

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

  it("accepts safe sketch path data", () => {
    const plan: ServerDrawingPlan = {
      type: "plan",
      title: "Smile",
      steps: [
        {
          id: "smile",
          title: "Draw a smile curve",
          dependsOn: [],
          action: {
            type: "create",
            shape: "path",
            count: 1,
            props: {
              color: "#0f172a",
              size: "medium",
              position: { x: 500, y: 280 },
              pathData: "M 430 310 Q 500 250 570 310"
            }
          }
        }
      ]
    };

    expect(hasValidPlanShape(plan)).toBe(true);
  });

  it("rejects unsupported sketch path commands", () => {
    const plan: ServerDrawingPlan = {
      type: "plan",
      title: "Arc",
      steps: [
        {
          id: "arc",
          title: "Draw an unsupported arc",
          dependsOn: [],
          action: {
            type: "create",
            shape: "path",
            count: 1,
            props: {
              color: "#0f172a",
              size: "medium",
              position: { x: 500, y: 280 },
              pathData: "M 0 0 A 40 40 0 0 1 80 80"
            }
          }
        }
      ]
    };

    expect(hasValidPlanShape(plan)).toBe(false);
  });

  it("explains why a drawing plan is invalid", () => {
    const plan: ServerDrawingPlan = {
      type: "plan",
      title: "Bad rocket",
      steps: [
        {
          id: "rocket-body",
          title: "Draw rocket body",
          dependsOn: [],
          action: {
            type: "create",
            shape: "rocket",
            count: 1,
            props: {
              color: "#94a3b8",
              size: "large",
              position: { x: 500, y: 260 }
            }
          }
        }
      ]
    };

    expect(getPlanValidationError(plan)).toContain("step rocket-body");
    expect(getPlanValidationError(plan)).toContain("unsupported shape");
  });
});
