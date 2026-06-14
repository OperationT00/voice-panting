import type { DrawableShape, DrawingPlan, ShapeProps, ShapeSize } from "../drawing/types";

export function createPlanFromShapes(shapes: DrawableShape[], title: string): DrawingPlan {
  return {
    type: "plan",
    title,
    steps: shapes.map((shape, index) => ({
      id: shape.id,
      title: `保存 ${shape.kind}`,
      dependsOn: index === 0 ? [] : [shapes[index - 1].id],
      action: {
        type: "create",
        shape: shape.kind,
        count: 1,
        props: createPropsFromShape(shape)
      }
    }))
  };
}

function createPropsFromShape(shape: DrawableShape): ShapeProps {
  const props: ShapeProps = {
    color: shape.color,
    size: pickSizeFromShape(shape),
    position: { x: shape.x, y: shape.y }
  };

  if (shape.rotation) {
    props.rotation = shape.rotation;
  }
  if (shape.strokeColor) {
    props.strokeColor = shape.strokeColor;
  }
  if (shape.strokeWidth !== 6) {
    props.strokeWidth = shape.strokeWidth;
  }
  if (shape.pathData) {
    props.pathData = shape.pathData;
  }

  return props;
}

function pickSizeFromShape(shape: DrawableShape): ShapeSize {
  const maxSize = Math.max(shape.width, shape.height);
  if (maxSize <= 70) {
    return "small";
  }
  if (maxSize >= 120) {
    return "large";
  }
  return "medium";
}
