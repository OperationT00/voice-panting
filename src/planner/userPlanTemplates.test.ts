import { describe, expect, it } from "vitest";
import { createUserPlanTemplate, loadUserPlanTemplates, saveUserPlanTemplate } from "./userPlanTemplates";
import type { DrawingPlan } from "../drawing/types";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const plan: DrawingPlan = {
  type: "plan",
  title: "画一个火箭",
  steps: [
    {
      id: "rocket-body",
      title: "画火箭主体",
      dependsOn: [],
      action: {
        type: "create",
        shape: "ellipse",
        count: 1,
        props: { color: "#94a3b8", size: "large", position: { x: 500, y: 260 } }
      }
    }
  ]
};

describe("userPlanTemplates", () => {
  it("saves and loads user templates from storage", () => {
    const storage = new MemoryStorage();
    const template = createUserPlanTemplate({
      keyword: "火箭",
      plan,
      now: 1710000000000
    });

    saveUserPlanTemplate(template, storage);

    expect(loadUserPlanTemplates(storage)).toEqual([
      {
        id: "user-template-1710000000000",
        category: "object",
        source: "user",
        keywords: ["火箭"],
        description: "用户保存的模板：火箭",
        plan
      }
    ]);
  });

  it("ignores malformed stored templates", () => {
    const storage = new MemoryStorage();
    storage.setItem("voice-painting:user-templates:v1", JSON.stringify([{ id: "bad" }]));

    expect(loadUserPlanTemplates(storage)).toEqual([]);
  });
});
