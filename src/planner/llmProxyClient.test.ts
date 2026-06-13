import { describe, expect, it, vi } from "vitest";
import { drawingPlanResponseFormat } from "./drawingPlanSchema";
import { callLlmPlannerProxy, proxyPlanGenerator } from "./llmProxyClient";

describe("callLlmPlannerProxy", () => {
  it("posts text and response format to the planner proxy", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        source: "llm",
        plan: {
          type: "plan",
          title: "画一个流程图",
          steps: [
            {
              id: "start",
              title: "画开始节点",
              dependsOn: [],
              action: {
                type: "create",
                shape: "rect",
                count: 1,
                props: { color: "#2563eb", size: "medium", position: { x: 500, y: 200 } }
              }
            }
          ]
        }
      })
    );

    const result = await callLlmPlannerProxy("画一个流程图", { fetcher: fetchMock });

    expect(fetchMock).toHaveBeenCalledWith("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "画一个流程图",
        responseFormat: drawingPlanResponseFormat
      })
    });
    expect(result).toMatchObject({
      ok: true,
      source: "llm",
      plan: { title: "画一个流程图" }
    });
  });

  it("returns a useful error when the proxy responds with http failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "quota exceeded" }, 429));

    await expect(callLlmPlannerProxy("画一个流程图", { fetcher: fetchMock })).resolves.toEqual({
      ok: false,
      message: "LLM planner proxy failed: 429 quota exceeded"
    });
  });

  it("rejects malformed successful proxy responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, source: "llm" }));

    await expect(callLlmPlannerProxy("画一个流程图", { fetcher: fetchMock })).resolves.toEqual({
      ok: false,
      message: "LLM planner proxy returned invalid result"
    });
  });

  it("returns a useful error when the proxy request throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));

    await expect(callLlmPlannerProxy("画一个流程图", { fetcher: fetchMock })).resolves.toEqual({
      ok: false,
      message: "LLM planner proxy request failed: network down"
    });
  });

  it("exposes a PlanGenerator-compatible proxy adapter", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        source: "llm",
        plan: {
          type: "plan",
          title: "画一个图标",
          steps: []
        }
      })
    );

    await proxyPlanGenerator(
      {
        text: "画一个图标",
        responseFormat: drawingPlanResponseFormat
      },
      { fetcher: fetchMock }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/plan",
      expect.objectContaining({
        method: "POST"
      })
    );
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response;
}
