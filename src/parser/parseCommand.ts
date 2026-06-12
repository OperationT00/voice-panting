import type { DrawingAction, ShapeKind, ShapePosition, ShapeSize } from "../drawing/types";

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

  if (/改成|变成|换成/.test(text)) {
    const color = pickColor(text);
    if (color) {
      return [{ type: "update", target: { ref: "last" }, props: { color } }];
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

function pickShape(text: string): ShapeKind | undefined {
  return shapes.find(([keyword]) => text.includes(keyword))?.[1];
}

function pickCount(text: string): number {
  const digit = text.match(/[1-5]/)?.[0];
  if (digit) {
    return Number(digit);
  }

  const word = Object.keys(numberWords).find((item) => text.includes(item));
  return word ? numberWords[word] : 1;
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
