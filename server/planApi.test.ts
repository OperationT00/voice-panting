import { describe, expect, it } from "vitest";
import { handlePlanRequest } from "./planApi";
import type { PlanProvider } from "./planProvider";

describe("handlePlanRequest", () => {
  it("rejects requests without text", async () => {
    const provider = createProvider();

    await expect(handlePlanRequest({}, provider)).resolves.toEqual({
      status: 400,
      body: {
        ok: false,
        message: "Request body must include text"
      }
    });
  });

  it("delegates valid requests to the configured provider", async () => {
    const provider = createProvider({
      ok: false,
      message: "provider result"
    });

    await expect(handlePlanRequest({ text: "draw it", responseFormat: { type: "json_schema" } }, provider)).resolves.toEqual({
      status: 200,
      body: {
        ok: false,
        message: "provider result"
      }
    });
  });
});

function createProvider(result = { ok: false as const, message: "unused" }): PlanProvider {
  return {
    name: "test",
    async generatePlan() {
      return result;
    }
  };
}
