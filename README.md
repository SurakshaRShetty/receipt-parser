# Receipt Parser

## Setup

```bash
cp .env.example .env
# Add your GROQ_API_KEY to .env (free at console.groq.com → API Keys)

npm install
npm run dev
```

Open http://localhost:5173

**Required env var:** `GROQ_API_KEY` — free account at [console.groq.com](https://console.groq.com), then create an API key.  
Optional: `PORT` (default 3001), `UPLOADS_DIR` (default `./uploads`), `DB_PATH` (default `./receipts.db`).

---

## 1. What did you build?

A local web app that accepts a receipt photo (JPEG, PNG, WebP), sends it to Groq's Llama 4 Scout vision model, and returns structured data — merchant, date, line items with categories, and total. The result view lets the user correct any field inline; changes are auto-saved with an 800 ms debounce. Low-confidence fields are highlighted on load and the badge clears once the user edits that field. The last viewed receipt is persisted in localStorage and restored on page reload. Receipts persist in SQLite. The project is a TypeScript monorepo: a shared types package (`@receipt-parser/shared`), an Express backend, and a React + Vite frontend.

---

## 2. Biggest tradeoffs

**Everything is a line item, including taxes and tips.** The alternative — only storing purchased items — seems cleaner until you try to display a meaningful subtotal. Taxes, discounts, and subtotals are real lines on the receipt; dropping them means the data no longer matches what the user sees in the image. The `category` field (`item | tax | tip | discount | subtotal | fee | total`) discriminates them without losing them. The UI sums only `item`-category rows as "Items subtotal" and shows the grand total separately — this avoids double-counting intermediate rows like "Taxable Amount" that some receipts include.

**Two-stage parse recovery instead of retrying on failure.** On malformed LLM output I strip markdown fences, extract the first `{...}` block, then Zod-parse with `.default()` on every field. This handles the majority of real-world formatting quirks without a second API call. `parse_error` status is only set when `JSON.parse` itself fails — and even then a partial receipt is returned so the user can fill in manually rather than facing a blank screen. The cost: a retry would occasionally produce better output. The benefit: lower latency and no wasted API quota on flaky responses.

**SQLite blobs for line items, not a normalized table.** Line items are stored as a JSON column because the receipt is always read and written as a unit — there is no query that needs to join on individual items. A normalized schema would add complexity with no query benefit.

---

## 3. Where I used an LLM

- **Claude Code** — used throughout for scaffolding, component structure, and iterating on the parser pipeline. I directed every architectural decision and reviewed every file.
- **Groq / Llama 4 Scout** (in the product itself) — the vision parsing step. I wrote the prompt, the category classification rules, and the Zod schema that validates and normalizes the output.
- I wrote the core logic myself: the two-stage parse recovery pipeline, the Zod defaults strategy, the auto-save + optimistic rollback design, and the confidence-flag UX.

---

## 4. What I'd do with another week

1. **Receipt history sidebar** — the API already exposes `GET /api/receipts`; surfacing it in the UI with thumbnails would make the app useful for reviewing past receipts, not just the most recent one.
2. **Export to CSV/JSON** — trivial to add to the backend, high user value for anyone processing receipts in bulk.
3. **Retry with a stricter prompt on `parse_error`** — currently the raw LLM text is surfaced to the user; a second call asking the model to re-structure its own output would recover most cases automatically.
4. **Delete receipt** — noted in the pushback below.
5. **Switch to a paid vision model** — Llama 4 Scout is free and capable, but a model with stronger OCR on low-quality or handwritten receipts (e.g. GPT-4o or Claude claude-sonnet-4-6) would reduce the number of fields the user has to correct.

---

## 5. One thing I'd push back on

"Saved receipts persist somewhere" implies persistence is a checkbox feature. It isn't — it's a data lifecycle question. Right now receipts accumulate in SQLite indefinitely with no way to delete or archive them. A user who uploads a dozen test receipts while getting started has no way to clean up. A delete action is not an "another week" item; it's part of the minimum useful product and I'd push to scope it in before calling v1 done.

---

## Running tests

```bash
npm test
```

Eight unit tests covering the parser pipeline — no API key required.
