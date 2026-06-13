type MockDrawingPlan = {
  type: "plan";
  title: string;
  steps: Array<Record<string, unknown>>;
};

export type MockPlanResponse = {
  status: number;
  body:
    | {
        ok: true;
        source: "llm";
        plan: MockDrawingPlan;
      }
    | {
        ok: false;
        message: string;
      };
};

export async function handleMockPlanRequest(body: unknown): Promise<MockPlanResponse> {
  if (!isRecord(body) || typeof body.text !== "string" || !body.text.trim()) {
    return {
      status: 400,
      body: {
        ok: false,
        message: "Request body must include text"
      }
    };
  }

  if (/流程图|流程|flow/i.test(body.text)) {
    return {
      status: 200,
      body: {
        ok: true,
        source: "llm",
        plan: createFlowchartPlan()
      }
    };
  }

  return {
    status: 200,
    body: {
      ok: false,
      message: "Mock /api/plan is ready; real provider is not configured"
    }
  };
}

function createFlowchartPlan(): MockDrawingPlan {
  return {
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
      },
      {
        id: "flow-arrow",
        title: "画连接线",
        dependsOn: ["flow-start"],
        action: {
          type: "create",
          shape: "line",
          count: 1,
          props: { color: "#111827", size: "medium", position: { x: 500, y: 280 } }
        }
      },
      {
        id: "flow-end",
        title: "画结束节点",
        dependsOn: ["flow-start", "flow-arrow"],
        action: {
          type: "create",
          shape: "rect",
          count: 1,
          props: { color: "#16a34a", size: "medium", position: { x: 500, y: 400 } }
        }
      }
    ]
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
