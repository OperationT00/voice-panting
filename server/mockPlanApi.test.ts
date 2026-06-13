import { describe, expect, it } from "vitest";
import { handleMockPlanRequest } from "./mockPlanApi";

describe("handleMockPlanRequest", () => {
  it("returns a mock flowchart plan for flowchart requests", async () => {
    await expect(handleMockPlanRequest({ text: "画一个流程图", responseFormat: {} })).resolves.toEqual({
      status: 200,
      body: {
        ok: true,
        source: "llm",
        plan: {
          type: "plan",
          title: "画一个流程图",
          steps: [
            {
              id: "flow-start",
              title: "画开始节点",
              dependsOn: [],
              action: {
                type: "create",
                shape: "rect",
                count: 1,
                props: { color: "#2563eb", size: "medium", position: { x: 500, y: 160 } }
              }
            },
            {
              id: "flow-arrow",
              title: "画连接线",
              dependsOn: ["flow-start"],
              action: {
                type: "create",
                shape: "line",
                count: 1,
                props: { color: "#111827", size: "medium", position: { x: 500, y: 280 } }
              }
            },
            {
              id: "flow-end",
              title: "画结束节点",
              dependsOn: ["flow-start", "flow-arrow"],
              action: {
                type: "create",
                shape: "rect",
                count: 1,
                props: { color: "#16a34a", size: "medium", position: { x: 500, y: 400 } }
              }
            }
          ]
        }
      }
    });
  });

  it("returns a clear mock message for unmatched requests", async () => {
    await expect(handleMockPlanRequest({ text: "画一个宇宙飞船", responseFormat: {} })).resolves.toEqual({
      status: 200,
      body: {
        ok: false,
        message: "Mock /api/plan is ready; real provider is not configured"
      }
    });
  });

  it("rejects malformed requests", async () => {
    await expect(handleMockPlanRequest({ responseFormat: {} })).resolves.toEqual({
      status: 400,
      body: {
        ok: false,
        message: "Request body must include text"
      }
    });
  });
});
