import { z } from "zod";
import { monotonicFactory } from "ulid";
import type { Receipt, LineItemWithCategory, ConfidenceMap, ReceiptStatus } from "@receipt-parser/shared";

const ulid = monotonicFactory();

const ConfidenceSchema = z.enum(["high", "medium", "low"]).default("low");

const LlmLineItemSchema = z.object({
  name: z.string().default("Unknown item"),
  amount: z.union([z.number(), z.string(), z.null()]).default(null),
  category: z
    .enum(["item", "subtotal", "tax", "tip", "discount", "fee", "total"])
    .default("item"),
});

const LlmReceiptSchema = z.object({
  merchant_name: z.string().nullable().default(null),
  date: z.string().nullable().default(null),
  line_items: z.array(LlmLineItemSchema).default([]),
  total: z.union([z.number(), z.string(), z.null()]).default(null),
  confidence: z
    .object({
      merchant_name: ConfidenceSchema,
      date: ConfidenceSchema,
      total: ConfidenceSchema,
      line_items: ConfidenceSchema,
    })
    .default({ merchant_name: "low", date: "low", total: "low", line_items: "low" }),
});

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
}

function extractJsonSubstring(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return text;
  return text.slice(start, end + 1);
}

function parseAmount(raw: string | number | null): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return raw;
  // Remove currency symbols, spaces
  const cleaned = raw.replace(/[$€£¥\s]/g, "");
  // Handle European comma-decimal: if comma appears before 3 or fewer digits at end, treat as decimal
  const commaDecimal = cleaned.match(/^-?\d{1,3}(?:\.\d{3})*,(\d{1,2})$/);
  if (commaDecimal) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  }
  // Remove thousands commas (e.g. 1,234.56)
  const normalized = cleaned.replace(/,(?=\d{3})/g, "");
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
}

function normalizeDate(raw: string | null): string | null {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    // Use local date components to avoid UTC-midnight timezone shift
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return null;
}

export interface ParseResult {
  receipt: Omit<Receipt, "id" | "createdAt" | "updatedAt" | "imagePath">;
  rawLlmOutput: string;
}

export function parseReceiptLlmOutput(rawText: string): ParseResult {
  const stripped = stripFences(rawText);
  const jsonStr = extractJsonSubstring(stripped);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Total failure — return empty receipt with parse_error status
    return {
      rawLlmOutput: rawText,
      receipt: {
        merchantName: null,
        date: null,
        lineItems: [],
        total: null,
        confidence: { merchantName: "low", date: "low", total: "low", lineItems: "low" },
        status: "parse_error",
        rawLlmOutput: rawText,
      },
    };
  }

  const result = LlmReceiptSchema.safeParse(parsed);
  const data = result.success ? result.data : LlmReceiptSchema.parse({});

  const lineItems: LineItemWithCategory[] = data.line_items.map((li) => ({
    id: ulid(),
    name: li.name,
    amount: parseAmount(li.amount),
    category: li.category,
    isEdited: false,
  }));

  const confidence: ConfidenceMap = {
    merchantName: data.confidence.merchant_name,
    date: data.confidence.date,
    total: data.confidence.total,
    lineItems: data.confidence.line_items,
  };

  const total = parseAmount(data.total);
  const date = normalizeDate(data.date);

  const status: ReceiptStatus = computeStatus(confidence, lineItems, result.success);

  return {
    rawLlmOutput: rawText,
    receipt: {
      merchantName: data.merchant_name,
      date,
      lineItems,
      total,
      confidence,
      status,
      rawLlmOutput: status === "parse_error" ? rawText : null,
    },
  };
}

function computeStatus(
  confidence: ConfidenceMap,
  lineItems: LineItemWithCategory[],
  zodSuccess: boolean
): ReceiptStatus {
  if (!zodSuccess) return "low_confidence";
  const hasLow = Object.values(confidence).some((c) => c === "low");
  const allNull = lineItems.length === 0;
  if (hasLow || allNull) return "low_confidence";
  return "ok";
}
