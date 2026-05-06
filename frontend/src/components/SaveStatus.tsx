interface Props {
  status: "idle" | "saving" | "saved" | "error";
  onRetry?: () => void;
}

export function SaveStatus({ status, onRetry }: Props) {
  const styles: Record<string, React.CSSProperties> = {
    idle: { color: "#999" },
    saving: { color: "#555" },
    saved: { color: "#16a34a" },
    error: { color: "#dc2626" },
  };

  const labels: Record<string, string> = {
    idle: "Unsaved changes",
    saving: "Saving…",
    saved: "Saved",
    error: "Save failed",
  };

  return (
    <span style={{ fontSize: 13, ...styles[status] }}>
      {labels[status]}
      {status === "error" && onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginLeft: 8,
            fontSize: 12,
            padding: "2px 8px",
            cursor: "pointer",
            background: "none",
            border: "1px solid #dc2626",
            borderRadius: 4,
            color: "#dc2626",
          }}
        >
          Retry
        </button>
      )}
    </span>
  );
}
