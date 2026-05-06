export type Confidence = "high" | "medium" | "low";

export type LineItemCategory =
  | "item"
  | "subtotal"
  | "tax"
  | "tip"
  | "discount"
  | "fee"
  | "total";

export interface LineItemWithCategory {
  id: string;
  name: string;
  amount: number | null;
  category: LineItemCategory;
  isEdited: boolean;
}

export interface ConfidenceMap {
  merchantName: Confidence;
  date: Confidence;
  total: Confidence;
  lineItems: Confidence;
}

export type ReceiptStatus = "ok" | "low_confidence" | "parse_error";

export interface Receipt {
  id: string;
  createdAt: string;
  updatedAt: string;
  imagePath: string;
  merchantName: string | null;
  date: string | null;
  lineItems: LineItemWithCategory[];
  total: number | null;
  confidence: ConfidenceMap;
  status: ReceiptStatus;
  rawLlmOutput: string | null;
}

export type ReceiptPatch = Partial<
  Pick<Receipt, "merchantName" | "date" | "lineItems" | "total">
>;

export interface UploadResponse {
  id: string;
  status: ReceiptStatus;
  receipt: Receipt;
}

export interface UploadErrorResponse {
  error: "parse_failed";
  raw: string;
  partial: Receipt;
}
