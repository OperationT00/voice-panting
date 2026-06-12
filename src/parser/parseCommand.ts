import type { CoordinatePosition, DrawingAction, ShapeKind, ShapePosition, ShapeSize, TargetRef } from "../drawing/types";

const colors: Array<[string, string]> = [
  ["紫", "#9333ea"],
  ["红", "#ef4444"],
  ["蓝", "#2563eb"],
  ["绿", "#16a34a"],
  ["黄", "#eab308"],
  ["黑", "#111827"],
  ["白", "#ffffff"],
  ["橙", "#f97316"],
  ["粉", "#ec4899"]
];

const shapes: Array<[string, ShapeKind]> = [
  ["圆", "circle"],
  ["矩形", "rect"],
  ["方形", "rect"],
  ["正方形", "rect"],
  ["线", "line"],
  ["横线", "line"],
  ["三角", "triangle"],
  ["文字", "text"]
];

const numberWords: Record<string, number> = {
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5
};

export function parseCommand(rawText: string): DrawingAction[] {
  const text = normalizeText(rawText);

  if (/撤销|上一步|退回/.test(text)) {
    return [{ type: "undo" }];
  }

  if (/重做|恢复/.test(text)) {
    return [{ type: "redo" }];
  }

  if (/清空|清除/.test(text)) {
    return [{ type: "clear" }];
  }

  if (/导出|保存/.test(text)) {
    return [{ type: "export" }];
  }

  if (/删除/.test(text)) {
    return [{ type: "delete", target: pickTarget(text) }];
  }

  if (/移动|移到|挪/.test(text)) {
    const delta = pickMoveDelta(text);
    return [{ type: "move", target: pickTarget(text), dx: delta.dx, dy: delta.dy }];
  }

  if (/放大|缩小/.test(text)) {
    return [{ type: "resize", target: pickTarget(text), scale: /缩小/.test(text) ? 0.8 : 1.25 }];
  }

  if (/置顶|放到最前|移到最前|上移一层/.test(text)) {
    return [{ type: "bringToFront", target: pickTarget(text) }];
  }

  if (/置底|放到最后|移到最后|下移一层/.test(text)) {
    return [{ type: "sendToBack", target: pickTarget(text) }];
  }

  if (/改成|变成|换成/.test(text)) {
    const color = pickNewColor(text);
    if (color) {
      return [{ type: "update", target: pickTarget(text), props: { color } }];
    }
  }

  if (/画|绘制|添加/.test(text)) {
    const shape = pickShape(text);
    if (shape) {
      return [
        {
          type: "create",
          shape,
          count: pickCount(text),
          props: {
            color: pickColor(text) ?? "#111827",
            size: pickSize(text),
            position: pickPosition(text)
          }
        }
      ];
    }
  }

  return [{ type: "error", message: "没听懂图形或操作，请换一种说法" }];
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, "").replace(/，|。|、|！|!/g, "");
}

function pickColor(text: string): string | undefined {
  return colors.find(([keyword]) => text.includes(keyword))?.[1];
}

function pickNewColor(text: string): string | undefined {
  const match = text.match(/(?:改成|变成|换成)(.+)$/);
  return pickColor(match?.[1] ?? text);
}

function pickTarget(text: string): TargetRef {
  const beforeChange = text.split(/改成|变成|换成/)[0] ?? text;
  const shape = pickShape(beforeChange);
  const color = pickColor(beforeChange);

  if (/所有/.test(beforeChange)) {
    if (color) {
      return { color };
    }
    if (shape) {
      return { kind: shape };
    }
    return { ref: "all" };
  }

  if (shape) {
    const index = pickOrdinal(beforeChange);
    return index ? { kind: shape, index } : { kind: shape };
  }

  return { ref: "last" };
}

function pickShape(text: string): ShapeKind | undefined {
  return shapes.find(([keyword]) => text.includes(keyword))?.[1];
}

function pickCount(text: string): number {
  if (pickCoordinatePosition(text)) {
    return 1;
  }

  const digit = text.match(/[1-5]/)?.[0];
  if (digit) {
    return Number(digit);
  }

  const word = Object.keys(numberWords).find((item) => text.includes(item));
  return word ? numberWords[word] : 1;
}

function pickOrdinal(text: string): number | undefined {
  const digit = text.match(/第([1-5])个/)?.[1];
  if (digit) {
    return Number(digit);
  }

  const word = text.match(/第([一二两三四五])个/)?.[1];
  return word ? numberWords[word] : undefined;
}

function pickMoveDelta(text: string): { dx: number; dy: number } {
  const amount = /大幅|很多|远一点/.test(text) ? 120 : 60;
  if (/向左|往左|左移/.test(text)) {
    return { dx: -amount, dy: 0 };
  }
  if (/向右|往右|右移/.test(text)) {
    return { dx: amount, dy: 0 };
  }
  if (/向上|往上|上移/.test(text)) {
    return { dx: 0, dy: -amount };
  }
  if (/向下|往下|下移/.test(text)) {
    return { dx: 0, dy: amount };
  }
  return { dx: amount, dy: 0 };
}

function pickSize(text: string): ShapeSize {
  if (/小|小一点/.test(text)) {
    return "small";
  }
  if (/大|大一点/.test(text)) {
    return "large";
  }
  return "medium";
}

function pickPosition(text: string): ShapePosition {
  const coordinate = pickCoordinatePosition(text);
  if (coordinate) {
    return coordinate;
  }

  if (/从左到右|横向|排列/.test(text)) {
    return "row";
  }
  if (/左上/.test(text)) {
    return "top-left";
  }
  if (/右上/.test(text)) {
    return "top-right";
  }
  if (/左下/.test(text)) {
    return "bottom-left";
  }
  if (/右下/.test(text)) {
    return "bottom-right";
  }
  if (/上方|顶部/.test(text)) {
    return "top";
  }
  if (/下方|底部/.test(text)) {
    return "bottom";
  }
  if (/左边|左侧/.test(text)) {
    return "left";
  }
  if (/右边|右侧/.test(text)) {
    return "right";
  }
  return "center";
}

function pickCoordinatePosition(text: string): CoordinatePosition | undefined {
  const coordinateMatch = text.match(/坐标(\d{1,4})(?:,|，)?(\d{1,4})/);
  if (coordinateMatch) {
    return { x: Number(coordinateMatch[1]), y: Number(coordinateMatch[2]) };
  }

  const xyMatch = text.match(/x(\d{1,4})y(\d{1,4})/i);
  if (xyMatch) {
    return { x: Number(xyMatch[1]), y: Number(xyMatch[2]) };
  }

  return undefined;
}
