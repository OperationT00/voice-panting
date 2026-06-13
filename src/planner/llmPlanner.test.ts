import { describe, expect, it } from "vitest";
import { drawingPlanResponseFormat } from "./drawingPlanSchema";
import { mockPlanGenerator, planFromText } from "./llmPlanner";

describe("planFromText", () => {
  it("returns a template plan before calling the fallback generator", async () => {
    let fallbackCalled = false;

    const result = await planFromText("画一幅小房子", async () => {
      fallbackCalled = true;
      return {
        ok: false,
        message: "should not be called"
      };
    });

    expect(result).toMatchObject({
      ok: true,
      source: "template",
      plan: {
        type: "plan",
        title: "画一幅小房子"
      }
    });
    expect(fallbackCalled).toBe(false);
  });

  it("uses the fallback generator when no template matches", async () => {
    const result = await planFromText("画一个蓝色按钮流程图", async (input) => ({
      ok: true,
      source: "mock",
      plan: {
        type: "plan",
        title: input.text,
        steps: [
          {
            id: "flow-start",
            title: "画开始节点",
            dependsOn: [],
            action: {
              type: "create",
              shape: "rect",
              count: 1,
              props: { color: "#2563eb", size: "medium", position: { x: 360, y: 240 } }
            }
          }
        ]
      }
    }));

    expect(result).toMatchObject({
      ok: true,
      source: "mock",
      plan: {
        title: "画一个蓝色按钮流程图"
      }
    });
  });

  it("passes the drawing plan schema to the fallback generator", async () => {
    let schemaFromInput: unknown;

    await planFromText("画一个流程图", async (input) => {
      schemaFromInput = input.responseFormat;
      return { ok: false, message: "暂未生成计划" };
    });

    expect(schemaFromInput).toBe(drawingPlanResponseFormat);
  });

  it("returns a planner error when fallback generation fails", async () => {
    await expect(planFromText("随便画点复杂的东西", mockPlanGenerator)).resolves.toEqual({
      ok: false,
      message: "暂未接入真实 LLM planner"
    });
  });
});
