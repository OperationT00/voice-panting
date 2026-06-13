import { describe, expect, it, vi } from "vitest";
import { serverDrawingPlanResponseFormat } from "./planContract";
import { createConfiguredPlanProvider, createOpenAiCompatiblePlanProvider } from "./planProvider";

const validPlan = {
  type: "plan",
  title: "Draw a flow chart",
  steps: [
    {
      id: "start",
      title: "Draw start",
      dependsOn: [],
      action: {
        type: "create",
        shape: "rect",
        count: 1,
        props: { color: "#2563eb", size: "medium", position: { x: 500, y: 160 } }
      }
    }
  ]
};

describe("createConfiguredPlanProvider", () => {
  it("uses the mock provider when no API key is configured", async () => {
    const provider = createConfiguredPlanProvider({});

    await expect(provider.generatePlan({ text: "flow chart", responseFormat: serverDrawingPlanResponseFormat })).resolves.toMatchObject({
      ok: true,
      source: "llm",
      plan: {
        type: "plan",
        steps: expect.any(Array)
      }
    });
  });
});

describe("createOpenAiCompatiblePlanProvider", () => {
  it("calls a chat completions endpoint and parses a structured drawing plan", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      async json() {
        return {
          choices: [{ message: { content: JSON.stringify(validPlan) } }]
        };
      }
    });
    const provider = createOpenAiCompatiblePlanProvider({
      apiKey: "test-key",
      baseUrl: "https://example.test/v1",
      model: "test-model",
      fetcher
    });

    await expect(provider.generatePlan({ text: "draw it", responseFormat: serverDrawingPlanResponseFormat })).resolves.toEqual({
      ok: true,
      source: "llm",
      plan: validPlan
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://example.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json"
        }),
        body: expect.any(String)
      })
    );
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body).toMatchObject({
      model: "test-model",
      response_format: serverDrawingPlanResponseFormat
    });
  });

  it("sends planning guidance for coordinates, ordered steps, and dependencies", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      async json() {
        return {
          choices: [{ message: { content: JSON.stringify(validPlan) } }]
        };
      }
    });
    const provider = createOpenAiCompatiblePlanProvider({ apiKey: "test-key", model: "test-model", fetcher });

    await provider.generatePlan({ text: "draw a login flow", responseFormat: serverDrawingPlanResponseFormat });

    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    const systemPrompt = body.messages[0].content;
    expect(systemPrompt).toContain("x: 0-1000");
    expect(systemPrompt).toContain("y: 0-560");
    expect(systemPrompt).toContain("Prefer coordinate positions");
    expect(systemPrompt).toContain("Break complex requests into ordered steps");
    expect(systemPrompt).toContain("dependsOn");
    expect(systemPrompt).toContain("reference earlier step ids");
  });

  it("returns a clear error when the provider response is not a valid plan", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      async json() {
        return { choices: [{ message: { content: "{\"type\":\"plan\",\"title\":\"bad\",\"steps\":[]}" } }] };
      }
    });
    const provider = createOpenAiCompatiblePlanProvider({ apiKey: "test-key", model: "test-model", fetcher });

    await expect(provider.generatePlan({ text: "draw it", responseFormat: serverDrawingPlanResponseFormat })).resolves.toEqual({
      ok: false,
      message: "LLM provider returned invalid drawing plan"
    });
  });
});
