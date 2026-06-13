import { handleMockPlanRequest } from "./mockPlanApi";
import {
  hasValidPlanShape,
  isServerDrawingPlan,
  serverDrawingPlanResponseFormat,
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

type ProviderEnv = Record<string, string | undefined>;

type OpenAiCompatibleProviderOptions = {
  apiKey: string;
  baseUrl?: string;
  model: string;
  fetcher?: Fetcher;
};

export function createConfiguredPlanProvider(env: ProviderEnv = getProcessEnv(), fetcher: Fetcher = getGlobalFetch()): PlanProvider {
  const apiKey = env.LLM_API_KEY ?? env.OPENAI_API_KEY;

  if (!apiKey) {
    return createMockPlanProvider();
  }

  return createOpenAiCompatiblePlanProvider({
    apiKey,
    baseUrl: env.LLM_BASE_URL ?? env.OPENAI_BASE_URL,
    model: env.LLM_MODEL ?? env.OPENAI_MODEL ?? "gpt-4.1-mini",
    fetcher
  });
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
  const endpoint = `${normalizeBaseUrl(options.baseUrl ?? "https://api.openai.com/v1")}/chat/completions`;

  return {
    name: "openai-compatible",
    async generatePlan(request) {
      try {
        const response = await fetcher(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: options.model,
            response_format: request.responseFormat ?? serverDrawingPlanResponseFormat,
            messages: [
              {
                role: "system",
                content:
                  "You convert voice drawing requests into valid DrawingPlan JSON. Return only JSON that matches the provided schema."
              },
              {
                role: "user",
                content: request.text
              }
            ]
          })
        });
        const payload = await response.json();

        if (!response.ok) {
          return {
            ok: false,
            message: `LLM provider failed: ${response.status} ${getErrorMessage(payload)}`
          };
        }

        return parseProviderPayload(payload);
      } catch (error) {
        return {
          ok: false,
          message: `LLM provider request failed: ${error instanceof Error ? error.message : "unknown error"}`
        };
      }
    }
  };
}

function parseProviderPayload(payload: unknown): ServerPlannerResult {
  const content = getAssistantContent(payload);
  const parsed = typeof content === "string" ? parseJson(content) : content;

  if (!isServerDrawingPlan(parsed) || !hasValidPlanShape(parsed)) {
    return {
      ok: false,
      message: "LLM provider returned invalid drawing plan"
    };
  }

  return {
    ok: true,
    source: "llm",
    plan: parsed
  };
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
