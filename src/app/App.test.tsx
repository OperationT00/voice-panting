import { render, screen } from "@testing-library/react";
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

  it("shows planner debug result for a template command", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Planner 调试输入"), "画一幅小房子");
    await user.click(screen.getByRole("button", { name: "运行 Planner" }));

    expect(screen.getByText("source: template")).toBeInTheDocument();
    expect(screen.getByText(/"type": "plan"/)).toBeInTheDocument();
    expect(screen.getByText(/"id": "house-body"/)).toBeInTheDocument();
    expect(screen.getByText(/Prepared Actions/)).toBeInTheDocument();
  });

  it("shows planner debug error for an unmatched command", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Planner 调试输入"), "画一个复杂流程图");
    await user.click(screen.getByRole("button", { name: "运行 Planner" }));

    expect(screen.getByText("暂未接入真实 LLM planner")).toBeInTheDocument();
  });

  it("runs planner debug through the api plan proxy mode", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        source: "llm",
        plan: {
          type: "plan",
          title: "画一个流程图",
          steps: [
            {
              id: "flow-start",
              title: "画开始节点",
              dependsOn: [],
              action: {
                type: "create",
                shape: "rect",
                count: 1,
                props: { color: "#2563eb", size: "medium", position: { x: 500, y: 160 } }
              }
            }
          ]
        }
      })
    });
    vi.stubGlobal("fetch", fetcher);
    render(<App />);

    await user.click(screen.getByRole("button", { name: "/api/plan" }));
    await user.type(screen.getByLabelText("Planner 调试输入"), "画一个复杂流程图");
    await user.click(screen.getByRole("button", { name: "运行 Planner" }));

    expect(fetcher).toHaveBeenCalledWith(
      "/api/plan",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("画一个复杂流程图")
      })
    );
    expect(screen.getByText("source: llm")).toBeInTheDocument();
    expect(screen.getByText(/"id": "flow-start"/)).toBeInTheDocument();
    expect(screen.getByText(/Prepared Actions/)).toBeInTheDocument();
  });

  it("previews an api plan before applying it to the canvas", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        source: "llm",
        plan: {
          type: "plan",
          title: "画一个流程图",
          steps: [
            {
              id: "flow-start",
              title: "画开始节点",
              dependsOn: [],
              action: {
                type: "create",
                shape: "rect",
                count: 1,
                props: { color: "#2563eb", size: "medium", position: { x: 500, y: 160 } }
              }
            }
          ]
        }
      })
    });
    vi.stubGlobal("fetch", fetcher);
    render(<App />);

    await user.click(screen.getByRole("button", { name: "/api/plan" }));
    await user.type(screen.getByLabelText("Planner 调试输入"), "画一个复杂流程图");
    await user.click(screen.getByRole("button", { name: "运行 Planner" }));

    expect(screen.getByText("画开始节点")).toBeInTheDocument();
    expect(document.querySelector('svg rect[fill="#2563eb"]')).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "应用计划" }));

    expect(document.querySelector('svg rect[fill="#2563eb"]')).toBeInTheDocument();
    expect(screen.getByLabelText("最近一次 Action JSON")).toHaveTextContent('"id": "flow-start"');
  });
});
