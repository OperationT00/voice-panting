import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

vi.mock("../speech/speechSynthesis", () => ({
  speak: vi.fn()
}));

describe("App", () => {
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
});
