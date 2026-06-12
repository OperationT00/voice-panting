import { describe, expect, it } from "vitest";
import { prepareActions } from "./actionPipeline";

describe("prepareActions", () => {
  it("passes through valid actions", () => {
    const actions = [
      {
        type: "move",
        target: { ref: "last" },
        dx: 60,
        dy: 0
      }
    ];

    expect(prepareActions(actions)).toEqual(actions);
  });

  it("converts invalid actions into an error action", () => {
    expect(
      prepareActions([
        {
          type: "move",
          target: { ref: "last" },
          dx: 999,
          dy: 0
        }
      ])
    ).toEqual([
      {
        type: "error",
        message: "移动距离超出安全范围"
      }
    ]);
  });
});
