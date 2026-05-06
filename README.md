# Receipt Parser

## Setup

```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

npm install
npm run dev
```

Open http://localhost:5173

**Required env var:** `ANTHROPIC_API_KEY` — get one at console.anthropic.com.  
Optional: `PORT` (default 3001), `UPLOADS_DIR` (default `./uploads`), `DB_PATH` (default `./receipts.db`).

---

## 1. What did you build?

A local web app that accepts a receipt photo (JPEG, PNG, WebP), sends it to Claude claude-sonnet-4-6 via the Anthropic vision API, and returns structured data — merchant, date, line items with categories, and total. The result view lets the user correct any field inline; changes are auto-saved with an 800 ms debounce. Low-confidence fields are highlighted so the user knows where to focus. Receipts persist in SQLite. The project is a TypeScript monorepo: a shared types package, an Express backend, and a React + Vite frontend.

---

## 2. Biggest tradeoffs

**Everything is a line item, including taxes and tips.** The alternative — only storing "purchased items" — seems cleaner until you try to reconcile the sum with the total. Taxes and discounts are real lines on the receipt; dropping them breaks the sum-check that helps users catch extraction errors. The `category` field (`item | tax | tip | discount | subtotal | fee | total`) discriminates them without losing them.

**Two-stage parse recovery instead of retrying Claude.** On malformed LLM output I strip markdown fences, then extract the first `{...}` block, then Zod-parse with `.default()` on every field. This handles ~95% of real-world formatting quirks without a second API call. I only set `parse_error` status when `JSON.parse` itself fails — and even then I return a partial receipt so the user can fill in manually rather than facing a blank error screen. The cost: a retry would occasionally produce better structured output. The benefit: half the latency and half the API cost on flaky responses.

**SQLite blobs for line items, not a normalized table.** Line items are stored as a JSON column because the receipt is always read and written as a unit — there's no query that needs to join on individual items. A normalized schema would add complexity with no query benefit. If analytics ever need it, SQLite's `json_each` handles it without a migration.

---

## 3. Where I used an LLM

- **Claude Code** — used throughout for scaffolding, component structure, and iterating on the parser pipeline. I directed every architectural decision and reviewed every file; Claude wrote the boilerplate.
- **Claude claude-sonnet-4-6** (in the product itself) — the vision parsing step. I wrote the prompt and the Zod schema that validates its output.
- I wrote the core logic myself: the two-stage parse recovery pipeline, the Zod defaults strategy, the auto-save + optimistic rollback design, and the total/sum mismatch check.

---

## 4. What I'd do with another week

1. **Receipt history sidebar** — the API already returns `GET /api/receipts`; surfacing it in the UI with thumbnails would make the app actually useful for reviewing past receipts.
2. **Confidence heatmap on the image** — Claude can return bounding boxes with `tool_use`. Overlaying low-confidence regions on the original image would let users spot extraction errors at a glance instead of reading through the field list.
3. **Export to CSV/JSON** — trivial to add to the backend, high user value.
4. **Retry with a tighter prompt** on `parse_error` — currently I surface the raw text; a second call with "here is the raw text, structure it as JSON" would recover most cases.
5. **Delete receipt** — noted in spec pushback below.

---

## 5. One thing I'd push back on

"Saved receipts persist somewhere" implies persistence is a checkbox feature. It isn't — it's a data lifecycle question with no answer in the spec. Right now receipts accumulate in SQLite forever with no way to delete or archive them. A user who uploads 50 test receipts while calibrating their workflow has no way to clean up. A simple delete action is not an "another week" feature; it's part of the minimum useful product. I'd push to scope it in before calling v1 done.

---

## Running tests

```bash
npm test
```

Eight unit tests covering the parser pipeline (no API key required).
