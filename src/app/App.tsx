import { useReducer, useRef, useState } from "react";
import { Download, Mic, MicOff, RotateCcw, RotateCw, Send, Trash2 } from "lucide-react";
import { drawingReducer, createInitialDrawingState } from "../drawing/reducer";
import { parseCommand } from "../parser/parseCommand";
import { useSpeechRecognition } from "../speech/useSpeechRecognition";
import { speak } from "../speech/speechSynthesis";
import { SvgCanvas } from "../components/SvgCanvas";
import { ActionLog } from "../components/ActionLog";
import { ActionJsonPanel } from "../components/ActionJsonPanel";
import { PlannerDebugPanel } from "../components/PlannerDebugPanel";
import type { DrawingAction, DrawingInput } from "../drawing/types";
import { exportSvgElement } from "../drawing/exportSvg";
import { prepareActions } from "../drawing/actionPipeline";

export function App() {
  const [state, dispatch] = useReducer(drawingReducer, undefined, createInitialDrawingState);
  const [transcript, setTranscript] = useState("");
  const [simulatedText, setSimulatedText] = useState("");
  const [lastInput, setLastInput] = useState<DrawingInput>([]);
  const [logs, setLogs] = useState<string[]>(["系统已就绪"]);
  const svgRef = useRef<SVGSVGElement>(null);

  const runActions = (source: string) => {
    const parsedInput = parseCommand(source);
    const actions = prepareActions(parsedInput);
    setLastInput(parsedInput);
    setTranscript(source);
    setLogs((current) => [`你说：${source}`, ...current].slice(0, 8));

    actions.forEach((action) => {
      dispatch(action);
      if (action.type === "export") {
        window.setTimeout(() => exportSvgElement(svgRef.current), 0);
      }
    });

    speak(getFeedback(actions));
  };

  const speech = useSpeechRecognition({
    onResult: runActions,
    onError: (message) => setLogs((current) => [message, ...current].slice(0, 8))
  });

  const manualAction = (action: DrawingAction, label: string) => {
    dispatch(action);
    setLastInput([action]);
    setLogs((current) => [`快捷操作：${label}`, ...current].slice(0, 8));
  };

  const submitSimulatedText = () => {
    const text = simulatedText.trim();
    if (!text) {
      return;
    }
    runActions(text);
    setSimulatedText("");
  };

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">AI Voice Drawing MVP</p>
            <h1>纯语音 SVG 绘图工具</h1>
          </div>
          <div className="toolbar" aria-label="画布工具">
            <button
              className={speech.isListening ? "primary danger" : "primary"}
              onClick={speech.isListening ? speech.stop : speech.start}
              type="button"
            >
              {speech.isListening ? <MicOff size={18} /> : <Mic size={18} />}
              {speech.isListening ? "停止监听" : "开始监听"}
            </button>
            <button onClick={() => manualAction({ type: "undo" }, "撤销")} type="button" title="撤销">
              <RotateCcw size={18} />
            </button>
            <button onClick={() => manualAction({ type: "redo" }, "重做")} type="button" title="重做">
              <RotateCw size={18} />
            </button>
            <button onClick={() => manualAction({ type: "clear" }, "清空")} type="button" title="清空">
              <Trash2 size={18} />
            </button>
            <button onClick={() => exportSvgElement(svgRef.current)} type="button" title="导出 SVG">
              <Download size={18} />
            </button>
          </div>
        </header>

        <SvgCanvas ref={svgRef} shapes={state.shapes} selectedIds={state.selectedIds} />
      </section>

      <aside className="side-panel">
        <div className="status">
          <span className={speech.isListening ? "dot active" : "dot"} />
          <div>
            <strong>{speech.isSupported ? (speech.isListening ? "正在听" : "待命") : "浏览器不支持"}</strong>
            <p>{state.message}</p>
          </div>
        </div>

        <div className="panel-section">
          <h2>识别文本</h2>
          <p className="transcript">{transcript || "点击开始监听后，说：画一个红色圆"}</p>
          <div className="simulate-form">
            <label htmlFor="simulated-voice">文字模拟语音</label>
            <div className="simulate-row">
              <input
                id="simulated-voice"
                value={simulatedText}
                onChange={(event) => setSimulatedText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    submitSimulatedText();
                  }
                }}
                placeholder="输入：画一个黄色三角形"
              />
              <button onClick={submitSimulatedText} type="button" title="发送模拟指令">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="panel-section">
          <h2>可试指令</h2>
          <div className="chips">
            {[
              "画一个红色圆",
              "在左上角画一个蓝色矩形",
              "画三个红色圆，从左到右排列",
              "把第二个圆改成蓝色",
              "把第二个圆向右移动一点",
              "把第二个圆放大",
              "把第二个圆置顶",
              "把第二个圆置底",
              "画一幅小房子",
              "删除第二个圆",
              "把所有红色图形改成绿色",
              "撤销",
              "导出 SVG"
            ].map((item) => (
              <button key={item} onClick={() => runActions(item)} type="button">
                {item}
              </button>
            ))}
          </div>
        </div>

        <PlannerDebugPanel />
        <ActionLog logs={logs} />
        <ActionJsonPanel input={lastInput} />
      </aside>
    </main>
  );
}

function getFeedback(actions: DrawingAction[]): string {
  const action = actions[0];
  if (!action) {
    return "没有识别到指令";
  }
  if (action.type === "error") {
    return action.message;
  }
  if (action.type === "create") {
    return `已画 ${action.count} 个图形`;
  }
  if (action.type === "update") {
    return "已更新图形";
  }
  if (action.type === "undo") {
    return "已撤销";
  }
  if (action.type === "redo") {
    return "已重做";
  }
  if (action.type === "clear") {
    return "画布已清空";
  }
  return "已导出";
}
