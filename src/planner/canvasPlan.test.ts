import { describe, expect, it } from "vitest";
import { createPlanFromShapes } from "./canvasPlan";
import type { DrawableShape } from "../drawing/types";

describe("createPlanFromShapes", () => {
  it("serializes the current canvas into a reusable drawing plan", () => {
    const shapes: DrawableShape[] = [
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
      },
      {
        id: "shape-2",
        kind: "path",
        x: 500,
        y: 280,
        width: 88,
        height: 88,
        color: "#0f172a",
        strokeWidth: 5,
        pathData: "M 430 310 Q 500 250 570 310"
      }
    ];

    expect(createPlanFromShapes(shapes, "保存的模板")).toEqual({
      type: "plan",
      title: "保存的模板",
      steps: [
        {
          id: "shape-1",
          title: "保存 ellipse",
          dependsOn: [],
          action: {
            type: "create",
            shape: "ellipse",
            count: 1,
            props: {
              color: "#16a34a",
              size: "medium",
              position: { x: 520, y: 220 },
              rotation: -28,
              strokeColor: "#14532d",
              strokeWidth: 4
            }
          }
        },
        {
          id: "shape-2",
          title: "保存 path",
          dependsOn: ["shape-1"],
          action: {
            type: "create",
            shape: "path",
            count: 1,
            props: {
              color: "#0f172a",
              size: "medium",
              position: { x: 500, y: 280 },
              strokeWidth: 5,
              pathData: "M 430 310 Q 500 250 570 310"
            }
          }
        }
      ]
    });
  });
});
