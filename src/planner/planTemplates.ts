import type { DrawingPlan } from "../drawing/types";

export type PlanTemplate = {
  id: string;
  keywords: string[];
  description: string;
  plan: DrawingPlan;
};

export const planTemplates: PlanTemplate[] = [
  {
    id: "house-scene",
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
  }
];

export function findPlanTemplate(text: string): DrawingPlan | undefined {
  const normalizedText = normalizeText(text);
  const matchedTemplate = planTemplates.find((template) =>
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
