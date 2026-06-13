# AI 语音绘图工具 MVP 设计文档

## 用户故事

计划实现：

- 用户可以只通过语音创建基础图形。
- 用户可以通过语音指定颜色、位置、大小和数量。
- 用户可以通过语音修改最近创建的图形颜色。
- 用户可以通过语音撤销、重做、清空画布和导出作品。
- 系统可以显示识别文本、动作日志和执行状态，便于 demo 说明。

最终实现：

- 已实现基础图形：圆形、矩形、线条、三角形、文字占位。
- 已实现颜色识别：红、蓝、绿、黄、黑、白、紫、橙、粉。
- 已实现位置识别：中间、左上、右上、左下、右下、左侧、右侧、顶部、底部、横向排列。
- 已实现多图形创建：如“画三个绿色圆，从左到右排列”。
- 已实现最近图形颜色修改、撤销、重做、清空和导出 SVG。
- 已实现目标引用基础能力：最近图形、全部图形、选中图形、按图形类型、按序号、按颜色、按空间位置查询。
- 已实现基础编辑动作：删除、移动、缩放目标图形。
- 已实现浏览器语音识别和语音播报反馈。

未完成部分：

- 暂未支持“第二个圆”“最大的矩形”“所有红色图形”等复杂目标引用。
- 暂未接入大模型解析自由自然语言。
- 暂未支持更复杂的组合图案模板，如完整场景、流程图、带文字标注的图示。

原因说明：本 MVP 优先保证三天内可运行、可演示、低成本。复杂目标引用和自由自然语言解析会显著增加状态查询、语义解析和错误恢复成本，适合作为后续增强。

## 技术选型

前端使用 Vite + React + TypeScript。Vite 启动和构建速度快，React 适合用状态驱动 SVG 图形树，TypeScript 让语音指令和绘图动作的结构更明确。

绘图层选择 SVG，而不是 Canvas。原因是本题更强调“语音控制绘图操作”，SVG 中每个图形都是独立对象，后续可以自然支持修改、删除、移动、分组和导出矢量文件。Canvas 更适合像素涂鸦，但编辑已存在图形需要额外维护对象模型。

语音识别使用 Web Speech API。MVP 阶段不需要后端和云端语音服务，降低开发复杂度和运营成本。语音反馈使用 SpeechSynthesis API，让执行结果更自然。

## 架构

```text
中文语音
  ↓
Web Speech API
  ↓
parseCommand 规则解析器
  ↓
DrawingAction 标准动作
  ↓
drawingReducer 状态管理
  ↓
SVG 渲染
  ↓
SpeechSynthesis 语音反馈
```

核心设计是把语音文本转成标准动作，而不是直接操作 SVG DOM。这样后续可以把规则解析器替换或增强为大模型解析器，绘图层不需要重写。

## 画布坐标系

画布使用 SVG `viewBox="0 0 1000 560"` 作为统一坐标空间。原点位于左上角，x 轴向右递增，y 轴向下递增。

坐标范围：

- `x`: 0 到 1000
- `y`: 0 到 560

`ShapePosition` 同时支持预设位置和显式坐标：

```json
"center"
```

```json
{ "x": 200, "y": 300 }
```

显式坐标主要面向后续 LLM 规划。模型可以把复杂绘图任务拆成多个带坐标的小 action，从而精确控制图形布局。执行前的 `validateAction` 会拒绝画布范围外的坐标。

## Action Schema v2

当前绘图能力通过 `DrawingAction` 判别联合类型表达。每个动作都有稳定的 `type` 字段，方便 TypeScript 收窄类型，也方便后续让 LLM 输出结构化 JSON。

创建图形示例：

```json
{
  "type": "create",
  "shape": "circle",
  "count": 1,
  "props": {
    "color": "#ef4444",
    "size": "medium",
    "position": "center"
  }
}
```

更新图形示例：

```json
{
  "type": "update",
  "target": { "ref": "last" },
  "props": {
    "color": "#2563eb"
  }
}
```

目标引用示例：

```json
{ "ref": "last" }
{ "kind": "circle", "index": 2 }
{ "color": "#ef4444" }
{ "spatial": "leftmost" }
```

编辑动作示例：

```json
{
  "type": "move",
  "target": { "kind": "circle", "index": 2 },
  "dx": 60,
  "dy": 0
}
```

```json
{
  "type": "resize",
  "target": { "ref": "last" },
  "scale": 1.25
}
```

## 绘制顺序

SVG 图形使用数组顺序决定绘制顺序。数组中越靠后的图形越晚绘制，因此会覆盖前面的图形。

系统支持两个图层动作：

```json
{
  "type": "bringToFront",
  "target": { "kind": "circle", "index": 2 }
}
```

```json
{
  "type": "sendToBack",
  "target": { "kind": "circle", "index": 2 }
}
```

这让后续 LLM 可以控制复杂画面的前后关系，例如让文字位于最上层、背景图形位于最底层。

这个结构把“理解用户意图”和“执行绘图动作”分开。后续接入 LLM 时，模型只需要生成 `DrawingAction[]`，前端继续负责校验、执行和渲染。

## Action 校验

所有 action 在进入 reducer 前都会经过 `prepareActions` 和 `validateAction`。校验失败时，系统不会执行该动作，而是返回一个 `error` action 给界面展示。

当前校验内容：

- `type` 必须是已支持动作。
- `shape`、`size`、`position`、`target` 必须在白名单内。
- `color` 必须是 `#RRGGBB` 格式。
- 单次创建图形数量限制为 1 到 8。
- 移动距离限制在安全范围内，避免模型输出过大位移。
- 缩放比例限制在 0.25 到 2 之间。

这层校验是后续接入 LLM 的安全边界。即使模型输出了错误 JSON、超大数值或未知动作，绘图状态也不会被直接污染。

## Action JSON 面板

界面会展示最近一次语音或文字输入解析后的 `DrawingAction[]`。这个面板用于两个目的：

- Demo 时展示“自然语言指令如何被拆成结构化绘图动作”。
- 后续接入 LLM 时调试模型输出、校验结果和实际执行之间的链路。

面板提供复制按钮，便于把 action JSON 放入设计文档、问题复现记录或模型调试 prompt 中。为了保持可读性，当前只展示最近一次输入对应的 prepared actions。

## 成本控制策略

计划采用：

- 优先使用浏览器内置语音识别，减少云端语音服务费用。
- 优先使用本地规则解析，避免每条指令调用大模型。
- 图形渲染和导出全部在前端完成，不需要服务器存储。
- 后续如果接入大模型，只在规则解析失败时 fallback，并要求模型输出受约束的 JSON Action。

实际采用：

- 已采用 Web Speech API 和 SpeechSynthesis API。
- 已采用本地规则解析。
- 已采用前端 SVG 渲染和本地 SVG 导出。
- 暂未接入大模型，因此当前运行成本接近为零。

## 后续增强路线

1. 增加目标引用：第一个圆、刚才那组图形、所有红色图形。
2. 增加移动和缩放：向左移动一点、放大两倍。
3. 增加组合模板：太阳、房子、流程图。
4. 增加 LLM fallback：把复杂自然语言解析成 DrawingAction JSON，并做 schema 校验。
5. 增加 PNG 导出：将 SVG 转成 Canvas 后下载 PNG。

## DrawingPlan 规划层

复杂指令会先进入 `DrawingPlan`，再由 `prepareActions` 展开成有序 `DrawingAction[]`。这对应 Plan-and-Execute 思路：planner 负责把用户目标拆成多步计划，executor 负责按步骤调用工具。当前 executor 就是现有的 `validateAction`、`drawingReducer` 和 SVG 渲染链路。

`DrawingPlan` 结构：

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
        "props": {
          "color": "#f97316",
          "size": "large",
          "position": { "x": 500, "y": 340 }
        }
      }
    },
    {
      "id": "house-roof",
      "title": "画屋顶",
      "dependsOn": ["house-body"],
      "action": {
        "type": "create",
        "shape": "triangle",
        "count": 1,
        "props": {
          "color": "#ef4444",
          "size": "large",
          "position": { "x": 500, "y": 230 }
        }
      }
    }
  ]
}
```

校验策略：

- `steps` 数量限制为 1 到 20，避免一次生成过大的绘制任务。
- `id` 必须唯一，便于后续模板沉淀、步骤复用和调试。
- `dependsOn` 只能引用前面已经出现过的步骤，保证计划顺序就是可执行顺序。
- 每一步的 `action` 仍然走 `validateAction`，继续复用颜色、坐标、数量、目标引用等安全边界。

当前本地规则解析器已经支持“画一幅小房子”作为示例计划。后续接入 LLM 时，只需要让模型输出同样的 `DrawingPlan` JSON；前端仍负责校验、展开、执行和展示，不把模型输出直接作用到 SVG DOM。

## Plan Template Catalog

`src/planner/planTemplates.ts` 负责保存可复用的规划模板。模板层不直接执行绘图，而是根据用户输入命中一个 `DrawingPlan`，再交给现有 `prepareActions`、`validateAction` 和 reducer 执行。

模板结构：

```ts
type PlanTemplate = {
  id: string;
  category: "scene" | "object";
  source: "manual" | "vision";
  keywords: string[];
  description: string;
  plan: DrawingPlan;
};
```

字段用途：

- `id` 是稳定标识，后续可以用于命中统计、模板版本管理和 demo 说明。
- `category` 描述模板层级，当前先分为 `scene` 场景和 `object` 物体。
- `source` 描述模板来源，当前内置模板是 `manual`，后续可以扩展为由多模态参考生成的 `vision` 模板。
- `keywords` 是本地低成本匹配入口。
- `description` 面向人和后续 LLM prompt，说明模板适合什么场景。
- `plan` 是可执行的结构化计划。

当前内置 `house-scene` 和 `apple-sketch`，可以响应“小房子”“房子”“小屋”“苹果”等表达。`findPlanTemplate` 每次命中都会返回新的 plan 实例，避免执行过程中的状态修改污染原始模板。

这层的后续用途是模板沉淀：LLM 生成的计划如果通过校验、执行效果好、复用价值高，就可以保存为模板。下次遇到相似场景时优先走本地模板，减少模型调用成本和响应延迟；模板未命中时再走 LLM 规划。

## DrawingPlan JSON Schema

`src/planner/drawingPlanSchema.ts` 保存面向 LLM 的结构化输出契约。它导出两份对象：

- `drawingPlanJsonSchema`：标准 JSON Schema，描述 `DrawingPlan` 根对象、步骤数组和每一步 action 的结构。
- `drawingPlanResponseFormat`：给支持 JSON Schema structured output 的模型调用使用，包含 `name`、`strict` 和 `schema`。

Schema 覆盖当前允许模型规划的动作：

- `create`
- `update`
- `delete`
- `move`
- `resize`
- `bringToFront`
- `sendToBack`
- `clear`
- `export`

暂不允许 LLM 在计划步骤中直接输出 `undo`、`redo` 或 `error`。原因是这些动作更适合由用户即时控制或由系统内部错误处理产生，不适合作为复杂绘图计划的一部分。

当前 `create` 支持的基础图形是 `circle`、`rect`、`line`、`triangle`、`text`、`ellipse`、`diamond`、`star` 和 `path`。这让模型可以用更少步骤组合出简笔画物体，例如苹果可以由椭圆主体、圆形高光、矩形果柄、椭圆叶子和路径凹陷组成。

`create.props` 还支持简笔画样式字段：

- `rotation`: `-180` 到 `180` 度，用 SVG `rotate(angle cx cy)` 围绕图形中心旋转。
- `strokeColor`: `#RRGGBB` 描边颜色，用于主体轮廓、叶子边缘、尾翼等。
- `strokeWidth`: `0` 到 `24` 的描边宽度。
- `pathData`: `path` 图形专用的 SVG 路径数据，当前只允许 `M`、`L`、`Q`、`C`、`Z` 命令，长度不超过 300 字符，坐标仍限制在画布范围内。

这些字段都是运行时可选的，旧模板和本地规则可以不填写；面向 LLM 的 schema 会要求模型显式输出，减少“漏字段导致结构化输出不稳定”的情况。

这层 schema 是第一道约束，目标是减少模型输出非法 JSON 或未知字段。`prepareActions` 和 `validateAction` 仍然是执行前的第二道校验，用来防止越界坐标、过大位移、未知目标引用等运行时风险。

为了适配 strict structured output，schema 中的 object 都显式要求所有声明字段。对业务上可选的内容采用可执行约定处理：例如步骤没有依赖时，`dependsOn` 输出空数组；按类型引用目标时，可以选择只输出 `{ "kind": "circle" }`，也可以输出 `{ "kind": "circle", "index": 2 }`。

## LLM Planner Adapter

`src/planner/llmPlanner.ts` 是真实大模型接入前的适配层。它定义统一接口，但暂不绑定具体 provider。

核心类型：

```ts
type PlannerInput = {
  text: string;
  responseFormat: typeof drawingPlanResponseFormat;
};

type PlannerResult =
  | { ok: true; source: "template" | "llm" | "mock"; plan: DrawingPlan }
  | { ok: false; message: string };

type PlanGenerator = (input: PlannerInput) => Promise<PlannerResult>;
```

当前流程：

```text
用户复杂文本
  -> planFromText
  -> findPlanTemplate
  -> 模板命中：返回 template plan
  -> 模板未命中：调用 fallback PlanGenerator
```

默认 fallback 是 `mockPlanGenerator`，只返回“暂未接入真实 LLM planner”。这样可以先把接口边界、测试和文档固定下来，后续接入 OpenAI、DeepSeek、通义等 provider 时，只需要新增一个实现 `PlanGenerator` 的函数。

真实 LLM planner 需要遵守两条边界：

- 输入阶段使用 `drawingPlanResponseFormat` 约束模型输出。
- 输出阶段仍然交给 `prepareActions` 和 `validateAction` 做运行时校验。

## Planner 调试面板

右侧栏新增 `Planner 调试` 面板，用于观察 planner 链路，但不会直接执行绘图。

调试面板输入文本后，会调用 `planFromText`：

```text
调试输入
  -> planFromText
  -> template / mock / future llm
  -> DrawingPlan
  -> prepareActions
  -> Prepared Actions JSON
```

展示内容：

- `source`：当前计划来源，例如 `template` 或 `mock`。
- `Plan JSON`：planner 返回的原始结构化计划。
- `Prepared Actions`：计划展开并通过 `prepareActions` 后的动作列表。
- 错误信息：fallback planner 未接入或生成失败时展示。
- 示例按钮：`模板示例` 用于快速验证 template 分支，`Mock 示例` 用于快速验证 fallback 错误分支。

这个面板的目的不是替代主绘图入口，而是在接入真实 LLM 前提供可观察的调试窗口。后续模型输出异常时，可以直接比较“模型返回的 plan”和“前端准备执行的 actions”，定位问题属于 prompt、schema、模板命中还是 action 校验。

## LLM Proxy Contract

真实模型调用不放在浏览器内直接完成。前端通过 `src/planner/llmProxyClient.ts` 调用 `/api/plan`，由后端或 serverless 代理读取 API key、调用模型，并返回 `PlannerResult`。

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

成功响应：

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

失败响应：

```json
{
  "ok": false,
  "message": "quota exceeded"
}
```

安全边界：

- 浏览器不保存真实模型 API key。
- 服务端代理负责读取密钥、调用 provider、处理限流和错误。
- 前端收到响应后仍然走 `prepareActions` 和 `validateAction`，不信任模型输出直接修改画布。

`proxyPlanGenerator` 实现了 `PlanGenerator` 兼容接口。后续要把 mock planner 替换为真实 provider 时，可以调用：

```ts
planFromText(text, proxyPlanGenerator)
```

## Mock /api/plan Endpoint

本地开发环境通过 `server/mockPlanApiPlugin.ts` 在 Vite dev server 上注册 mock `/api/plan`。它用于先打通浏览器到代理端的请求链路，不调用真实模型，也不读取 API key。

当前 mock 行为：

- `POST /api/plan`
- 请求体必须包含 `text`
- `text` 包含“流程图”时，返回一个固定流程图 `DrawingPlan`
- 其他文本返回 `{ "ok": false, "message": "Mock /api/plan is ready; real provider is not configured" }`
- 非 POST 请求返回 405
- 非法 JSON 返回 400

这层 mock 的目标是验证：

```text
frontend proxy client
  -> /api/plan
  -> PlannerResult
  -> planFromText fallback
  -> prepareActions
```

生产或正式 demo 接真实 provider 时，应把这层替换为后端或 serverless endpoint，并在服务端读取模型 API key。

## LLM Provider Adapter

`server/planProvider.ts` 把 `/api/plan` 的计划生成来源拆成可替换 provider：

- `createConfiguredPlanProvider` 根据环境变量选择 provider。
- 没有 `LLM_API_KEY` / `OPENAI_API_KEY` 时，使用 mock provider，保证本地 demo 不依赖外部服务。
- 有 API key 时，使用 OpenAI-compatible provider 调用 `/chat/completions`。
- provider 返回统一的 `PlannerResult`，前端不需要知道真实模型、mock 或后续 serverless 的差异。

环境变量：

```text
LLM_API_KEY=真实模型密钥
LLM_MODEL=gpt-4.1-mini
LLM_BASE_URL=https://api.openai.com/v1
```

这层只做三件事：读取服务端密钥、调用模型、把模型响应解析成 `DrawingPlan`。模型返回后仍需满足 `server/planContract.ts` 的基础结构校验；进入前端后继续经过 `prepareActions` 和 `validateAction`，避免不可信模型输出直接修改画布。

后续增强方向：

- 把 Chat Completions provider 替换或扩展为 Responses API provider。
- 为不同模型供应商增加独立 provider，例如 Qwen / DeepSeek / Moonshot。
- 在 provider 层记录 token、耗时、fallback 原因，服务成本控制文档可直接引用。

## Planner Debug Modes

Planner 调试面板提供两个模式：

- `本地 Planner`：调用 `planFromText`，用于验证本地模板、规则 fallback 和 action pipeline。
- `/api/plan`：调用 `callLlmPlannerProxy`，直接请求服务端代理 endpoint，用于验证 mock provider 或真实模型 provider 返回的 `DrawingPlan`。

这个切换让调试链路更清晰：

```text
本地 Planner:
  text -> template / local fallback -> DrawingPlan

/api/plan:
  text -> frontend proxy client -> server provider -> DrawingPlan
```

真实模型接入后，可以先在 `/api/plan` 模式检查模型输出、schema 兼容性和 prepared actions，再决定是否把执行入口切到真实 provider。

## Plan Preview And Apply Flow

LLM 或 mock provider 返回 `DrawingPlan` 后，调试面板先进入预览状态，不会立即修改画布。预览内容包括：

- 计划来源 `source`
- 步骤标题列表
- 原始 `Plan JSON`
- 经 `prepareActions` 展开的 `Prepared Actions`

用户点击 `应用计划` 后，App 才会把该 `DrawingPlan` 写入 `lastInput`，并逐条 dispatch 展开的绘图动作。这样可以避免模型虽然满足 JSON Schema、但语义或布局不符合预期时直接污染画布。

执行链路：

```text
text
  -> /api/plan
  -> DrawingPlan preview
  -> user confirms
  -> prepareActions
  -> drawingReducer
  -> canvas
```

这也是复杂指令能力的展示点：模型负责拆解和排序，人可以在执行前看到“将画什么、按什么顺序画”。

## LLM Planner Prompt Rules

真实 provider 的 system prompt 不只要求模型返回 JSON，还会给出绘图规划约束：

- 画布坐标范围固定为 `x: 0-1000`、`y: 0-560`。
- 优先使用坐标位置，减少抽象位置导致的布局不确定。
- 复杂指令必须拆成有顺序的步骤。
- 每个步骤使用稳定、可读、可复用的 `id`。
- `dependsOn` 只能引用前面已经出现过的步骤 id。
- 流程图、架构图等场景优先采用从上到下或从左到右的布局。
- 使用简单 SVG 图形和高对比颜色，避免生成无法执行的说明性文本。
- 对苹果、树、车、房子等真实物体，必须组合基础图形，不要发明 schema 外的 shape 名称。

这层 prompt 解决“模型知道怎么规划”的问题；`DrawingPlan` JSON Schema 解决“结构是否可解析”的问题；`prepareActions` / `validateAction` 解决“是否允许执行”的问题。三层组合后，真实模型输出不会直接绕过业务校验。

主绘图入口的链路也已经接入兜底：本地规则解析失败时，会自动请求 `/api/plan`；如果真实 provider 已配置，就由 LLM 返回 `DrawingPlan` 并立即走同一套 `prepareActions`、reducer 和 SVG 渲染流程。这样“画一个苹果”这类模板命中的请求可以走本地低成本路径，“画一个还没配置过的物体”则可以走模型规划路径。

密钥配置仍然只放在服务端环境变量里：

```text
LLM_API_KEY=真实模型密钥
LLM_MODEL=gpt-4.1-mini
LLM_BASE_URL=https://api.openai.com/v1
```

不要使用 `VITE_` 前缀保存模型密钥，因为这类变量会进入浏览器包。
