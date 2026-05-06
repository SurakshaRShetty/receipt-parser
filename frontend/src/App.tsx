import { useState, useEffect } from "react";
import type { Receipt } from "@receipt-parser/shared";
import { uploadReceipt, getReceipt } from "./api";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { UploadZone } from "./components/UploadZone";
import { ReceiptEditor } from "./components/ReceiptEditor";

const STORAGE_KEY = "lastReceiptId";

type AppState =
  | { phase: "restoring" }
  | { phase: "upload" }
  | { phase: "uploading"; preview: string }
  | { phase: "done"; receipt: Receipt; imagePath: string; parseErrorRaw?: string }
  | { phase: "error"; message: string; preview?: string };

export default function App() {
  const [state, setState] = useState<AppState>({ phase: "restoring" });

  // On mount: restore the last receipt from localStorage
  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (!savedId) {
      setState({ phase: "upload" });
      return;
    }
    getReceipt(savedId).then((receipt) => {
      if (receipt) {
        setState({ phase: "done", receipt, imagePath: receipt.imagePath });
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setState({ phase: "upload" });
      }
    });
  }, []);

  function goToDone(receipt: Receipt, parseErrorRaw?: string) {
    localStorage.setItem(STORAGE_KEY, receipt.id);
    setState({ phase: "done", receipt, imagePath: receipt.imagePath, parseErrorRaw });
  }

  async function handleFile(file: File) {
    const preview = URL.createObjectURL(file);
    setState({ phase: "uploading", preview });

    const result = await uploadReceipt(file);

    if (result.ok) {
      goToDone(result.data.receipt);
    } else if (result.parseError) {
      goToDone(result.data.partial, result.data.raw ?? undefined);
    } else {
      setState({ phase: "error", message: result.message, preview });
    }
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    setState({ phase: "upload" });
  }

  return (
    <ErrorBoundary>
      <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <header style={{
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Receipt Parser</h1>
          {state.phase === "done" && (
            <button onClick={reset} style={secondaryBtnStyle}>Upload another</button>
          )}
        </header>

        <main style={{ padding: 24 }}>
          {state.phase === "restoring" && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 80 }}>
              <div style={spinnerStyle} />
            </div>
          )}

          {state.phase === "upload" && (
            <div style={{ maxWidth: 500, margin: "60px auto" }}>
              <UploadZone onFile={handleFile} disabled={false} />
            </div>
          )}

          {state.phase === "uploading" && (
            <div style={{ maxWidth: 500, margin: "60px auto" }}>
              <div style={{ position: "relative" }}>
                <img
                  src={state.preview}
                  alt="Receipt preview"
                  style={{ width: "100%", borderRadius: 8, display: "block", opacity: 0.5 }}
                />
                <div style={{
                  position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 12,
                }}>
                  <div style={spinnerStyle} />
                  <p style={{ fontWeight: 500, fontSize: 14 }}>Extracting receipt data…</p>
                </div>
              </div>
            </div>
          )}

          {state.phase === "error" && (
            <div style={{ maxWidth: 500, margin: "60px auto" }}>
              {state.preview && (
                <img src={state.preview} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 16, opacity: 0.6 }} />
              )}
              <div style={{
                background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8,
                padding: "16px 20px", marginBottom: 16
              }}>
                <strong style={{ color: "#991b1b" }}>Upload failed</strong>
                <p style={{ marginTop: 6, fontSize: 14, color: "#7f1d1d" }}>{state.message}</p>
              </div>
              <button onClick={reset} style={primaryBtnStyle}>Try again</button>
            </div>
          )}

          {state.phase === "done" && (
            <ReceiptEditor
              initial={state.receipt}
              imagePath={state.imagePath}
              parseErrorRaw={state.parseErrorRaw}
            />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  padding: "8px 20px",
  background: "#1a1a1a",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 14,
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "6px 14px",
  background: "none",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
};

const spinnerStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  border: "3px solid #e5e7eb",
  borderTop: "3px solid #3b82f6",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};
