import { useState, useRef } from "react";

interface Props {
  onFile: (file: File) => void;
  disabled: boolean;
}

export function UploadZone({ onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Please upload a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Maximum size is 10 MB.");
      return;
    }
    onFile(file);
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      style={{
        border: `2px dashed ${dragging ? "#3b82f6" : "#d1d5db"}`,
        borderRadius: 12,
        padding: "48px 32px",
        textAlign: "center",
        cursor: disabled ? "default" : "pointer",
        background: dragging ? "#eff6ff" : "#fff",
        transition: "all 0.15s",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
      <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>
        {disabled ? "Extracting receipt data…" : "Drop a receipt photo here"}
      </p>
      <p style={{ fontSize: 13, color: "#9ca3af" }}>
        {disabled ? "Please wait" : "JPEG, PNG, WebP · max 10 MB · or click to browse"}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
