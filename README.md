# Voice Panting

纯语音控制的 SVG 绘图工具 MVP。用户通过中文语音创建、修改、撤销、清空和导出矢量图形。

## 技术栈

- Vite + React + TypeScript：快速搭建可维护的前端应用。
- SVG：每个图形都是可编辑对象，方便后续支持“修改第二个圆”“删除左边矩形”等指令。
- Web Speech API：浏览器内置语音识别，MVP 阶段不依赖后端服务。
- SpeechSynthesis API：执行后给出语音反馈。
- Vitest：覆盖指令解析和绘图状态管理。

## 本地运行

```powershell
npm.cmd install
npm.cmd run dev
```

推荐使用 Chrome 或 Edge 浏览器体验语音识别。

## 可试指令

```text
画一个红色圆
在坐标200,300画一个红色圆
在左上角画一个蓝色矩形
画三个绿色圆，从左到右排列
把刚才的图形改成紫色
把第二个圆改成蓝色
把第二个圆向右移动一点
把第二个圆放大
把第二个圆置顶
把第二个圆置底
删除第二个圆
把所有圆改成绿色
把所有红色图形改成蓝色
撤销
重做
清空画布
导出 SVG
```

## 坐标系

画布使用 SVG `viewBox="0 0 1000 560"`：

- 原点在左上角。
- x 轴从左到右，范围 `0-1000`。
- y 轴从上到下，范围 `0-560`。
- `position` 可以使用预设位置，也可以使用 `{ "x": 200, "y": 300 }`。

## 验证

```powershell
npm.cmd test
npm.cmd run build
```

## DrawingPlan 规划输入

复杂指令可以被解析成 `DrawingPlan`，再由 `prepareActions` 展开成有序 `DrawingAction[]` 执行。当前可试指令：

```text
画一幅小房子
```

示例结构：

```json
{
  "type": "plan",
  "title": "画一幅小房子",
  "steps": [
    {
      "id": "house-body",
      "title": "画房身",
      "action": {
        "type": "create",
        "shape": "rect",
        "count": 1,
        "props": { "color": "#f97316", "size": "large", "position": { "x": 500, "y": 340 } }
      }
    }
  ]
}
```

后续接入 LLM 时，可以让模型输出 `DrawingPlan`，前端继续负责校验、展开和执行。

## Plan Template Catalog

常用复杂场景会沉淀到 `src/planner/planTemplates.ts`。模板包含：

- `id`: 稳定模板标识，便于后续统计和复用。
- `keywords`: 本地命中关键词。
- `description`: 给人和后续 LLM prompt 阅读的说明。
- `plan`: 可直接执行的 `DrawingPlan`。

当前内置 `house-scene` 模板，对应“画一幅小房子”。后续可以把 LLM 生成并验证通过的高质量计划沉淀为模板，遇到相似请求时优先本地复用，减少模型调用成本和响应延迟。

## DrawingPlan JSON Schema

`src/planner/drawingPlanSchema.ts` 导出 `drawingPlanJsonSchema` 和 `drawingPlanResponseFormat`。

- `drawingPlanJsonSchema`: 描述 LLM 需要输出的 `DrawingPlan` 结构。
- `drawingPlanResponseFormat`: 面向支持 JSON Schema structured output 的模型调用封装。

Schema 覆盖当前支持的绘图动作、图形类型、尺寸、位置、目标引用和安全数值边界。后续接入 LLM 时，应要求模型只输出符合该 schema 的 JSON，再交给 `prepareActions` 和 `validateAction` 做运行时校验。

为适配 strict structured output，schema 中的对象字段都显式 required；例如步骤没有依赖时，`dependsOn` 输出空数组。

## LLM Planner Adapter

`src/planner/llmPlanner.ts` 定义了后续接入真实 LLM 的统一接口：

- `PlannerInput`: 用户文本和 `drawingPlanResponseFormat`。
- `PlannerResult`: 成功时返回 `DrawingPlan` 和来源，失败时返回错误信息。
- `PlanGenerator`: 可替换的异步计划生成函数。
- `planFromText`: 先查本地模板，模板未命中再调用 fallback generator。

当前默认 fallback 是 `mockPlanGenerator`，只返回“暂未接入真实 LLM planner”。后续接入真实模型时，只需要实现新的 `PlanGenerator`，复用同一份 schema 和后续执行管线。

## Planner 调试面板

页面右侧提供 `Planner 调试` 面板，用于在不影响主绘图流程的情况下观察 planner 链路。

输入文本后点击“运行 Planner”，面板会展示：

- planner source，如 `template` 或 `mock`。
- planner 返回的 `DrawingPlan`。
- 经过 `prepareActions` 展开后的 actions。
- fallback 失败时的错误信息。

当前调试面板不会直接执行绘图，只用于验证模板命中、LLM adapter、schema 和 action pipeline 的衔接。
面板内置“模板示例”和“Mock 示例”按钮，方便在不输入文字时快速验证两条 planner 分支。

## LLM Proxy Contract

真实 LLM 调用应通过服务端代理完成，前端只调用 `/api/plan`，不保存模型 API key。

前端请求：

```json
{
  "text": "画一个流程图",
  "responseFormat": {
    "type": "json_schema",
    "json_schema": {
      "name": "drawing_plan",
      "strict": true,
      "schema": {}
    }
  }
}
```

前端期望响应：

```json
{
  "ok": true,
  "source": "llm",
  "plan": {
    "type": "plan",
    "title": "画一个流程图",
    "steps": []
  }
}
```

`src/planner/llmProxyClient.ts` 提供 `callLlmPlannerProxy` 和 `proxyPlanGenerator`。后续真实 provider 接入时，可以把 `proxyPlanGenerator` 作为 `planFromText` 的 fallback generator。

本地开发环境已通过 Vite middleware 提供 mock `/api/plan`：

- `POST /api/plan`
- 请求包含 `text` 和 `responseFormat`
- 文本包含“流程图”时返回一个固定流程图 `DrawingPlan`
- 其他文本返回 mock 未配置真实 provider 的错误

这个 endpoint 只用于本地联调，不读取真实 API key。
