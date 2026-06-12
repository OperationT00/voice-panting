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
});
