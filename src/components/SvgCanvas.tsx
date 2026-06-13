import { forwardRef } from "react";
import type { DrawableShape } from "../drawing/types";

type Props = {
  shapes: DrawableShape[];
  selectedIds: string[];
};

export const SvgCanvas = forwardRef<SVGSVGElement, Props>(function SvgCanvas({ shapes, selectedIds }, ref) {
  const xTicks = [0, 250, 500, 750, 1000];
  const yTicks = [0, 140, 280, 420, 560];

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
        <g className="axis-layer" fill="#64748b" fontSize="18" fontWeight="700">
          <line x1="0" y1="0" x2="1000" y2="0" stroke="#64748b" strokeWidth="2" />
          <line x1="0" y1="0" x2="0" y2="560" stroke="#64748b" strokeWidth="2" />
          {xTicks.map((tick) => (
            <g key={`x-${tick}`}>
              <line x1={tick} y1="0" x2={tick} y2="12" stroke="#64748b" strokeWidth="2" />
              <text x={tick === 1000 ? 970 : tick + 8} y="30">
                {tick}
              </text>
            </g>
          ))}
          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line x1="0" y1={tick} x2="12" y2={tick} stroke="#64748b" strokeWidth="2" />
              <text x="18" y={tick === 0 ? 54 : tick + 6}>
                {tick}
              </text>
            </g>
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
  const transform = shape.rotation ? `rotate(${shape.rotation} ${shape.x} ${shape.y})` : undefined;
  const strokeColor = shape.strokeColor ?? "none";
  const strokeWidth = shape.strokeColor ? shape.strokeWidth : 0;

  if (shape.kind === "circle") {
    return (
      <g transform={transform}>
        <circle cx={shape.x} cy={shape.y} r={shape.width / 2} fill={shape.color} stroke={strokeColor} strokeWidth={strokeWidth} />
        <circle cx={shape.x} cy={shape.y} r={shape.width / 2 + 8} fill="none" stroke={outline} strokeWidth="4" />
      </g>
    );
  }

  if (shape.kind === "rect") {
    return (
      <g transform={transform}>
        <rect
          x={shape.x - shape.width / 2}
          y={shape.y - shape.height / 2}
          width={shape.width}
          height={shape.height}
          fill={shape.color}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          rx="8"
        />
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
      <g transform={transform}>
        <line
          x1={shape.x - shape.width / 2}
          y1={shape.y}
          x2={shape.x + shape.width / 2}
          y2={shape.y}
          stroke={shape.strokeColor ?? shape.color}
          strokeWidth={shape.strokeWidth}
          strokeLinecap="round"
        />
      </g>
    );
  }

  if (shape.kind === "path") {
    return (
      <g transform={transform}>
        <path
          d={shape.pathData ?? ""}
          fill="none"
          stroke={shape.strokeColor ?? shape.color}
          strokeWidth={shape.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
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
    return (
      <g transform={transform}>
        <polygon points={points} fill={shape.color} stroke={selected ? outline : strokeColor} strokeWidth={selected ? 4 : strokeWidth} />
      </g>
    );
  }

  if (shape.kind === "ellipse") {
    return (
      <g transform={transform}>
        <ellipse
          cx={shape.x}
          cy={shape.y}
          rx={shape.width / 2}
          ry={shape.height / 2}
          fill={shape.color}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
        <ellipse
          cx={shape.x}
          cy={shape.y}
          rx={shape.width / 2 + 8}
          ry={shape.height / 2 + 8}
          fill="none"
          stroke={outline}
          strokeWidth="4"
        />
      </g>
    );
  }

  if (shape.kind === "diamond") {
    const points = [
      [shape.x, shape.y - shape.height / 2],
      [shape.x + shape.width / 2, shape.y],
      [shape.x, shape.y + shape.height / 2],
      [shape.x - shape.width / 2, shape.y]
    ]
      .map((point) => point.join(","))
      .join(" ");
    return (
      <g transform={transform}>
        <polygon points={points} fill={shape.color} stroke={selected ? outline : strokeColor} strokeWidth={selected ? 4 : strokeWidth} />
      </g>
    );
  }

  if (shape.kind === "star") {
    const points = createStarPoints(shape.x, shape.y, shape.width / 2, shape.width / 4).join(" ");
    return (
      <g transform={transform}>
        <polygon points={points} fill={shape.color} stroke={selected ? outline : strokeColor} strokeWidth={selected ? 4 : strokeWidth} />
      </g>
    );
  }

  return (
    <g transform={transform}>
      <text x={shape.x} y={shape.y} textAnchor="middle" fill={shape.color} stroke={strokeColor} strokeWidth={strokeWidth} fontSize="42" fontWeight="700">
        {shape.text ?? "文本"}
      </text>
    </g>
  );
}

function createStarPoints(cx: number, cy: number, outerRadius: number, innerRadius: number): string[] {
  return Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
  });
}
