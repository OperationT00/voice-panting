import type { DrawingAction } from "./types";
import { validateAction } from "./validateAction";

export function prepareActions(actions: unknown[]): DrawingAction[] {
  for (const action of actions) {
    const result = validateAction(action);
    if (!result.ok) {
      return [{ type: "error", message: result.message }];
    }
  }
  return actions as DrawingAction[];
}
