import { useState } from "react";
import { Send } from "lucide-react";
import { prepareActions } from "../drawing/actionPipeline";
import { planFromText, type PlannerResult } from "../planner/llmPlanner";

export function PlannerDebugPanel() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<PlannerResult | undefined>();

  const runPlanner = async (inputText = text) => {
    const trimmedText = inputText.trim();
    if (!trimmedText) {
      return;
    }
    setText(trimmedText);
    setResult(await planFromText(trimmedText));
  };

  const preparedActions = result?.ok ? prepareActions(result.plan) : undefined;

  return (
    <div className="panel-section planner-debug-panel">
      <h2>Planner 调试</h2>
      <div className="simulate-form">
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
          <button onClick={() => void runPlanner()} type="button" title="运行 Planner">
            <Send size={18} />
            <span>运行 Planner</span>
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
