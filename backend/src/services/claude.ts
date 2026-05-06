import Groq from "groq-sdk";
import fs from "fs";
import path from "path";
import { config } from "../config";

const client = new Groq({ apiKey: config.groqApiKey });

const RECEIPT_PROMPT = `You are a receipt data extraction system. Extract all fields from the receipt image and return ONLY valid JSON — no markdown fences, no explanation, no prose before or after.

Return this exact structure:
{
  "merchant_name": string or null,
  "date": "YYYY-MM-DD" or null,
  "line_items": [
    {
      "name": string,
      "amount": number or null,
      "category": "item" | "subtotal" | "tax" | "tip" | "discount" | "fee" | "total"
    }
  ],
  "total": number or null,
  "confidence": {
    "merchant_name": "high" | "medium" | "low",
    "date": "high" | "medium" | "low",
    "total": "high" | "medium" | "low",
    "line_items": "high" | "medium" | "low"
  }
}

Category rules — apply these strictly:
- "item": an actual product or service purchased (e.g. "Coffee", "Shirt", "Delivery charge")
- "subtotal": any intermediate computed row that is NOT a purchased product — includes rows named "Subtotal", "Net Amount", "Taxable Amount", "Taxable Value", "Assessable Value", "Amount before tax", or any row whose value equals the sum of items above it
- "tax": GST, CGST, SGST, IGST, VAT, service tax, or any government-levied charge shown as a percentage
- "discount": any row that reduces the price — coupons, offers, loyalty points, negative amounts
- "tip": gratuity or tip
- "fee": delivery fee, packaging fee, convenience fee, platform fee
- "total": the single final grand total line only

Other rules:
- amounts must be plain numbers (4.99 not "$4.99"); negative amounts for discounts are fine (-35)
- date must be YYYY-MM-DD; use null if not clearly visible
- confidence reflects image legibility and extraction certainty
- set the top-level "total" field to the same value as the "total" category line item
- do not infer or guess any field; use null when uncertain`;

export async function parseReceiptImage(imagePath: string): Promise<string> {
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString("base64");

  const response = await client.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          {
            type: "text",
            text: RECEIPT_PROMPT,
          },
        ],
      },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}
