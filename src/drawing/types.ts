export type ShapeKind = "circle" | "rect" | "line" | "triangle" | "text";
export type ShapeSize = "small" | "medium" | "large";
export type ShapePosition =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right"
  | "row";

export type ShapeProps = {
  color: string;
  size: ShapeSize;
  position: ShapePosition;
};

export type TargetRef = { ref: "last" | "all" | "selected" };

export type DrawingAction =
  | {
      type: "create";
      shape: ShapeKind;
      count: number;
      props: ShapeProps;
    }
  | {
      type: "update";
      target: TargetRef;
      props: Partial<ShapeProps>;
    }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "clear" }
  | { type: "export" }
  | { type: "error"; message: string };

export type DrawableShape = {
  id: string;
  kind: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  text?: string;
};
