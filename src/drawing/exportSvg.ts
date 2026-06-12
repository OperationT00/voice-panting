export function exportSvgElement(svg: SVGSVGElement | null) {
  if (!svg) {
    return;
  }

  const source = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "voice-drawing.svg";
  link.click();
  URL.revokeObjectURL(url);
}
