# Voice Painting

纯语音控制的 AI 绘图工具。用户可以通过语音或文字模拟语音完成 SVG 绘图、图形微调、模板保存，也可以切换到 AI 生图模式调用 Qwen-Image 生成参考图。

## Demo

公开视频链接：[demo 演示](https://www.bilibili.com/video/BV1JBJP6aEet/?share_source=copy_web&vd_source=3781debd79a4400ee746347c62958b4c)

## 功能

- 语音输入：基于浏览器 Web Speech API 识别中文语音。
- 文字模拟语音：不方便说话时可以直接输入指令测试。
- SVG 绘图：支持圆、矩形、三角形、线条、文字、椭圆、菱形、星形、路径等图形。
- 图形编辑：支持移动、放大缩小、旋转、改颜色、调线条粗细、置顶置底、删除、撤销、重做、清空。
- 复杂图形：支持苹果、房子、火箭等内置模板，也支持 LLM 将复杂指令拆成绘图计划。
- 模板保存：可以通过“保存此模板”把当前画布保存到浏览器本地模板库。
- AI 生图：切换到 `AI 生图` 模式后，语音或文字会调用 Qwen-Image 生成图片。
- 导出：支持导出当前 SVG 画布。
- 调试信息：右侧展示识别文本、动作日志和 JSON 结果。

## 本地运行

```powershell
npm.cmd install
npm.cmd run dev
```

推荐使用 Chrome 或 Edge 体验语音识别。

## 环境变量

复制 `.env.example` 为 `.env`，按需填写：

```text
LLM_API_KEY=
LLM_MODEL=gpt-4.1-mini
LLM_BASE_URL=https://api.openai.com/v1

IMAGE_API_KEY=
IMAGE_MODEL=qwen-image-2.0-pro
IMAGE_BASE_URL=https://dashscope.aliyuncs.com/api/v1
IMAGE_SIZE=1024*1024
```

不要把真实 `.env` 提交到仓库。

## 可试指令

SVG 绘图模式：

```text
画一个红色圆
画一个苹果
画一个火箭
把第二个圆向右移动一点
把苹果梗变细
保存此模板
撤销
导出 SVG
```

AI 生图模式：

```text
生成一张苹果简笔画
生成一张火箭图片
```

## 文档

设计文档见 [docs/design.md](docs/design.md)。

## 验证

```powershell
npm.cmd test
npm.cmd run build
```
