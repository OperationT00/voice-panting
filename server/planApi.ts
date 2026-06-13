import { serverDrawingPlanResponseFormat, type ServerPlannerResult } from "./planContract";
import { createConfiguredPlanProvider, type PlanProvider } from "./planProvider";

export type PlanApiResponse = {
  status: number;
  body: ServerPlannerResult;
};

export async function handlePlanRequest(body: unknown, provider: PlanProvider = createConfiguredPlanProvider()): Promise<PlanApiResponse> {
  if (!isRecord(body) || typeof body.text !== "string" || !body.text.trim()) {
    return {
      status: 400,
      body: {
        ok: false,
        message: "Request body must include text"
      }
    };
  }

  const result = await provider.generatePlan({
    text: body.text,
    responseFormat: body.responseFormat ?? serverDrawingPlanResponseFormat
  });

  return {
    status: 200,
    body: result
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
