import { describe, expect, it } from "vitest";
import { drawingPlanJsonSchema, drawingPlanResponseFormat } from "./drawingPlanSchema";

describe("drawingPlanJsonSchema", () => {
  it("describes the DrawingPlan root object", () => {
    expect(drawingPlanJsonSchema).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["type", "title", "steps"],
      properties: {
        type: { const: "plan" },
        title: { type: "string" },
        steps: {
          type: "array",
          minItems: 1,
          maxItems: 20
        }
      }
    });
  });

  it("describes create and edit action variants for plan steps", () => {
    const stepActionSchema = drawingPlanJsonSchema.properties.steps.items.properties.action;
    const actionTypes = stepActionSchema.oneOf.map((variant) => variant.properties.type.const);

    expect(actionTypes).toEqual([
      "create",
      "update",
      "delete",
      "move",
      "resize",
      "bringToFront",
      "sendToBack",
      "clear",
      "export"
    ]);
  });

  it("keeps enums in sync with drawing action constraints", () => {
    const createAction = drawingPlanJsonSchema.properties.steps.items.properties.action.oneOf[0];

    expect(createAction.properties.shape.enum).toEqual(["circle", "rect", "line", "triangle", "text"]);
    expect(createAction.properties.props.properties.size.enum).toEqual(["small", "medium", "large"]);
    expect(createAction.properties.props.properties.position.anyOf[0].enum).toEqual([
      "top-left",
      "top",
      "top-right",
      "left",
      "center",
      "right",
      "bottom-left",
      "bottom",
      "bottom-right",
      "row"
    ]);
  });
});

describe("drawingPlanResponseFormat", () => {
  it("wraps the schema for structured LLM output", () => {
    expect(drawingPlanResponseFormat).toEqual({
      type: "json_schema",
      json_schema: {
        name: "drawing_plan",
        strict: true,
        schema: drawingPlanJsonSchema
      }
    });
  });

  it("marks every object schema property as required for strict structured output", () => {
    const missingRequiredPaths: string[] = [];

    collectMissingRequiredFields(drawingPlanJsonSchema, "$", missingRequiredPaths);

    expect(missingRequiredPaths).toEqual([]);
  });
});

function collectMissingRequiredFields(schema: unknown, path: string, missingRequiredPaths: string[]) {
  if (!schema || typeof schema !== "object") {
    return;
  }

  const record = schema as Record<string, unknown>;
  if (record.type === "object" && record.properties && typeof record.properties === "object") {
    const propertyKeys = Object.keys(record.properties as Record<string, unknown>).sort();
    const requiredKeys = Array.isArray(record.required) ? [...record.required].map(String).sort() : [];
    if (JSON.stringify(propertyKeys) !== JSON.stringify(requiredKeys)) {
      missingRequiredPaths.push(path);
    }
  }

  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => collectMissingRequiredFields(item, `${path}.${key}[${index}]`, missingRequiredPaths));
    } else if (value && typeof value === "object") {
      collectMissingRequiredFields(value, `${path}.${key}`, missingRequiredPaths);
    }
  }
}
