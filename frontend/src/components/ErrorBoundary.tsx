import React from "react";

interface Props { children: React.ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: unknown): State {
    return { hasError: true, message: err instanceof Error ? err.message : String(err) };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: "center" }}>
          <h2 style={{ marginBottom: 12 }}>Something went wrong</h2>
          <p style={{ color: "#666", marginBottom: 20, fontFamily: "monospace", fontSize: 13 }}>
            {this.state.message}
          </p>
          <button onClick={() => window.location.reload()} style={btnStyle}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const btnStyle: React.CSSProperties = {
  padding: "8px 20px",
  background: "#1a1a1a",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 14,
};
