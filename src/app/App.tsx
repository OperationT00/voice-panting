import { useReducer, useRef, useState } from "react";
import { Download, ImageIcon, Mic, MicOff, RotateCcw, RotateCw, Send, Trash2 } from "lucide-react";
import { drawingReducer, createInitialDrawingState } from "../drawing/reducer";
import { parseCommand } from "../parser/parseCommand";
import { useSpeechRecognition } from "../speech/useSpeechRecognition";
import { speak } from "../speech/speechSynthesis";
import { SvgCanvas } from "../components/SvgCanvas";
import { ActionLog } from "../components/ActionLog";
import { ActionJsonPanel } from "../components/ActionJsonPanel";
import type { DrawingAction, DrawingInput, DrawingPlan } from "../drawing/types";
import { exportSvgElement } from "../drawing/exportSvg";
import { prepareActions } from "../drawing/actionPipeline";
import { callLlmPlannerProxy } from "../planner/llmProxyClient";
import { createPlanFromShapes } from "../planner/canvasPlan";
import { createUserPlanTemplate, saveUserPlanTemplate } from "../planner/userPlanTemplates";
import { callImageGenerationProxy, type ImageGenerationResult } from "../image/imageClient";

type WorkMode = "draw" | "image";

export function App() {
  const [state, dispatch] = useReducer(drawingReducer, undefined, createInitialDrawingState);
  const [workMode, setWorkMode] = useState<WorkMode>("draw");
  const [transcript, setTranscript] = useState("");
  const [simulatedText, setSimulatedText] = useState("");
  const [lastInput, setLastInput] = useState<DrawingInput>([]);
  const [lastImageResult, setLastImageResult] = useState<ImageGenerationResult | null>(null);
  const [lastTemplateKeyword, setLastTemplateKeyword] = useState("");
  const [isPlanning, setIsPlanning] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [logs, setLogs] = useState<string[]>(["系统已就绪"]);
  const svgRef = useRef<SVGSVGElement>(null);
  const isBusy = isPlanning || isGeneratingImage;

  const runActions = async (source: string) => {
    if (workMode === "image") {
      await runImageGeneration(source);
      return;
    }

    const parsedInput = parseCommand(source);
    const actions = prepareActions(parsedInput);
    setLastInput(parsedInput);
    setTranscript(source);
    setLogs((current) => [`你说：${source}`, ...current].slice(0, 8));

    if (isSingleSaveTemplateAction(actions)) {
      saveCurrentTemplate();
      return;
    }

    if (isSingleErrorAction(actions)) {
      setIsPlanning(true);
      try {
        const plannerResult = await callLlmPlannerProxy(source);
        if (plannerResult.ok) {
          applyPlan(plannerResult.plan, `AI 规划：${source}`, source);
          return;
        }
        dispatch({ type: "error", message: plannerResult.message });
        setLogs((current) => [plannerResult.message, ...current].slice(0, 8));
        speak(plannerResult.message);
        return;
      } finally {
        setIsPlanning(false);
      }
    }

    if (shouldRememberAsTemplateKeyword(parsedInput, actions)) {
      setLastTemplateKeyword(source);
    }

    actions.forEach((action) => {
      dispatch(action);
      if (action.type === "export") {
        window.setTimeout(() => exportSvgElement(svgRef.current), 0);
      }
    });

    speak(getFeedback(actions));
  };

  const runImageGeneration = async (source: string) => {
    const prompt = source.trim();
    if (!prompt || isGeneratingImage) {
      return;
    }

    setTranscript(prompt);
    setLastImageResult(null);
    setLogs((current) => [`你说：${prompt}`, ...current].slice(0, 8));
    setIsGeneratingImage(true);

    try {
      const result = await callImageGenerationProxy(prompt);
      setLastImageResult(result);
      if (result.ok) {
        setLogs((current) => [`AI 生图完成：${prompt}`, ...current].slice(0, 8));
        speak("图片已生成");
        return;
      }

      setLogs((current) => [result.message, ...current].slice(0, 8));
      speak(result.message);
    } finally {
      setIsGeneratingImage(false);
    }
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

  const saveCurrentTemplate = () => {
    const keyword = lastTemplateKeyword || transcript || "用户模板";
    if (state.shapes.length === 0) {
      dispatch({ type: "error", message: "当前画布为空，不能保存模板" });
      setLogs((current) => ["当前画布为空，不能保存模板", ...current].slice(0, 8));
      return;
    }

    const plan = createPlanFromShapes(state.shapes, keyword);
    const template = createUserPlanTemplate({ keyword, plan });
    saveUserPlanTemplate(template);
    setLastInput(plan);
    setLogs((current) => [`已保存模板：${keyword}`, ...current].slice(0, 8));
    speak(`已保存模板：${keyword}`);
  };

  const submitSimulatedText = () => {
    const text = simulatedText.trim();
    if (!text || isBusy) {
      return;
    }
    void runActions(text);
    setSimulatedText("");
  };

  const applyPlan = (plan: DrawingPlan, logMessage = `应用计划：${plan.title}`, templateKeyword = plan.title) => {
    const actions = prepareActions(plan);
    setLastInput(plan);
    setTranscript(plan.title);
    setLastTemplateKeyword(templateKeyword);
    setLogs((current) => [logMessage, ...current].slice(0, 8));

    actions.forEach((action) => {
      dispatch(action);
      if (action.type === "export") {
        window.setTimeout(() => exportSvgElement(svgRef.current), 0);
      }
    });

    speak(getFeedback(actions));
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

        {workMode === "draw" ? (
          <SvgCanvas ref={svgRef} shapes={state.shapes} selectedIds={state.selectedIds} />
        ) : (
          <section className="image-stage" aria-label="AI 生图结果">
            {isGeneratingImage ? (
              <div className="image-placeholder">
                <span className="spinner" aria-hidden="true" />
                <strong>正在生成图片</strong>
                <p>模型会根据识别出的文字生成一张参考图</p>
              </div>
            ) : lastImageResult?.ok ? (
              <img src={lastImageResult.imageUrl} alt={lastImageResult.prompt} />
            ) : (
              <div className="image-placeholder">
                <ImageIcon size={36} />
                <strong>AI 生图模式</strong>
                <p>说一句或输入一句提示词，例如：生成一张苹果简笔画</p>
              </div>
            )}
          </section>
        )}
      </section>

      <aside className="side-panel">
        <div className="status">
          <span className={isBusy ? "spinner" : speech.isListening ? "dot active" : "dot"} aria-hidden="true" />
          <div>
            <strong>
              {isGeneratingImage ? "模型生图中" : isPlanning ? "模型思考中" : speech.isSupported ? (speech.isListening ? "正在听" : "待命") : "浏览器不支持"}
            </strong>
            <p>{isGeneratingImage ? "正在根据语音文本生成图片" : isPlanning ? "正在解析复杂指令并生成绘图计划" : state.message}</p>
          </div>
        </div>

        <div className="mode-switch" aria-label="工作模式">
          <button className={workMode === "draw" ? "active" : ""} onClick={() => setWorkMode("draw")} type="button">
            SVG 绘图
          </button>
          <button className={workMode === "image" ? "active" : ""} onClick={() => setWorkMode("image")} type="button">
            AI 生图
          </button>
        </div>

        <div className="panel-section">
          <h2>识别文本</h2>
          <p className="transcript">{transcript || (workMode === "image" ? "点击开始监听后，说：生成一张火箭简笔画" : "点击开始监听后，说：画一个红色圆")}</p>
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
                disabled={isBusy}
                placeholder={workMode === "image" ? "输入：生成一张苹果简笔画" : "输入：画一个黄色三角形"}
              />
              <button onClick={submitSimulatedText} type="button" title="发送模拟指令" disabled={isBusy}>
                {isBusy ? <span className="button-spinner" aria-label={isGeneratingImage ? "模型生图中" : "模型思考中"} /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>

        <ActionLog logs={logs} />
        {workMode === "image" ? (
          <ActionJsonPanel input={lastImageResult ?? []} title="Result JSON" label="最近一次生图 Result JSON" />
        ) : (
          <ActionJsonPanel input={lastInput} />
        )}
      </aside>
    </main>
  );
}

function isSingleErrorAction(actions: DrawingAction[]): actions is Array<{ type: "error"; message: string }> {
  return actions.length === 1 && actions[0]?.type === "error";
}

function isSingleSaveTemplateAction(actions: DrawingAction[]): actions is Array<{ type: "saveTemplate" }> {
  return actions.length === 1 && actions[0]?.type === "saveTemplate";
}

function shouldRememberAsTemplateKeyword(input: DrawingInput, actions: DrawingAction[]): boolean {
  if (!Array.isArray(input)) {
    return true;
  }
  return actions.some((action) => action.type === "create");
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
  if (action.type === "rotate") {
    return "已旋转图形";
  }
  if (action.type === "move") {
    return "已移动图形";
  }
  if (action.type === "saveTemplate") {
    return "已保存模板";
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
