import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

vi.mock("../speech/speechSynthesis", () => ({
  speak: vi.fn()
}));

describe("App", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("uses typed text as a simulated voice command", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("文字模拟语音"), "画一个黄色三角形{Enter}");

    expect(screen.getByText("画一个黄色三角形")).toBeInTheDocument();
    expect(document.querySelectorAll("svg polygon")).toHaveLength(1);
  });

  it("shows prepared action JSON after a simulated voice command", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("文字模拟语音"), "画一个红色圆{Enter}");

    expect(screen.getByText("Action JSON")).toBeInTheDocument();
    expect(screen.getByText(/"type": "create"/)).toBeInTheDocument();
    expect(screen.getByText(/"shape": "circle"/)).toBeInTheDocument();
  });

  it("runs a planned scene command and shows the plan JSON", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("文字模拟语音"), "画一幅小房子{Enter}");

    expect(screen.getByText(/"type": "plan"/)).toBeInTheDocument();
    expect(screen.getByText(/"id": "house-body"/)).toBeInTheDocument();
    expect(document.querySelector('svg rect[fill="#f97316"]')).toBeInTheDocument();
    expect(document.querySelector('svg polygon[fill="#ef4444"]')).toBeInTheDocument();
    expect(document.querySelector('svg circle[fill="#eab308"]')).toBeInTheDocument();
  });

  it("keeps the right panel focused on input, logs, and action JSON", () => {
    render(<App />);

    expect(screen.getByLabelText("文字模拟语音")).toBeInTheDocument();
    expect(screen.getByText("动作日志")).toBeInTheDocument();
    expect(screen.getByText("Action JSON")).toBeInTheDocument();
    expect(screen.queryByText("可试指令")).not.toBeInTheDocument();
    expect(screen.queryByText("Planner 调试")).not.toBeInTheDocument();
  });

  it("falls back to the api planner for unsupported direct voice commands", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        source: "llm",
        plan: {
          type: "plan",
          title: "Draw a robot",
          steps: [
            {
              id: "robot-body",
              title: "Draw robot body",
              dependsOn: [],
              action: {
                type: "create",
                shape: "rect",
                count: 1,
                props: { color: "#94a3b8", size: "large", position: { x: 500, y: 260 } }
              }
            }
          ]
        }
      })
    });
    vi.stubGlobal("fetch", fetcher);
    render(<App />);

    await user.type(screen.getByLabelText("文字模拟语音"), "draw a robot{Enter}");

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledWith(
        "/api/plan",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("draw a robot")
        })
      );
    });
    await waitFor(() => expect(document.querySelector('svg rect[fill="#94a3b8"]')).toBeInTheDocument());
    expect(screen.getByLabelText("最近一次 Action JSON")).toHaveTextContent('"id": "robot-body"');
  });

  it("shows a loading state while the api planner is thinking", async () => {
    const user = userEvent.setup();
    let resolvePlan: (value: Response) => void = () => {};
    const fetcher = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolvePlan = resolve;
        })
    );
    vi.stubGlobal("fetch", fetcher);
    render(<App />);

    await user.type(screen.getByLabelText("文字模拟语音"), "draw a robot{Enter}");

    expect(screen.getByText("模型思考中")).toBeInTheDocument();
    expect(screen.getByLabelText("文字模拟语音")).toBeDisabled();
    expect(screen.getByLabelText("模型思考中")).toBeInTheDocument();

    resolvePlan({
      ok: true,
      json: async () => ({
        ok: true,
        source: "llm",
        plan: {
          type: "plan",
          title: "Draw a robot",
          steps: [
            {
              id: "robot-body",
              title: "Draw robot body",
              dependsOn: [],
              action: {
                type: "create",
                shape: "rect",
                count: 1,
                props: { color: "#94a3b8", size: "large", position: { x: 500, y: 260 } }
              }
            }
          ]
        }
      })
    } as Response);

    await waitFor(() => expect(screen.queryByText("模型思考中")).not.toBeInTheDocument());
    await waitFor(() => expect(document.querySelector('svg rect[fill="#94a3b8"]')).toBeInTheDocument());
  });

  it("uses typed or transcribed text to generate an image in image mode", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        source: "image-model",
        prompt: "生成一张苹果简笔画",
        imageUrl: "https://example.test/apple.png"
      })
    });
    vi.stubGlobal("fetch", fetcher);
    render(<App />);

    await user.click(screen.getByRole("button", { name: "AI 生图" }));
    await user.type(screen.getByLabelText("文字模拟语音"), "生成一张苹果简笔画{Enter}");

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledWith(
        "/api/image",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("生成一张苹果简笔画")
        })
      );
    });
    await waitFor(() => expect(screen.getByAltText("生成一张苹果简笔画")).toHaveAttribute("src", "https://example.test/apple.png"));
    expect(screen.getByLabelText("最近一次生图 Result JSON")).toHaveTextContent('"imageUrl": "https://example.test/apple.png"');
  });

  it("saves by voice and reuses the local template for later commands", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    render(<App />);

    await user.type(screen.getByLabelText("文字模拟语音"), "画一个红色圆{Enter}");
    await user.type(screen.getByLabelText("文字模拟语音"), "保存此模板{Enter}");
    await user.click(screen.getByRole("button", { name: "清空" }));
    await user.type(screen.getByLabelText("文字模拟语音"), "画一个红色圆{Enter}");

    expect(fetcher).not.toHaveBeenCalled();
    expect(document.querySelectorAll('svg circle[fill="#ef4444"]')).toHaveLength(1);
    expect(screen.getByText("已保存模板：画一个红色圆")).toBeInTheDocument();
  });
});
