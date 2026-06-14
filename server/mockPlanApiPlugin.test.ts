import { describe, expect, it, vi } from "vitest";
import { serverDrawingPlanResponseFormat } from "./planContract";
import { mockPlanApiPlugin } from "./mockPlanApiPlugin";

const validPlan = {
  type: "plan",
  title: "Draw an apple",
  steps: [
    {
      id: "apple-body",
      title: "Draw apple body",
      dependsOn: [],
      action: {
        type: "create",
        shape: "circle",
        count: 1,
        props: { color: "#dc2626", size: "large", position: { x: 500, y: 300 } }
      }
    }
  ]
};

describe("mockPlanApiPlugin", () => {
  it("uses injected env variables for the real provider", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      async json() {
        return {
          choices: [{ message: { content: JSON.stringify(validPlan) } }]
        };
      }
    });
    vi.stubGlobal("fetch", fetcher);

    const handler = getRegisteredHandler(
      mockPlanApiPlugin({
        LLM_API_KEY: "test-key",
        LLM_MODEL: "test-model",
        LLM_BASE_URL: "https://example.test/v1"
      })
    );
    const response = createResponse();

    await handler(
      createRequest({
        text: "draw an apple",
        responseFormat: serverDrawingPlanResponseFormat
      }),
      response
    );

    expect(fetcher).toHaveBeenCalledWith("https://example.test/v1/chat/completions", expect.objectContaining({ method: "POST" }));
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      ok: true,
      source: "llm",
      plan: {
        title: "Draw an apple"
      }
    });
  });
});

function getRegisteredHandler(plugin: ReturnType<typeof mockPlanApiPlugin>) {
  const handlers = new Map<string, (request: unknown, response: ReturnType<typeof createResponse>) => Promise<void>>();
  const configureServer = plugin.configureServer as (server: {
    middlewares: {
      use: (path: string, next: (request: unknown, response: ReturnType<typeof createResponse>) => Promise<void>) => void;
    };
  }) => void;

  configureServer({
    middlewares: {
      use(path, next) {
        handlers.set(path, next);
      }
    }
  });

  const handler = handlers.get("/api/plan");
  if (!handler) {
    throw new Error("Plugin did not register /api/plan handler");
  }

  return handler;
}

function createRequest(body: unknown) {
  const text = JSON.stringify(body);

  return {
    method: "POST",
    on(event: "data" | "end" | "error", callback: (chunk?: { toString: (encoding?: string) => string }) => void) {
      if (event === "data") {
        callback({ toString: () => text });
      }
      if (event === "end") {
        callback();
      }
    }
  };
}

function createResponse() {
  return {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: "",
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    end(body: string) {
      this.body = body;
    }
  };
}
