import type { Receipt, ReceiptPatch, UploadResponse, UploadErrorResponse } from "@receipt-parser/shared";

export type UploadResult =
  | { ok: true; data: UploadResponse }
  | { ok: false; parseError: true; data: UploadErrorResponse }
  | { ok: false; parseError: false; message: string };

export async function uploadReceipt(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("image", file);
  try {
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json();
    if (res.status === 201) return { ok: true, data: json as UploadResponse };
    if (res.status === 422) return { ok: false, parseError: true, data: json as UploadErrorResponse };
    return { ok: false, parseError: false, message: json.error ?? `Server error ${res.status}` };
  } catch {
    return { ok: false, parseError: false, message: "Network error — is the server running?" };
  }
}

export async function patchReceipt(id: string, patch: ReceiptPatch): Promise<Receipt> {
  const res = await fetch(`/api/receipts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
  return res.json();
}

export async function getReceipt(id: string): Promise<Receipt | null> {
  try {
    const res = await fetch(`/api/receipts/${id}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function listReceipts(): Promise<Receipt[]> {
  const res = await fetch("/api/receipts");
  if (!res.ok) throw new Error("Failed to load receipts");
  return res.json();
}
