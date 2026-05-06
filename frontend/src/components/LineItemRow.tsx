import type { LineItemWithCategory, LineItemCategory, Confidence } from "@receipt-parser/shared";
import { FieldEditor } from "./FieldEditor";

interface Props {
  item: LineItemWithCategory;
  confidence: Confidence;
  onChange: (updated: LineItemWithCategory) => void;
  onDelete: () => void;
}

const CATEGORIES: LineItemCategory[] = ["item", "subtotal", "tax", "tip", "discount", "fee", "total"];

const categoryColors: Record<LineItemCategory, string> = {
  item: "#e0f2fe",
  subtotal: "#f0fdf4",
  tax: "#fef9c3",
  tip: "#f0fdf4",
  discount: "#fce7f3",
  fee: "#fef3c7",
  total: "#e0e7ff",
};

export function LineItemRow({ item, confidence, onChange, onDelete }: Props) {
  function update(patch: Partial<LineItemWithCategory>) {
    onChange({ ...item, ...patch, isEdited: true });
  }

  // Once a row is edited by the user it's always treated as high confidence
  const effectiveConfidence = item.isEdited ? "high" : confidence;

  return (
    <tr>
      <td style={{ padding: "4px 8px", width: "50%" }}>
        <FieldEditor
          value={item.name}
          onChange={(v) => update({ name: v })}
          confidence={effectiveConfidence}
          isEdited={item.isEdited}
          placeholder="Item name"
          style={{ width: "100%" }}
        />
      </td>
      <td style={{ padding: "4px 8px", width: "20%", textAlign: "right" }}>
        <FieldEditor
          value={item.amount !== null ? String(item.amount) : ""}
          onChange={(v) => update({ amount: v === "" ? null : parseFloat(v) || null })}
          confidence={effectiveConfidence}
          isEdited={item.isEdited}
          placeholder="0.00"
          type="number"
        />
      </td>
      <td style={{ padding: "4px 8px", width: "20%" }}>
        <select
          value={item.category}
          onChange={(e) => update({ category: e.target.value as LineItemCategory })}
          style={{
            fontSize: 12,
            padding: "2px 4px",
            borderRadius: 4,
            border: "1px solid #e5e7eb",
            background: categoryColors[item.category],
            cursor: "pointer",
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </td>
      <td style={{ padding: "4px 8px", width: "10%", textAlign: "center" }}>
        <button
          onClick={onDelete}
          title="Delete line"
          style={{
            background: "none",
            border: "none",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: "2px 4px",
          }}
        >
          ×
        </button>
      </td>
    </tr>
  );
}
