export type ShapeKind = "circle" | "rect" | "line" | "triangle" | "text" | "ellipse" | "diamond" | "star";
export type ShapeSize = "small" | "medium" | "large";
export type PresetPosition =
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

export type CoordinatePosition = {
  x: number;
  y: number;
};

export type ShapePosition = PresetPosition | CoordinatePosition;

export type ShapeProps = {
  color: string;
  size: ShapeSize;
  position: ShapePosition;
  rotation?: number;
  strokeColor?: string;
  strokeWidth?: number;
};

export type SpatialTarget = "leftmost" | "rightmost" | "topmost" | "bottommost";

export type TargetRef =
  | { ref: "last" | "all" | "selected" }
  | { kind: ShapeKind; index?: number }
  | { color: string }
  | { spatial: SpatialTarget };

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
  | {
      type: "delete";
      target: TargetRef;
    }
  | {
      type: "move";
      target: TargetRef;
      dx: number;
      dy: number;
    }
  | {
      type: "resize";
      target: TargetRef;
      scale: number;
    }
  | {
      type: "bringToFront";
      target: TargetRef;
    }
  | {
      type: "sendToBack";
      target: TargetRef;
    }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "clear" }
  | { type: "export" }
  | { type: "error"; message: string };

export type DrawingPlanStep = {
  id: string;
  title: string;
  action: DrawingAction;
  dependsOn?: string[];
};

export type DrawingPlan = {
  type: "plan";
  title: string;
  steps: DrawingPlanStep[];
};

export type DrawingInput = DrawingAction[] | DrawingPlan;

export type DrawableShape = {
  id: string;
  kind: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation?: number;
  strokeColor?: string;
  strokeWidth: number;
  text?: string;
};
