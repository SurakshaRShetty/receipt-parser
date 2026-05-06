import { describe, it, expect } from "vitest";
import { parseReceiptLlmOutput } from "../src/services/parser";

const validJson = {
  merchant_name: "Starbucks",
  date: "2024-01-05",
  line_items: [
    { name: "Latte", amount: 5.50, category: "item" },
    { name: "Tax", amount: 0.44, category: "tax" },
  ],
  total: 5.94,
  confidence: { merchant_name: "high", date: "high", total: "high", line_items: "high" },
};

describe("parseReceiptLlmOutput", () => {
  it("strips JSON markdown fences", () => {
    const input = "```json\n" + JSON.stringify(validJson) + "\n```";
    const { receipt } = parseReceiptLlmOutput(input);
    expect(receipt.merchantName).toBe("Starbucks");
    expect(receipt.status).not.toBe("parse_error");
  });

  it("normalizes dollar-sign amounts", () => {
    const json = { ...validJson, line_items: [{ name: "Item", amount: "$12.99", category: "item" }], total: "$12.99" };
    const { receipt } = parseReceiptLlmOutput(JSON.stringify(json));
    expect(receipt.lineItems[0].amount).toBe(12.99);
    expect(receipt.total).toBe(12.99);
  });

  it("normalizes European comma-decimal amounts", () => {
    const json = { ...validJson, line_items: [{ name: "Item", amount: "12,99", category: "item" }], total: "12,99" };
    const { receipt } = parseReceiptLlmOutput(JSON.stringify(json));
    expect(receipt.lineItems[0].amount).toBe(12.99);
  });

  it("returns low_confidence with nulls for partial JSON", () => {
    const partial = { merchant_name: "Starbucks" };
    const { receipt } = parseReceiptLlmOutput(JSON.stringify(partial));
    expect(receipt.merchantName).toBe("Starbucks");
    expect(receipt.date).toBeNull();
    expect(receipt.lineItems).toEqual([]);
    expect(receipt.status).toBe("low_confidence");
  });

  it("returns parse_error without throwing on completely invalid text", () => {
    const { receipt } = parseReceiptLlmOutput("I'm sorry, I cannot read this image.");
    expect(receipt.status).toBe("parse_error");
    expect(receipt.rawLlmOutput).toContain("I'm sorry");
    expect(receipt.lineItems).toEqual([]);
  });

  it("accepts receipts where line items sum differs from total (mismatch is frontend-only)", () => {
    const json = {
      ...validJson,
      line_items: [{ name: "Item", amount: 24.47, category: "item" }],
      total: 24.99,
    };
    const { receipt } = parseReceiptLlmOutput(JSON.stringify(json));
    expect(receipt.total).toBe(24.99);
    expect(receipt.lineItems[0].amount).toBe(24.47);
    expect(receipt.status).not.toBe("parse_error");
  });

  it("extracts JSON that has prose before it", () => {
    const input = "Here is the extracted data:\n" + JSON.stringify(validJson);
    const { receipt } = parseReceiptLlmOutput(input);
    expect(receipt.merchantName).toBe("Starbucks");
  });

  it("normalizes human-readable dates to YYYY-MM-DD", () => {
    const json = { ...validJson, date: "January 5, 2024" };
    const { receipt } = parseReceiptLlmOutput(JSON.stringify(json));
    expect(receipt.date).toBe("2024-01-05");
  });
});
