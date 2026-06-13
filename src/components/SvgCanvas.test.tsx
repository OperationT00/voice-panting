import { render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { SvgCanvas } from "./SvgCanvas";

describe("SvgCanvas", () => {
  it("renders optional rotation and stroke styles for sketch shapes", () => {
    render(
      <SvgCanvas
        selectedIds={[]}
        shapes={[
          {
            id: "shape-1",
            kind: "ellipse",
            x: 520,
            y: 220,
            width: 90,
            height: 56,
            color: "#16a34a",
            rotation: -28,
            strokeColor: "#14532d",
            strokeWidth: 4
          }
        ]}
      />
    );

    const group = document.querySelector('g[transform="rotate(-28 520 220)"]');
    const ellipse = document.querySelector('svg ellipse[fill="#16a34a"]');

    expect(group).toBeInTheDocument();
    expect(ellipse).toHaveAttribute("stroke", "#14532d");
    expect(ellipse).toHaveAttribute("stroke-width", "4");
  });
});
