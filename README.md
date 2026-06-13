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
- `category`: 模板层级，如 `scene` 场景或 `object` 物体。
- `source`: 模板来源，如 `manual` 手工配置或后续的 `vision` 视觉参考生成。
- `keywords`: 本地命中关键词。
- `description`: 给人和后续 LLM prompt 阅读的说明。
- `plan`: 可直接执行的 `DrawingPlan`。

当前内置 `house-scene` 和 `apple-sketch` 模板，分别对应“画一幅小房子”和“画一个苹果”。后续可以把 LLM 生成并验证通过的高质量计划沉淀为模板，遇到相似请求时优先本地复用，减少模型调用成本和响应延迟。

## DrawingPlan JSON Schema

`src/planner/drawingPlanSchema.ts` 导出 `drawingPlanJsonSchema` 和 `drawingPlanResponseFormat`。

- `drawingPlanJsonSchema`: 描述 LLM 需要输出的 `DrawingPlan` 结构。
- `drawingPlanResponseFormat`: 面向支持 JSON Schema structured output 的模型调用封装。

Schema 覆盖当前支持的绘图动作、图形类型、尺寸、位置、目标引用和安全数值边界。当前基础图形包含 `circle`、`rect`、`line`、`triangle`、`text`、`ellipse`、`diamond`、`star` 和 `path`。`create.props` 还支持 `rotation`、`strokeColor`、`strokeWidth` 和 `pathData`，用于画倾斜部件、简笔画轮廓和曲线路径。后续接入 LLM 时，应要求模型只输出符合该 schema 的 JSON，再交给 `prepareActions` 和 `validateAction` 做运行时校验。

为适配 strict structured output，schema 中的对象字段都显式 required；例如步骤没有依赖时，`dependsOn` 输出空数组。

## LLM Planner Adapter

`src/planner/llmPlanner.ts` 定义了后续接入真实 LLM 的统一接口：

- `PlannerInput`: 用户文本和 `drawingPlanResponseFormat`。
- `PlannerResult`: 成功时返回 `DrawingPlan` 和来源，失败时返回错误信息。
- `PlanGenerator`: 可替换的异步计划生成函数。
- `planFromText`: 先查本地模板，模板未命中再调用 fallback generator。

当前默认 fallback 是 `mockPlanGenerator`，只返回“暂未接入真实 LLM planner”。主绘图入口在规则解析失败时会自动请求 `/api/plan`，因此配置真实 provider 后，像“画一个苹果”“画一辆车”这类本地规则未覆盖的目标也可以由 LLM 拆成可执行的 `DrawingPlan`。后续接入真实模型时，只需要实现新的 `PlanGenerator`，复用同一份 schema 和后续执行管线。

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

## LLM Provider Adapter

`/api/plan` 现在通过 `server/planProvider.ts` 选择计划生成来源：

- 未配置 `LLM_API_KEY` / `OPENAI_API_KEY` 时，继续使用本地 mock fallback。
- 配置 API key 后，调用 OpenAI-compatible Chat Completions endpoint。
- `LLM_MODEL` / `OPENAI_MODEL` 控制模型名称，默认是 `gpt-4.1-mini`。
- `LLM_BASE_URL` / `OPENAI_BASE_URL` 控制兼容接口地址，默认是 `https://api.openai.com/v1`。

可以复制 `.env.example` 为 `.env` 后填写本地密钥。真实密钥只会在 Vite dev server 侧读取，不会进入浏览器代码。

本地 `.env` 示例：

```text
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4.1-mini
LLM_BASE_URL=https://api.openai.com/v1
```

如果使用 OpenAI-compatible provider，可以只替换 `LLM_BASE_URL` 和 `LLM_MODEL`。不要使用 `VITE_LLM_API_KEY` 或其他 `VITE_` 前缀保存密钥，因为这类变量会被暴露给浏览器。

真实 provider 的 prompt 会要求模型：

- 使用 `x: 0-1000`、`y: 0-560` 的画布坐标。
- 优先输出坐标位置，便于精确布局。
- 把复杂需求拆成有顺序的步骤。
- 使用稳定的步骤 `id` 和只引用前序步骤的 `dependsOn`。
- 用已支持的基础图形组合真实物体，避免输出不在白名单内的 shape。

Planner 调试面板支持两种模式：

- `本地 Planner`：先命中本地模板，未命中时返回本地 fallback。
- `/api/plan`：直接请求本地代理 endpoint，用于验证 mock 或真实 provider 返回的 `DrawingPlan`。

调试面板返回计划后不会自动修改画布。用户可以先检查计划步骤、Plan JSON 和 Prepared Actions，确认无误后点击 `应用计划`，再把计划展开成绘图动作并写入画布。
