type Props = {
  logs: string[];
};

export function ActionLog({ logs }: Props) {
  return (
    <div className="panel-section">
      <h2>动作日志</h2>
      <ol className="log-list">
        {logs.map((log, index) => (
          <li key={`${log}-${index}`}>{log}</li>
        ))}
      </ol>
    </div>
  );
}
