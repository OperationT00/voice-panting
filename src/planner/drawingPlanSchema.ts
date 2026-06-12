const shapeKindSchema = {
  type: "string",
  enum: ["circle", "rect", "line", "triangle", "text"]
} as const;

const shapeSizeSchema = {
  type: "string",
  enum: ["small", "medium", "large"]
} as const;

const presetPositionSchema = {
  type: "string",
  enum: ["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right", "row"]
} as const;

const coordinatePositionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["x", "y"],
  properties: {
    x: { type: "number", minimum: 0, maximum: 1000 },
    y: { type: "number", minimum: 0, maximum: 560 }
  }
} as const;

const shapePositionSchema = {
  anyOf: [presetPositionSchema, coordinatePositionSchema]
} as const;

const shapePropsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["color", "size", "position"],
  properties: {
    color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
    size: shapeSizeSchema,
    position: shapePositionSchema
  }
} as const;

const partialShapePropsSchema = {
  anyOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["color"],
      properties: {
        color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" }
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["size"],
      properties: {
        size: shapeSizeSchema
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["position"],
      properties: {
        position: shapePositionSchema
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["color", "size"],
      properties: {
        color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
        size: shapeSizeSchema
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["color", "position"],
      properties: {
        color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
        position: shapePositionSchema
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["size", "position"],
      properties: {
        size: shapeSizeSchema,
        position: shapePositionSchema
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["color", "size", "position"],
      properties: {
        color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
        size: shapeSizeSchema,
        position: shapePositionSchema
      }
    }
  ]
} as const;

const targetRefSchema = {
  anyOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["ref"],
      properties: {
        ref: { type: "string", enum: ["last", "all", "selected"] }
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind"],
      properties: {
        kind: shapeKindSchema
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "index"],
      properties: {
        kind: shapeKindSchema,
        index: { type: "integer", minimum: 1, maximum: 20 }
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["color"],
      properties: {
        color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" }
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["spatial"],
      properties: {
        spatial: { type: "string", enum: ["leftmost", "rightmost", "topmost", "bottommost"] }
      }
    }
  ]
} as const;

const createActionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type", "shape", "count", "props"],
  properties: {
    type: { const: "create" },
    shape: shapeKindSchema,
    count: { type: "integer", minimum: 1, maximum: 8 },
    props: shapePropsSchema
  }
} as const;

const updateActionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type", "target", "props"],
  properties: {
    type: { const: "update" },
    target: targetRefSchema,
    props: partialShapePropsSchema
  }
} as const;

const deleteActionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type", "target"],
  properties: {
    type: { const: "delete" },
    target: targetRefSchema
  }
} as const;

const moveActionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type", "target", "dx", "dy"],
  properties: {
    type: { const: "move" },
    target: targetRefSchema,
    dx: { type: "number", minimum: -300, maximum: 300 },
    dy: { type: "number", minimum: -300, maximum: 300 }
  }
} as const;

const resizeActionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type", "target", "scale"],
  properties: {
    type: { const: "resize" },
    target: targetRefSchema,
    scale: { type: "number", minimum: 0.25, maximum: 2 }
  }
} as const;

const layerActionSchema = (type: "bringToFront" | "sendToBack") =>
  ({
    type: "object",
    additionalProperties: false,
    required: ["type", "target"],
    properties: {
      type: { const: type },
      target: targetRefSchema
    }
  }) as const;

const statelessActionSchema = (type: "clear" | "export") =>
  ({
    type: "object",
    additionalProperties: false,
    required: ["type"],
    properties: {
      type: { const: type }
    }
  }) as const;

const drawingActionSchema = {
  oneOf: [
    createActionSchema,
    updateActionSchema,
    deleteActionSchema,
    moveActionSchema,
    resizeActionSchema,
    layerActionSchema("bringToFront"),
    layerActionSchema("sendToBack"),
    statelessActionSchema("clear"),
    statelessActionSchema("export")
  ]
} as const;

const drawingPlanStepSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "title", "dependsOn", "action"],
  properties: {
    id: { type: "string", minLength: 1 },
    title: { type: "string", minLength: 1 },
    dependsOn: {
      type: "array",
      items: { type: "string", minLength: 1 },
      uniqueItems: true
    },
    action: drawingActionSchema
  }
} as const;

export const drawingPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type", "title", "steps"],
  properties: {
    type: { const: "plan" },
    title: { type: "string", minLength: 1 },
    steps: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: drawingPlanStepSchema
    }
  }
} as const;

export const drawingPlanResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "drawing_plan",
    strict: true,
    schema: drawingPlanJsonSchema
  }
} as const;
