import { Clipboard } from "lucide-react";
import type { DrawingInput } from "../drawing/types";

type Props = {
  input: DrawingInput;
};

export function ActionJsonPanel({ input }: Props) {
  const json = JSON.stringify(input, null, 2);

  const copyJson = async () => {
    await navigator.clipboard?.writeText(json);
  };

  return (
    <div className="panel-section action-json-panel">
      <div className="panel-heading">
        <h2>Action JSON</h2>
        <button onClick={copyJson} type="button" title="复制 Action JSON">
          <Clipboard size={16} />
        </button>
      </div>
      <pre aria-label="最近一次 Action JSON">{json}</pre>
    </div>
  );
}
