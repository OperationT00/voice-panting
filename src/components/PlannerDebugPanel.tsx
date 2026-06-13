import { useState } from "react";
import { Send } from "lucide-react";
import { prepareActions } from "../drawing/actionPipeline";
import type { DrawingPlan } from "../drawing/types";
import { planFromText, type PlannerResult } from "../planner/llmPlanner";
import { callLlmPlannerProxy } from "../planner/llmProxyClient";

type PlannerDebugMode = "local" | "api";

type Props = {
  onApplyPlan?: (plan: DrawingPlan) => void;
};

export function PlannerDebugPanel({ onApplyPlan }: Props) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<PlannerDebugMode>("local");
  const [result, setResult] = useState<PlannerResult | undefined>();
  const [isRunning, setIsRunning] = useState(false);

  const runPlanner = async (inputText = text) => {
    const trimmedText = inputText.trim();
    if (!trimmedText) {
      return;
    }
    setText(trimmedText);
    setIsRunning(true);
    try {
      setResult(mode === "api" ? await callLlmPlannerProxy(trimmedText) : await planFromText(trimmedText));
    } finally {
      setIsRunning(false);
    }
  };

  const preparedActions = result?.ok ? prepareActions(result.plan) : undefined;

  return (
    <div className="panel-section planner-debug-panel">
      <h2>Planner 调试</h2>
      <div className="simulate-form">
        <div className="planner-mode-toggle" role="group" aria-label="Planner 模式">
          <button
            aria-pressed={mode === "local"}
            className={mode === "local" ? "active" : ""}
            onClick={() => setMode("local")}
            type="button"
          >
            本地 Planner
          </button>
          <button
            aria-pressed={mode === "api"}
            className={mode === "api" ? "active" : ""}
            onClick={() => setMode("api")}
            type="button"
          >
            /api/plan
          </button>
        </div>
        <label htmlFor="planner-debug-input">Planner 调试输入</label>
        <div className="simulate-row">
          <input
            id="planner-debug-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void runPlanner();
              }
            }}
            placeholder="输入：画一幅小房子"
          />
          <button disabled={isRunning} onClick={() => void runPlanner()} type="button" title="运行 Planner">
            <Send size={18} />
            <span>{isRunning ? "运行中" : "运行 Planner"}</span>
          </button>
        </div>
        <div className="planner-debug-samples">
          <button onClick={() => void runPlanner("画一幅小房子")} type="button">
            模板示例
          </button>
          <button onClick={() => void runPlanner("画一个复杂流程图")} type="button">
            Mock 示例
          </button>
        </div>
      </div>

      {result?.ok ? (
        <div className="planner-result">
          <strong>source: {result.source}</strong>
          <div className="plan-preview">
            <h3>计划预览</h3>
            <ol>
              {result.plan.steps.map((step) => (
                <li key={step.id}>{step.title}</li>
              ))}
            </ol>
            {onApplyPlan ? (
              <button className="primary" onClick={() => onApplyPlan(result.plan)} type="button">
                应用计划
              </button>
            ) : null}
          </div>
          <h3>Plan JSON</h3>
          <pre>{JSON.stringify(result.plan, null, 2)}</pre>
          <h3>Prepared Actions</h3>
          <pre>{JSON.stringify(preparedActions, null, 2)}</pre>
        </div>
      ) : null}

      {result && !result.ok ? <p className="planner-error">{result.message}</p> : null}
    </div>
  );
}
