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

const invalidPlan = {
  type: "plan",
  title: "Draw a rocket",
  steps: [
    {
      id: "rocket-body",
      title: "Draw rocket body",
      dependsOn: [],
      action: {
        type: "create",
        shape: "rocket",
        count: 1,
        props: { color: "#94a3b8", size: "large", position: { x: 500, y: 260 } }
      }
    }
  ]
};

const starPlan = {
  type: "plan",
  title: "Draw a star",
  steps: [
    {
      id: "star-shape",
      title: "Draw a star",
      dependsOn: [],
      action: {
        type: "create",
        shape: "star",
        count: 1,
        props: { color: "#facc15", size: "large", position: { x: 500, y: 280 } }
      }
    }
  ]
};

const robotPlan = {
  type: "plan",
  title: "画一个机器人",
  steps: [
    {
      id: "robot-head",
      title: "画机器人头部",
      dependsOn: [],
      action: {
        type: "create",
        shape: "rect",
        count: 1,
        props: { color: "#94a3b8", size: "medium", position: { x: 500, y: 200 } }
      }
    }
  ]
};

const rocketPlan = {
  type: "plan",
  title: "Draw a rocket",
  steps: [
    {
      id: "rocket-body",
      title: "Draw rocket body",
      dependsOn: [],
      action: {
        type: "create",
        shape: "ellipse",
        count: 1,
        props: { color: "#94a3b8", size: "large", position: { x: 500, y: 260 } }
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

  it("returns a readable config error when the API key contains non-ASCII characters", async () => {
    const provider = createConfiguredPlanProvider({ LLM_API_KEY: "你的APIKey" });

    await expect(provider.generatePlan({ text: "draw it", responseFormat: serverDrawingPlanResponseFormat })).resolves.toEqual({
      ok: false,
      message: "LLM_API_KEY must be an ASCII API key. Replace placeholder text with the real provider key."
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
    const userPrompt = body.messages[1].content;
    expect(systemPrompt).toContain("x: 0-1000");
    expect(systemPrompt).toContain("y: 0-560");
    expect(systemPrompt).toContain("Prefer coordinate positions");
    expect(systemPrompt).toContain("Break complex requests into ordered steps");
    expect(systemPrompt).toContain("dependsOn");
    expect(systemPrompt).toContain("reference earlier step ids");
    expect(systemPrompt).toContain("Do not invent semantic shape names");
    expect(systemPrompt).toContain("shape: \"rocket\"");
    expect(systemPrompt).toContain("Example user request: Draw a rocket");
    expect(systemPrompt).toContain("\"shape\":\"ellipse\"");
    expect(systemPrompt).toContain("\"shape\":\"triangle\"");
    expect(systemPrompt).toContain("\"shape\":\"path\"");
    expect(systemPrompt).toContain("中文示例：画一个机器人");
    expect(systemPrompt).toContain("robot-head");
    expect(systemPrompt).toContain("robot-antenna");
    expect(systemPrompt).toContain("中文示例：画一棵树");
    expect(systemPrompt).toContain("tree-trunk");
    expect(systemPrompt).toContain("中文示例：画一辆汽车");
    expect(systemPrompt).toContain("car-wheel-left");
    expect(userPrompt).toContain("Understand the request literally");
    expect(userPrompt).toContain("Do not draw a question mark as a fallback");
  });

  it("uses json_object response format for DeepSeek JSON Output", async () => {
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
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-v4-pro",
      fetcher
    });

    await provider.generatePlan({ text: "draw an apple", responseFormat: serverDrawingPlanResponseFormat });

    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.max_tokens).toBe(4096);
    expect(body.messages[0].content).toContain("JSON object");
    expect(body.messages[0].content).toContain("use 3-6 create steps");
    expect(body.messages[0].content).toContain("Root object");
    expect(body.messages[0].content).toContain("shape: circle | rect | line | triangle | text | ellipse | diamond | star | path");
    expect(body.messages[0].content).toContain("pathData");
    expect(body.messages[0].content).toContain("M, L, Q, C, and Z");
    expect(body.messages[0].content).toContain("rotation");
    expect(body.messages[0].content).toContain("strokeColor");
  });

  it("turns off Qwen thinking mode for low-latency structured planning", async () => {
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
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen3.7-plus",
      fetcher
    });

    await provider.generatePlan({ text: "画一个机器人", responseFormat: serverDrawingPlanResponseFormat });

    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.enable_thinking).toBe(false);
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
      message: expect.stringContaining("LLM provider returned invalid drawing plan")
    });
  });

  it("repairs an invalid drawing plan once before returning an error", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        async json() {
          return {
            choices: [{ message: { content: JSON.stringify(invalidPlan) } }]
          };
        }
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        async json() {
          return {
            choices: [{ message: { content: JSON.stringify(rocketPlan) } }]
          };
        }
      });
    const provider = createOpenAiCompatiblePlanProvider({ apiKey: "test-key", model: "test-model", fetcher });

    await expect(provider.generatePlan({ text: "draw a rocket", responseFormat: serverDrawingPlanResponseFormat })).resolves.toEqual({
      ok: true,
      source: "llm",
      plan: rocketPlan
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    const repairBody = JSON.parse(fetcher.mock.calls[1][1].body);
    expect(repairBody.messages.at(-1).content).toContain("Fix the invalid DrawingPlan");
    expect(repairBody.messages.at(-1).content).toContain("unsupported shape");
    expect(repairBody.messages.at(-1).content).toContain("draw a rocket");
    expect(repairBody.messages.at(-1).content).toContain("Preserve the user's drawing intent");
    expect(repairBody.messages.at(-1).content).toContain("replace invalid semantic shapes with supported primitives");
  });

  it("repairs a structurally valid plan that does not match the requested object", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        async json() {
          return {
            choices: [{ message: { content: JSON.stringify(starPlan) } }]
          };
        }
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        async json() {
          return {
            choices: [{ message: { content: JSON.stringify(robotPlan) } }]
          };
        }
      });
    const provider = createOpenAiCompatiblePlanProvider({ apiKey: "test-key", model: "test-model", fetcher });

    await expect(provider.generatePlan({ text: "画一个机器人", responseFormat: serverDrawingPlanResponseFormat })).resolves.toEqual({
      ok: true,
      source: "llm",
      plan: robotPlan
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    const repairBody = JSON.parse(fetcher.mock.calls[1][1].body);
    expect(repairBody.messages.at(-1).content).toContain("does not match the requested object");
    expect(repairBody.messages.at(-1).content).toContain("机器人");
  });
});
