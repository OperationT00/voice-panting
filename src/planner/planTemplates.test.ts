import { describe, expect, it } from "vitest";
import { findPlanTemplate, planTemplates } from "./planTemplates";

describe("planTemplates", () => {
  it("finds a house drawing template by natural language keywords", () => {
    expect(findPlanTemplate("画一幅小房子")).toEqual({
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

  it("returns a fresh plan instance for each template match", () => {
    const firstPlan = findPlanTemplate("画一座房子");
    const secondPlan = findPlanTemplate("画一座房子");

    expect(firstPlan).not.toBe(secondPlan);
    expect(firstPlan?.steps[0]).not.toBe(secondPlan?.steps[0]);
  });

  it("keeps template metadata separate from executable plan output", () => {
    const houseTemplate = planTemplates.find((template) => template.id === "house-scene");

    expect(houseTemplate?.keywords).toContain("房子");
    expect(houseTemplate).toMatchObject({ category: "scene", source: "manual" });
    expect(findPlanTemplate("画一座房子")).not.toHaveProperty("keywords");
  });

  it("finds an apple sketch template with layered details", () => {
    const appleTemplate = planTemplates.find((template) => template.id === "apple-sketch");
    const plan = findPlanTemplate("画一个苹果");

    expect(appleTemplate).toMatchObject({ category: "object", source: "manual" });
    expect(plan?.steps.map((step) => step.id)).toEqual(["apple-body", "apple-shadow", "apple-stem", "apple-leaf", "apple-highlight"]);
    expect(plan?.steps.map((step) => step.action.type)).toEqual(["create", "create", "create", "create", "create"]);
    expect(plan?.steps[0].action).toMatchObject({ shape: "ellipse", props: { strokeColor: "#7f1d1d", strokeWidth: 3 } });
    expect(plan?.steps[3].action).toMatchObject({ shape: "ellipse", props: { rotation: -28, strokeColor: "#14532d", strokeWidth: 3 } });
  });
});
