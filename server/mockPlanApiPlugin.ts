import type { Plugin } from "vite";
import { handlePlanRequest } from "./planApi";

export function mockPlanApiPlugin(): Plugin {
  return {
    name: "mock-plan-api",
    configureServer(server) {
      server.middlewares.use("/api/plan", async (request, response) => {
        if ((request as { method?: string }).method !== "POST") {
          sendJson(response, 405, { ok: false, message: "Method not allowed" });
          return;
        }

        try {
          const body = await readJsonBody(request);
          const result = await handlePlanRequest(body);
          sendJson(response, result.status, result.body);
        } catch {
          sendJson(response, 400, { ok: false, message: "Request body must be valid JSON" });
        }
      });
    }
  };
}

async function readJsonBody(request: unknown): Promise<unknown> {
  const stream = request as {
    on: (event: "data" | "end" | "error", callback: (chunk?: { toString: (encoding?: string) => string }) => void) => void;
  };

  const text = await new Promise<string>((resolve, reject) => {
    let body = "";
    stream.on("data", (chunk) => {
      body += chunk?.toString("utf8") ?? "";
    });
    stream.on("end", () => resolve(body));
    stream.on("error", () => reject(new Error("Unable to read request body")));
  });

  return text ? JSON.parse(text) : {};
}

function sendJson(response: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void }, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}
