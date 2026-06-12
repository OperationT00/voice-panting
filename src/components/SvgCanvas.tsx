import { forwardRef } from "react";
import type { DrawableShape } from "../drawing/types";

type Props = {
  shapes: DrawableShape[];
  selectedIds: string[];
};

export const SvgCanvas = forwardRef<SVGSVGElement, Props>(function SvgCanvas({ shapes, selectedIds }, ref) {
  return (
    <div className="canvas-frame">
      <svg ref={ref} viewBox="0 0 1000 560" role="img" aria-label="语音绘图画布">
        <rect x="0" y="0" width="1000" height="560" fill="#fbfaf7" />
        <g opacity="0.2">
          {Array.from({ length: 10 }, (_, index) => (
            <line key={`v-${index}`} x1={index * 100} y1="0" x2={index * 100} y2="560" stroke="#94a3b8" />
          ))}
          {Array.from({ length: 6 }, (_, index) => (
            <line key={`h-${index}`} x1="0" y1={index * 100} x2="1000" y2={index * 100} stroke="#94a3b8" />
          ))}
        </g>
        {shapes.map((shape) => (
          <ShapeView key={shape.id} shape={shape} selected={selectedIds.includes(shape.id)} />
        ))}
      </svg>
    </div>
  );
});

function ShapeView({ shape, selected }: { shape: DrawableShape; selected: boolean }) {
  const outline = selected ? "#0f172a" : "transparent";

  if (shape.kind === "circle") {
    return (
      <g>
        <circle cx={shape.x} cy={shape.y} r={shape.width / 2} fill={shape.color} />
        <circle cx={shape.x} cy={shape.y} r={shape.width / 2 + 8} fill="none" stroke={outline} strokeWidth="4" />
      </g>
    );
  }

  if (shape.kind === "rect") {
    return (
      <g>
        <rect x={shape.x - shape.width / 2} y={shape.y - shape.height / 2} width={shape.width} height={shape.height} fill={shape.color} rx="8" />
        <rect
          x={shape.x - shape.width / 2 - 8}
          y={shape.y - shape.height / 2 - 8}
          width={shape.width + 16}
          height={shape.height + 16}
          fill="none"
          stroke={outline}
          strokeWidth="4"
          rx="10"
        />
      </g>
    );
  }

  if (shape.kind === "line") {
    return (
      <line
        x1={shape.x - shape.width / 2}
        y1={shape.y}
        x2={shape.x + shape.width / 2}
        y2={shape.y}
        stroke={shape.color}
        strokeWidth={shape.strokeWidth}
        strokeLinecap="round"
      />
    );
  }

  if (shape.kind === "triangle") {
    const points = [
      [shape.x, shape.y - shape.height / 2],
      [shape.x - shape.width / 2, shape.y + shape.height / 2],
      [shape.x + shape.width / 2, shape.y + shape.height / 2]
    ]
      .map((point) => point.join(","))
      .join(" ");
    return <polygon points={points} fill={shape.color} stroke={outline} strokeWidth={selected ? 4 : 0} />;
  }

  return (
    <text x={shape.x} y={shape.y} textAnchor="middle" fill={shape.color} fontSize="42" fontWeight="700">
      {shape.text ?? "文本"}
    </text>
  );
}
