import { createConfiguredImageProvider, type ImageProvider, type ImageProviderResult } from "./imageProvider";

export type ImageApiResponse = {
  status: number;
  body: ImageProviderResult;
};

export async function handleImageRequest(body: unknown, provider: ImageProvider = createConfiguredImageProvider()): Promise<ImageApiResponse> {
  if (!isRecord(body) || typeof body.prompt !== "string" || !body.prompt.trim()) {
    return {
      status: 400,
      body: {
        ok: false,
        message: "Request body must include prompt"
      }
    };
  }

  const result = await provider.generateImage({
    prompt: body.prompt
  });

  return {
    status: 200,
    body: result
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
