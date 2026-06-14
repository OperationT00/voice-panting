import { handleMockPlanRequest } from "./mockPlanApi";
import {
  getPlanValidationError,
  hasValidPlanShape,
  isServerDrawingPlan,
  serverDrawingPlanResponseFormat,
  type ServerDrawingPlan,
  type ServerPlannerResult
} from "./planContract";

type FetcherInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

type FetcherResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

type Fetcher = (input: string, init?: FetcherInit) => Promise<FetcherResponse>;

type PlanProviderRequest = {
  text: string;
  responseFormat?: unknown;
};

export type PlanProvider = {
  name: string;
  generatePlan: (request: PlanProviderRequest) => Promise<ServerPlannerResult>;
};

export type ProviderEnv = Record<string, string | undefined>;

type OpenAiCompatibleProviderOptions = {
  apiKey: string;
  baseUrl?: string;
  model: string;
  fetcher?: Fetcher;
};

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type ParsedProviderPayload =
  | {
      ok: true;
      plan: ServerDrawingPlan;
    }
  | {
      ok: false;
      message: string;
      rawContent?: string;
    };

type ProviderRequestResult =
  | {
      ok: true;
      source: "llm";
      plan: ServerDrawingPlan;
    }
  | {
      ok: false;
      message: string;
      rawContent?: string;
    };

const drawingPlannerSystemPrompt = [
  "You convert voice drawing requests into a valid DrawingPlan JSON object. Return only JSON that matches the provided schema.",
  "Canvas coordinate range: x: 0-1000, y: 0-560.",
  "Treat DrawingPlan as a small drawing DSL, not free-form SVG or prose.",
  "Supported action types: create, update, delete, move, resize, bringToFront, sendToBack, clear, export.",
  "Supported create shapes only: circle, rect, line, triangle, text, ellipse, diamond, star, path.",
  "Do not invent semantic shape names such as shape: \"rocket\", shape: \"apple\", shape: \"tree\", shape: \"car\", or shape: \"person\".",
  "For real-world objects, decompose the object into supported primitives. Use the step id/title to describe semantic parts.",
  "Keep object sketches compact: use 3-6 create steps for a single object unless the user explicitly asks for more detail.",
  "Prefer coordinate positions over preset positions so the preview can be laid out precisely.",
  "Break complex requests into ordered steps with concise human-readable titles.",
  "Each step id must be stable, lowercase, and descriptive.",
  "Use dependsOn as an ordered dependency list. dependsOn may only reference earlier step ids.",
  "For diagrams and flows, place items from top to bottom or left to right with clear spacing.",
  "If the user asks for a real-world object, approximate it with supported primitives: circle, rect, line, triangle, text, ellipse, diamond, star, and path.",
  "Root object: { type: \"plan\", title: string, steps: non-empty array }.",
  "Each step: { id: string, title: string, dependsOn: string[], action: DrawingAction }.",
  "For create actions use: { type: \"create\", shape: circle | rect | line | triangle | text | ellipse | diamond | star | path, count: 1-8, props: { color: \"#RRGGBB\", size: \"small\" | \"medium\" | \"large\", position: { x: number, y: number }, rotation: -180..180, strokeColor: \"#RRGGBB\", strokeWidth: 0..24, pathData: string } }.",
  "For path shapes, pathData may only use M, L, Q, C, and Z commands with canvas coordinates. Use path for curves, smiles, brows, stems, flame contours, and sketch outlines.",
  "Use rotation for leaves, fins, roofs, limbs, and other angled parts. Use strokeColor and strokeWidth for visible sketch outlines.",
  "For objects such as apples, trees, cars, or houses, create multiple simple primitives rather than inventing unsupported shape names.",
  "If the Chinese request says 画一个机器人, draw a robot. Never replace an unknown object with a question mark unless the user explicitly asks for a question mark.",
  "中文示例：画一个机器人 -> create rect robot-head, rect robot-body, circle robot-eye-left, circle robot-eye-right, line robot-antenna, path robot-mouth. Use title 画一个机器人.",
  "Example user request: Draw a rocket.",
  "Example valid plan: {\"type\":\"plan\",\"title\":\"Draw a rocket\",\"steps\":[{\"id\":\"rocket-body\",\"title\":\"Draw rocket body\",\"dependsOn\":[],\"action\":{\"type\":\"create\",\"shape\":\"ellipse\",\"count\":1,\"props\":{\"color\":\"#e2e8f0\",\"size\":\"large\",\"position\":{\"x\":500,\"y\":295},\"rotation\":-90,\"strokeColor\":\"#475569\",\"strokeWidth\":4}}},{\"id\":\"rocket-nose\",\"title\":\"Draw rocket nose\",\"dependsOn\":[\"rocket-body\"],\"action\":{\"type\":\"create\",\"shape\":\"triangle\",\"count\":1,\"props\":{\"color\":\"#ef4444\",\"size\":\"medium\",\"position\":{\"x\":500,\"y\":185},\"strokeColor\":\"#991b1b\",\"strokeWidth\":3}}},{\"id\":\"rocket-window\",\"title\":\"Draw window\",\"dependsOn\":[\"rocket-body\"],\"action\":{\"type\":\"create\",\"shape\":\"circle\",\"count\":1,\"props\":{\"color\":\"#38bdf8\",\"size\":\"small\",\"position\":{\"x\":500,\"y\":270},\"strokeColor\":\"#075985\",\"strokeWidth\":3}}},{\"id\":\"rocket-flame\",\"title\":\"Draw flame\",\"dependsOn\":[\"rocket-body\"],\"action\":{\"type\":\"create\",\"shape\":\"path\",\"count\":1,\"props\":{\"color\":\"#facc15\",\"size\":\"medium\",\"position\":{\"x\":500,\"y\":410},\"pathData\":\"M 455 380 Q 500 455 545 380\",\"strokeColor\":\"#ea580c\",\"strokeWidth\":8}}}]}",
  "中文示例：画一棵树 -> use rect tree-trunk, circle or ellipse tree-crown groups, path tree-ground-shadow if needed.",
  "中文示例：画一辆汽车 -> use rect car-body, rect car-top, circle car-wheel-left/right, circle car-window-left/right or rect windows.",
  "For a new object, imitate the example pattern: body primitives first, detail primitives next, path for organic curves or flames.",
  "Use simple SVG-friendly shapes, high-contrast colors, and no extra explanatory text outside the JSON."
].join("\n");

export function createConfiguredPlanProvider(env: ProviderEnv = getProcessEnv(), fetcher: Fetcher = getGlobalFetch()): PlanProvider {
  const apiKey = env.LLM_API_KEY ?? env.OPENAI_API_KEY;

  if (!apiKey) {
    return createMockPlanProvider();
  }

  if (!isAsciiHeaderValue(apiKey)) {
    return createInvalidConfigPlanProvider("LLM_API_KEY must be an ASCII API key. Replace placeholder text with the real provider key.");
  }

  return createOpenAiCompatiblePlanProvider({
    apiKey,
    baseUrl: env.LLM_BASE_URL ?? env.OPENAI_BASE_URL,
    model: env.LLM_MODEL ?? env.OPENAI_MODEL ?? "gpt-4.1-mini",
    fetcher
  });
}

function createInvalidConfigPlanProvider(message: string): PlanProvider {
  return {
    name: "invalid-config",
    async generatePlan() {
      return {
        ok: false,
        message
      };
    }
  };
}

export function createMockPlanProvider(): PlanProvider {
  return {
    name: "mock",
    async generatePlan(request) {
      const result = await handleMockPlanRequest({
        text: request.text,
        responseFormat: request.responseFormat ?? serverDrawingPlanResponseFormat
      });

      return result.body as ServerPlannerResult;
    }
  };
}

export function createOpenAiCompatiblePlanProvider(options: OpenAiCompatibleProviderOptions): PlanProvider {
  const fetcher = options.fetcher ?? getGlobalFetch();
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? "https://api.openai.com/v1");
  const endpoint = `${baseUrl}/chat/completions`;

  return {
    name: "openai-compatible",
    async generatePlan(request) {
      try {
        const firstResult = await requestPlan(fetcher, endpoint, options, baseUrl, request, createPlanningMessages(request.text));
        if (firstResult.ok === true) {
          return firstResult;
        }

        const repairResult = await requestPlan(
          fetcher,
          endpoint,
          options,
          baseUrl,
          request,
          createRepairMessages(request.text, firstResult.message, firstResult.rawContent)
        );

        return repairResult.ok === true ? repairResult : { ok: false, message: firstResult.message };
      } catch (error) {
        return {
          ok: false,
          message: `LLM provider request failed: ${error instanceof Error ? error.message : "unknown error"}`
        };
      }
    }
  };
}

async function requestPlan(
  fetcher: Fetcher,
  endpoint: string,
  options: OpenAiCompatibleProviderOptions,
  baseUrl: string,
  request: PlanProviderRequest,
  messages: ChatMessage[]
): Promise<ProviderRequestResult> {
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: options.model,
      response_format: getResponseFormat(baseUrl, request.responseFormat),
      max_tokens: 4096,
      ...getProviderRequestOptions(baseUrl),
      messages
    })
  });
  const payload = await response.json();

  if (!response.ok) {
    return {
      ok: false,
      message: `LLM provider failed: ${response.status} ${getErrorMessage(payload)}`
    };
  }

  const parsed = parseProviderPayload(payload);
  if (parsed.ok === false) {
    return parsed;
  }

  const intentError = getIntentAlignmentError(request.text, parsed.plan);
  if (intentError) {
    return {
      ok: false,
      message: `LLM provider returned invalid drawing plan: ${intentError}`,
      rawContent: JSON.stringify(parsed.plan)
    };
  }

  return {
    ok: true,
    source: "llm",
    plan: parsed.plan
  };
}

function parseProviderPayload(payload: unknown): ParsedProviderPayload {
  const content = getAssistantContent(payload);
  const parsed = typeof content === "string" ? parseJson(content) : content;

  if (!isServerDrawingPlan(parsed)) {
    return {
      ok: false,
      message: "LLM provider returned invalid drawing plan: response is not a DrawingPlan object",
      rawContent: typeof content === "string" ? content : undefined
    };
  }

  const validationError = getPlanValidationError(parsed);
  if (validationError || !hasValidPlanShape(parsed)) {
    return {
      ok: false,
      message: `LLM provider returned invalid drawing plan: ${validationError ?? "unknown validation error"}`,
      rawContent: typeof content === "string" ? content : JSON.stringify(parsed)
    };
  }

  return {
    ok: true,
    plan: parsed
  };
}

function createPlanningMessages(text: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: drawingPlannerSystemPrompt
    },
    {
      role: "user",
      content: [
        `User drawing request: ${text}`,
        "Understand the request literally, including Chinese object names.",
        "Generate a DrawingPlan for the requested object or scene.",
        "Do not draw a question mark as a fallback unless the user explicitly asks for a question mark."
      ].join("\n")
    }
  ];
}

function getIntentAlignmentError(text: string, plan: ServerDrawingPlan): string | undefined {
  const expectedKeywords = getExpectedIntentKeywords(text);
  if (expectedKeywords.length === 0) {
    return undefined;
  }

  const planText = [
    plan.title,
    ...plan.steps.flatMap((step) => [step.id, step.title, JSON.stringify(step.action)])
  ]
    .join("\n")
    .toLowerCase();
  const matched = expectedKeywords.some((keyword) => planText.includes(keyword.toLowerCase()));

  return matched ? undefined : `plan does not match the requested object "${expectedKeywords[0]}"`;
}

function getExpectedIntentKeywords(text: string): string[] {
  const intentMap: Array<[RegExp, string[]]> = [
    [/机器人|robot/i, ["机器人", "robot"]],
    [/汽车|小车|车子|car/i, ["汽车", "car"]],
    [/树|树木|tree/i, ["树", "tree"]],
    [/猫|cat/i, ["猫", "cat"]],
    [/狗|dog/i, ["狗", "dog"]],
    [/飞机|airplane|plane/i, ["飞机", "airplane", "plane"]],
    [/火箭|rocket/i, ["火箭", "rocket"]]
  ];

  return intentMap.find(([pattern]) => pattern.test(text))?.[1] ?? [];
}

function createRepairMessages(text: string, errorMessage: string, rawContent: string | undefined): ChatMessage[] {
  return [
    {
      role: "system",
      content: drawingPlannerSystemPrompt
    },
    {
      role: "user",
      content: [
        "Fix the invalid DrawingPlan JSON.",
        "Preserve the user's drawing intent while making the JSON pass validation.",
        `Original request: ${text}`,
        `Validation error: ${errorMessage}`,
        `Invalid response: ${rawContent ?? "No parseable JSON content"}`,
        "Return only a corrected DrawingPlan JSON object.",
        "Do not use unsupported shape or action names. Approximate real objects with supported primitives.",
        "When validation mentions an unsupported shape, replace invalid semantic shapes with supported primitives and keep semantic meaning in id/title."
      ].join("\n")
    }
  ];
}

function getResponseFormat(baseUrl: string, responseFormat: unknown): unknown {
  if (baseUrl.toLowerCase().includes("deepseek")) {
    return { type: "json_object" };
  }

  return responseFormat ?? serverDrawingPlanResponseFormat;
}

function getProviderRequestOptions(baseUrl: string): Record<string, unknown> {
  const normalized = baseUrl.toLowerCase();
  if (normalized.includes("dashscope") || normalized.includes("aliyuncs")) {
    return { enable_thinking: false };
  }
  return {};
}

function getAssistantContent(payload: unknown): unknown {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    return undefined;
  }

  const firstChoice = payload.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    return undefined;
  }

  return firstChoice.message.content;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function getErrorMessage(payload: unknown): string {
  if (isRecord(payload) && typeof payload.error === "object" && isRecord(payload.error) && typeof payload.error.message === "string") {
    return payload.error.message;
  }

  if (isRecord(payload) && typeof payload.message === "string") {
    return payload.message;
  }

  return "unknown error";
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function isAsciiHeaderValue(value: string): boolean {
  return /^[\x00-\x7F]+$/.test(value);
}

function getProcessEnv(): ProviderEnv {
  const globalWithProcess = globalThis as typeof globalThis & { process?: { env?: ProviderEnv } };
  return globalWithProcess.process?.env ?? {};
}

function getGlobalFetch(): Fetcher {
  const globalWithFetch = globalThis as typeof globalThis & { fetch?: Fetcher };
  if (!globalWithFetch.fetch) {
    throw new Error("Global fetch is not available");
  }
  return globalWithFetch.fetch;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
