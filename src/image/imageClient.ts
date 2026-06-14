export type ImageGenerationResult =
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

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type Options = {
  endpoint?: string;
  fetcher?: Fetcher;
};

export async function callImageGenerationProxy(prompt: string, options: Options = {}): Promise<ImageGenerationResult> {
  const endpoint = options.endpoint ?? "/api/image";
  const fetcher = options.fetcher ?? fetch;

  try {
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ prompt })
    });
    const payload = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        message: `Image generation proxy failed: ${response.status} ${getErrorMessage(payload)}`
      };
    }

    return isImageGenerationResult(payload) ? payload : { ok: false, message: "Image generation proxy returned invalid result" };
  } catch (error) {
    return {
      ok: false,
      message: `Image generation proxy request failed: ${error instanceof Error ? error.message : "unknown error"}`
    };
  }
}

function getErrorMessage(payload: unknown): string {
  if (isRecord(payload) && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }
  return "unknown error";
}

function isImageGenerationResult(payload: unknown): payload is ImageGenerationResult {
  if (!isRecord(payload) || typeof payload.ok !== "boolean") {
    return false;
  }

  if (!payload.ok) {
    return typeof payload.message === "string";
  }

  return payload.source === "image-model" && typeof payload.prompt === "string" && typeof payload.imageUrl === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
