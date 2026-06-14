import { describe, expect, it, vi } from "vitest";
import { createConfiguredImageProvider, createDashScopeImageProvider } from "./imageProvider";

describe("imageProvider", () => {
  it("uses DashScope image generation and returns the first image URL", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      async json() {
        return {
          request_id: "request-1",
          output: {
            choices: [
              {
                message: {
                  content: [{ image: "https://example.test/generated.png" }]
                }
              }
            ]
          },
          usage: {
            width: 1024,
            height: 1024,
            image_count: 1
          }
        };
      }
    });

    const provider = createDashScopeImageProvider({
      apiKey: "test-key",
      model: "qwen-image-2.0-pro",
      fetcher
    });
    const result = await provider.generateImage({ prompt: "生成一张苹果简笔画" });

    expect(fetcher).toHaveBeenCalledWith(
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json"
        }),
        body: expect.stringContaining("qwen-image-2.0-pro")
      })
    );
    expect(result).toMatchObject({
      ok: true,
      source: "image-model",
      imageUrl: "https://example.test/generated.png",
      requestId: "request-1"
    });
  });

  it("falls back to mock provider when image api key is not configured", async () => {
    const provider = createConfiguredImageProvider({});
    const result = await provider.generateImage({ prompt: "生成一张火箭图" });

    expect(result).toEqual({
      ok: false,
      message: "Mock /api/image is ready; real image provider is not configured"
    });
  });

  it("rejects non-ascii api keys before calling fetch", async () => {
    const fetcher = vi.fn();
    const provider = createConfiguredImageProvider({ IMAGE_API_KEY: "你的APIKey" }, fetcher);
    const result = await provider.generateImage({ prompt: "生成一张火箭图" });

    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      message: "IMAGE_API_KEY must be an ASCII API key. Replace placeholder text with the real provider key."
    });
  });
});
