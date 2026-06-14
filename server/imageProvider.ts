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

export type ImageProviderRequest = {
  prompt: string;
};

export type ImageProviderResult =
  | {
      ok: true;
      source: "image-model";
      prompt: string;
      imageUrl: string;
      requestId?: string;
      usage?: {
        width?: number;
        height?: number;
        imageCount?: number;
      };
    }
  | {
      ok: false;
      message: string;
    };

export type ImageProvider = {
  name: string;
  generateImage: (request: ImageProviderRequest) => Promise<ImageProviderResult>;
};

export type ImageProviderEnv = Record<string, string | undefined>;

type DashScopeImageProviderOptions = {
  apiKey: string;
  baseUrl?: string;
  model: string;
  size?: string;
  fetcher?: Fetcher;
};

const defaultNegativePrompt = "低分辨率，低画质，构图混乱，文字模糊，扭曲，过度光滑，画面具有AI感。";

export function createConfiguredImageProvider(env: ImageProviderEnv = getProcessEnv(), fetcher: Fetcher = getGlobalFetch()): ImageProvider {
  const apiKey = env.IMAGE_API_KEY ?? env.DASHSCOPE_API_KEY ?? env.LLM_API_KEY;

  if (!apiKey) {
    return createMockImageProvider();
  }

  if (!isAsciiHeaderValue(apiKey)) {
    return createInvalidImageProvider("IMAGE_API_KEY must be an ASCII API key. Replace placeholder text with the real provider key.");
  }

  return createDashScopeImageProvider({
    apiKey,
    baseUrl: env.IMAGE_BASE_URL,
    model: env.IMAGE_MODEL ?? "qwen-image-2.0-pro",
    size: env.IMAGE_SIZE ?? "1024*1024",
    fetcher
  });
}

export function createMockImageProvider(): ImageProvider {
  return {
    name: "mock-image",
    async generateImage() {
      return {
        ok: false,
        message: "Mock /api/image is ready; real image provider is not configured"
      };
    }
  };
}

export function createDashScopeImageProvider(options: DashScopeImageProviderOptions): ImageProvider {
  const fetcher = options.fetcher ?? getGlobalFetch();
  const endpoint = `${normalizeBaseUrl(options.baseUrl ?? "https://dashscope.aliyuncs.com/api/v1")}/services/aigc/multimodal-generation/generation`;

  return {
    name: "dashscope-image",
    async generateImage(request) {
      try {
        const response = await fetcher(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: options.model,
            input: {
              messages: [
                {
                  role: "user",
                  content: [{ text: buildImagePrompt(request.prompt) }]
                }
              ]
            },
            parameters: {
              negative_prompt: defaultNegativePrompt,
              prompt_extend: true,
              watermark: false,
              size: options.size,
              n: 1
            }
          })
        });
        const payload = await response.json();

        if (!response.ok) {
          return {
            ok: false,
            message: `Image provider failed: ${response.status} ${getErrorMessage(payload)}`
          };
        }

        return parseImagePayload(payload, request.prompt);
      } catch (error) {
        return {
          ok: false,
          message: `Image provider request failed: ${error instanceof Error ? error.message : "unknown error"}`
        };
      }
    }
  };
}

function buildImagePrompt(prompt: string): string {
  return `${prompt.trim()}。适合作为语音绘图工具的参考图，主体清晰，构图简洁，干净背景，简笔画或插画风格。`;
}

function parseImagePayload(payload: unknown, prompt: string): ImageProviderResult {
  const imageUrl = getNestedImageUrl(payload);
  if (!imageUrl) {
    return {
      ok: false,
      message: "Image provider returned no image URL"
    };
  }

  const usage = isRecord(payload) && isRecord(payload.usage) ? payload.usage : undefined;

  return {
    ok: true,
    source: "image-model",
    prompt,
    imageUrl,
    requestId: isRecord(payload) && typeof payload.request_id === "string" ? payload.request_id : undefined,
    usage: usage
      ? {
          width: typeof usage.width === "number" ? usage.width : undefined,
          height: typeof usage.height === "number" ? usage.height : undefined,
          imageCount: typeof usage.image_count === "number" ? usage.image_count : undefined
        }
      : undefined
  };
}

function getNestedImageUrl(payload: unknown): string | undefined {
  if (!isRecord(payload) || !isRecord(payload.output) || !Array.isArray(payload.output.choices)) {
    return undefined;
  }

  for (const choice of payload.output.choices) {
    if (!isRecord(choice) || !isRecord(choice.message) || !Array.isArray(choice.message.content)) {
      continue;
    }
    for (const item of choice.message.content) {
      if (isRecord(item) && typeof item.image === "string" && item.image.trim()) {
        return item.image;
      }
    }
  }

  return undefined;
}

function createInvalidImageProvider(message: string): ImageProvider {
  return {
    name: "invalid-image-config",
    async generateImage() {
      return { ok: false, message };
    }
  };
}

function getErrorMessage(payload: unknown): string {
  if (isRecord(payload) && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }
  if (isRecord(payload) && typeof payload.code === "string" && payload.code.trim()) {
    return payload.code;
  }
  return "unknown error";
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function isAsciiHeaderValue(value: string): boolean {
  return /^[\x20-\x7E]+$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getProcessEnv(): ImageProviderEnv {
  const processLike = globalThis as typeof globalThis & { process?: { env?: ImageProviderEnv } };
  return processLike.process?.env ?? {};
}

function getGlobalFetch(): Fetcher {
  const fetcher = globalThis.fetch;
  if (!fetcher) {
    throw new Error("global fetch is unavailable");
  }
  return fetcher as unknown as Fetcher;
}
