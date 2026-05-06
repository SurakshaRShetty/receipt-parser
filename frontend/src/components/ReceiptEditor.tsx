import { useState, useEffect, useRef, useCallback } from "react";
import type { Receipt, LineItemWithCategory } from "@receipt-parser/shared";
import { patchReceipt } from "../api";
import { FieldEditor } from "./FieldEditor";
import { LineItemRow } from "./LineItemRow";
import { SaveStatus } from "./SaveStatus";

type SaveStatusType = "idle" | "saving" | "saved" | "error";

interface Props {
  initial: Receipt;
  imagePath: string;
  parseErrorRaw?: string | null;
}

export function ReceiptEditor({ initial, imagePath, parseErrorRaw }: Props) {
  const [receipt, setReceipt] = useState<Receipt>(initial);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatusType>("saved");
  const [failCount, setFailCount] = useState(0);
  // tracks which top-level fields the user has manually confirmed/edited
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());
  const lastSavedRef = useRef<Receipt>(initial);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSave = useCallback(async (data: Receipt) => {
    setSaveStatus("saving");
    try {
      await patchReceipt(data.id, {
        merchantName: data.merchantName,
        date: data.date,
        lineItems: data.lineItems,
        total: data.total,
      });
      lastSavedRef.current = data;
      setSaveStatus("saved");
      setIsDirty(false);
      setFailCount(0);
    } catch {
      setFailCount((n) => n + 1);
      setSaveStatus("error");
    }
  }, []);

  // Debounced auto-save on changes
  useEffect(() => {
    if (!isDirty) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSave(receipt), 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [receipt, isDirty, doSave]);

  function update(patch: Partial<Receipt>, field?: string) {
    setReceipt((r) => ({ ...r, ...patch }));
    setIsDirty(true);
    setSaveStatus("idle");
    if (field) setEditedFields((s) => new Set(s).add(field));
  }

  function updateLineItem(id: string, updated: LineItemWithCategory) {
    update({ lineItems: receipt.lineItems.map((li) => (li.id === id ? updated : li)) });
  }

  function deleteLineItem(id: string) {
    update({ lineItems: receipt.lineItems.filter((li) => li.id !== id) });
  }

  function addLineItem() {
    const blank: LineItemWithCategory = {
      id: crypto.randomUUID(),
      name: "",
      amount: null,
      category: "item",
      isEdited: true,
    };
    update({ lineItems: [...receipt.lineItems, blank] });
  }

  // Sum only purchased items — intermediate rows (taxable amount, subtotals, totals)
  // are derived values that cause double-counting if included
  const itemsSubtotal = receipt.lineItems
    .filter((li) => li.category === "item")
    .reduce((s, li) => s + (li.amount ?? 0), 0);

  const imageUrl = imagePath.startsWith("/uploads")
    ? imagePath
    : `/uploads/${imagePath.split(/[\\/]/).pop()}`;

  return (
    <div style={{ display: "flex", gap: 24, padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      {/* Left: image panel */}
      <div style={{ flex: "0 0 380px" }}>
        <img
          src={imageUrl}
          alt="Receipt"
          style={{
            width: "100%",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,.1)",
          }}
        />
      </div>

      {/* Right: editor panel */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Review & Correct</h2>
          <SaveStatus
            status={saveStatus}
            onRetry={() => doSave(receipt)}
          />
        </div>

        {/* Persistent error banner after 3+ failures */}
        {failCount >= 3 && (
          <div style={{
            background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 6,
            padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#991b1b"
          }}>
            ⚠ Changes are not saving. Check your connection and{" "}
            <button
              onClick={() => { setFailCount(0); doSave(receipt); }}
              style={{ background: "none", border: "none", color: "#991b1b", textDecoration: "underline", cursor: "pointer", fontSize: 13 }}
            >
              try again
            </button>.
          </div>
        )}

        {/* Parse error notice */}
        {parseErrorRaw && (
          <div style={{
            background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 6,
            padding: "10px 14px", marginBottom: 16, fontSize: 13
          }}>
            <strong>Extraction failed.</strong> The LLM returned unexpected output. You can fill in the fields manually.
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: "pointer", color: "#666" }}>Raw LLM output</summary>
              <pre style={{ marginTop: 6, fontSize: 11, whiteSpace: "pre-wrap", color: "#555", maxHeight: 160, overflow: "auto" }}>
                {parseErrorRaw}
              </pre>
            </details>
          </div>
        )}

        {/* Merchant + Date */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>Merchant</label>
            <FieldEditor
              value={receipt.merchantName ?? ""}
              onChange={(v) => update({ merchantName: v || null }, "merchantName")}
              confidence={receipt.confidence.merchantName}
              isEdited={editedFields.has("merchantName")}
              placeholder="Unknown merchant"
            />
          </div>
          <div>
            <label style={labelStyle}>Date</label>
            <FieldEditor
              value={receipt.date ?? ""}
              onChange={(v) => update({ date: v || null }, "date")}
              confidence={receipt.confidence.date}
              isEdited={editedFields.has("date")}
              placeholder="YYYY-MM-DD"
              type="date"
            />
          </div>
        </div>

        {/* Line items table */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Line Items</label>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ ...thStyle, textAlign: "left" }}>Name</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Category</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {receipt.lineItems.map((item) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  confidence={receipt.confidence.lineItems}
                  onChange={(updated) => updateLineItem(item.id, updated)}
                  onDelete={() => deleteLineItem(item.id)}
                />
              ))}
              {receipt.lineItems.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: "12px 8px", color: "#999", fontSize: 13, textAlign: "center" }}>
                    No line items extracted. Add them manually.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <button onClick={addLineItem} style={addBtnStyle}>+ Add line</button>
        </div>

        {/* Total */}
        <div style={{ borderTop: "2px solid #e5e7eb", paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              Items subtotal:{" "}
              <span style={{ color: "#1a1a1a", fontWeight: 500 }}>
                {itemsSubtotal.toFixed(2)}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>Grand Total:</label>
              <FieldEditor
                value={receipt.total !== null ? String(receipt.total) : ""}
                onChange={(v) => update({ total: v === "" ? null : parseFloat(v) || null }, "total")}
                confidence={receipt.confidence.total}
                isEdited={editedFields.has("total")}
                placeholder="0.00"
                type="number"
                style={{ fontWeight: 700, fontSize: 16 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 4,
};

const thStyle: React.CSSProperties = {
  padding: "6px 8px",
  fontSize: 12,
  fontWeight: 600,
  color: "#6b7280",
};

const addBtnStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  padding: "4px 12px",
  background: "none",
  border: "1px dashed #d1d5db",
  borderRadius: 6,
  cursor: "pointer",
  color: "#6b7280",
};
