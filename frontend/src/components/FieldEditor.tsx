import { useState, useRef, useEffect } from "react";
import type { Confidence } from "@receipt-parser/shared";
import { ConfidenceFlag } from "./ConfidenceFlag";

interface Props {
  value: string;
  onChange: (v: string) => void;
  confidence?: Confidence;
  isEdited?: boolean;
  placeholder?: string;
  type?: "text" | "number" | "date";
  style?: React.CSSProperties;
}

export function FieldEditor({
  value,
  onChange,
  confidence = "high",
  isEdited = false,
  placeholder = "—",
  type = "text",
  style,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync draft when value changes externally
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  function startEdit() {
    setDraft(value);
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    if (draft !== value) onChange(draft);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const lowAndUnedited = confidence === "low" && !isEdited;

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        style={{
          border: "1px solid #3b82f6",
          borderRadius: 4,
          padding: "2px 6px",
          fontSize: "inherit",
          width: "100%",
          background: "#fff",
          outline: "none",
          ...style,
        }}
      />
    );
  }

  return (
    <span
      onClick={startEdit}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        cursor: "pointer",
        padding: "2px 6px",
        borderRadius: 4,
        background: lowAndUnedited ? "#fef3c7" : "transparent",
        border: "1px solid transparent",
        minWidth: 60,
        ...style,
      }}
      title={lowAndUnedited ? "Low confidence — click to edit" : "Click to edit"}
    >
      <span style={{ color: value ? "inherit" : "#999" }}>{value || placeholder}</span>
      <ConfidenceFlag confidence={confidence} isEdited={isEdited} />
      <span style={{ color: "#ccc", fontSize: 11, marginLeft: 2 }}>✏</span>
    </span>
  );
}
