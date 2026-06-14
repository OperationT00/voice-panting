import { Clipboard } from "lucide-react";

type Props = {
  input: unknown;
  title?: string;
  label?: string;
};

export function ActionJsonPanel({ input, title = "Action JSON", label = "最近一次 Action JSON" }: Props) {
  const json = JSON.stringify(input, null, 2);

  const copyJson = async () => {
    await navigator.clipboard?.writeText(json);
  };

  return (
    <div className="panel-section action-json-panel">
      <div className="panel-heading">
        <h2>{title}</h2>
        <button onClick={copyJson} type="button" title={`复制 ${title}`}>
          <Clipboard size={16} />
        </button>
      </div>
      <pre aria-label={label}>{json}</pre>
    </div>
  );
}
