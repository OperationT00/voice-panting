import type { DrawingPlan } from "../drawing/types";
import { loadUserPlanTemplates } from "./userPlanTemplates";

export type PlanTemplate = {
  id: string;
  category: "scene" | "object";
  source: "manual" | "vision" | "user";
  keywords: string[];
  description: string;
  plan: DrawingPlan;
};

export const planTemplates: PlanTemplate[] = [
  {
    id: "house-scene",
    category: "scene",
    source: "manual",
    keywords: ["小房子", "房子", "小屋"],
    description: "一个由房身、屋顶和太阳组成的基础场景",
    plan: {
      type: "plan",
      title: "画一幅小房子",
      steps: [
        {
          id: "house-body",
          title: "画房身",
          action: {
            type: "create",
            shape: "rect",
            count: 1,
            props: { color: "#f97316", size: "large", position: { x: 500, y: 340 } }
          }
        },
        {
          id: "house-roof",
          title: "画屋顶",
          dependsOn: ["house-body"],
          action: {
            type: "create",
            shape: "triangle",
            count: 1,
            props: { color: "#ef4444", size: "large", position: { x: 500, y: 230 } }
          }
        },
        {
          id: "sun",
          title: "画太阳",
          action: {
            type: "create",
            shape: "circle",
            count: 1,
            props: { color: "#eab308", size: "medium", position: { x: 830, y: 110 } }
          }
        }
      ]
    }
  },
  {
    id: "apple-sketch",
    category: "object",
    source: "manual",
    keywords: ["苹果", "apple"],
    description: "由主体、阴影、果柄、叶子和高光组成的苹果简笔画",
    plan: {
      type: "plan",
      title: "画一个苹果",
      steps: [
        {
          id: "apple-body",
          title: "画苹果主体",
          dependsOn: [],
          action: {
            type: "create",
            shape: "ellipse",
            count: 1,
            props: { color: "#dc2626", size: "large", position: { x: 500, y: 315 }, rotation: 0, strokeColor: "#7f1d1d", strokeWidth: 3 }
          }
        },
        {
          id: "apple-notch",
          title: "画顶部凹陷",
          dependsOn: ["apple-body"],
          action: {
            type: "create",
            shape: "path",
            count: 1,
            props: {
              color: "#7f1d1d",
              size: "small",
              position: { x: 500, y: 245 },
              pathData: "M 465 235 Q 500 255 535 235",
              strokeWidth: 4
            }
          }
        },
        {
          id: "apple-shadow",
          title: "画侧面阴影",
          dependsOn: ["apple-body"],
          action: {
            type: "create",
            shape: "circle",
            count: 1,
            props: { color: "#991b1b", size: "small", position: { x: 540, y: 330 } }
          }
        },
        {
          id: "apple-stem",
          title: "画果柄",
          dependsOn: ["apple-body"],
          action: {
            type: "create",
            shape: "rect",
            count: 1,
            props: { color: "#92400e", size: "small", position: { x: 500, y: 215 } }
          }
        },
        {
          id: "apple-leaf",
          title: "画叶子",
          dependsOn: ["apple-stem"],
          action: {
            type: "create",
            shape: "ellipse",
            count: 1,
            props: { color: "#16a34a", size: "small", position: { x: 550, y: 215 }, rotation: -28, strokeColor: "#14532d", strokeWidth: 3 }
          }
        },
        {
          id: "apple-highlight",
          title: "画高光",
          dependsOn: ["apple-body"],
          action: {
            type: "create",
            shape: "circle",
            count: 1,
            props: { color: "#ffffff", size: "small", position: { x: 455, y: 280 } }
          }
        }
      ]
    }
  },
  {
    id: "rocket-sketch",
    category: "object",
    source: "manual",
    keywords: ["火箭", "rocket", "飞船"],
    description: "由箭身、尖头、窗户、尾翼和火焰组成的火箭简笔画",
    plan: {
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
            props: { color: "#e2e8f0", size: "large", position: { x: 500, y: 295 }, rotation: -90, strokeColor: "#475569", strokeWidth: 4 }
          }
        },
        {
          id: "rocket-nose",
          title: "画火箭尖头",
          dependsOn: ["rocket-body"],
          action: {
            type: "create",
            shape: "triangle",
            count: 1,
            props: { color: "#ef4444", size: "medium", position: { x: 500, y: 185 }, rotation: 0, strokeColor: "#991b1b", strokeWidth: 3 }
          }
        },
        {
          id: "rocket-window",
          title: "画圆形窗户",
          dependsOn: ["rocket-body"],
          action: {
            type: "create",
            shape: "circle",
            count: 1,
            props: { color: "#38bdf8", size: "small", position: { x: 500, y: 270 }, strokeColor: "#075985", strokeWidth: 3 }
          }
        },
        {
          id: "rocket-left-fin",
          title: "画左侧尾翼",
          dependsOn: ["rocket-body"],
          action: {
            type: "create",
            shape: "triangle",
            count: 1,
            props: { color: "#f97316", size: "small", position: { x: 430, y: 365 }, rotation: -35, strokeColor: "#9a3412", strokeWidth: 3 }
          }
        },
        {
          id: "rocket-right-fin",
          title: "画右侧尾翼",
          dependsOn: ["rocket-body"],
          action: {
            type: "create",
            shape: "triangle",
            count: 1,
            props: { color: "#f97316", size: "small", position: { x: 570, y: 365 }, rotation: 35, strokeColor: "#9a3412", strokeWidth: 3 }
          }
        },
        {
          id: "rocket-flame",
          title: "画喷射火焰",
          dependsOn: ["rocket-body", "rocket-left-fin", "rocket-right-fin"],
          action: {
            type: "create",
            shape: "path",
            count: 1,
            props: {
              color: "#facc15",
              size: "medium",
              position: { x: 500, y: 410 },
              pathData: "M 455 380 Q 500 455 545 380",
              strokeColor: "#ea580c",
              strokeWidth: 8
            }
          }
        }
      ]
    }
  }
];

export function findPlanTemplate(text: string, extraTemplates: PlanTemplate[] = loadUserPlanTemplates()): DrawingPlan | undefined {
  const normalizedText = normalizeText(text);
  const matchedTemplate = [...planTemplates, ...extraTemplates].find((template) =>
    template.keywords.some((keyword) => normalizedText.includes(normalizeText(keyword)))
  );

  return matchedTemplate ? clonePlan(matchedTemplate.plan) : undefined;
}

function clonePlan(plan: DrawingPlan): DrawingPlan {
  return {
    ...plan,
    steps: plan.steps.map((step) => ({
      ...step,
      dependsOn: step.dependsOn ? [...step.dependsOn] : undefined,
      action: structuredClone(step.action)
    }))
  };
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, "").replace(/，|。|、|！|!/g, "");
}
