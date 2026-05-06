import type { Confidence } from "@receipt-parser/shared";

interface Props {
  confidence: Confidence;
  isEdited: boolean;
}

export function ConfidenceFlag({ confidence, isEdited }: Props) {
  if (isEdited || confidence !== "low") return null;
  return (
    <span
      title="Low confidence — please verify"
      style={{
        display: "inline-block",
        marginLeft: 6,
        padding: "1px 6px",
        background: "#fef3c7",
        border: "1px solid #f59e0b",
        borderRadius: 4,
        fontSize: 11,
        color: "#92400e",
        verticalAlign: "middle",
        cursor: "help",
        userSelect: "none",
      }}
    >
      ⚠ verify
    </span>
  );
}
