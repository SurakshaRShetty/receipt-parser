import Database from "better-sqlite3";
import { config } from "./config";
import type { Receipt } from "@receipt-parser/shared";

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(config.dbPath);
    db.pragma("journal_mode = WAL");
    migrate(db);
  }
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS receipts (
      id              TEXT PRIMARY KEY,
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL,
      image_path      TEXT NOT NULL,
      merchant_name   TEXT,
      date            TEXT,
      total           REAL,
      confidence_json TEXT NOT NULL,
      line_items_json TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'ok',
      raw_llm_output  TEXT
    );
  `);
}

export function insertReceipt(receipt: Receipt): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO receipts (id, created_at, updated_at, image_path, merchant_name, date, total, confidence_json, line_items_json, status, raw_llm_output)
    VALUES (@id, @createdAt, @updatedAt, @imagePath, @merchantName, @date, @total, @confidenceJson, @lineItemsJson, @status, @rawLlmOutput)
  `).run({
    id: receipt.id,
    createdAt: receipt.createdAt,
    updatedAt: receipt.updatedAt,
    imagePath: receipt.imagePath,
    merchantName: receipt.merchantName,
    date: receipt.date,
    total: receipt.total,
    confidenceJson: JSON.stringify(receipt.confidence),
    lineItemsJson: JSON.stringify(receipt.lineItems),
    status: receipt.status,
    rawLlmOutput: receipt.rawLlmOutput,
  });
}

export function updateReceipt(id: string, patch: Partial<Receipt>): Receipt | null {
  const existing = getReceiptById(id);
  if (!existing) return null;

  const updated: Receipt = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  getDb().prepare(`
    UPDATE receipts SET
      updated_at = @updatedAt,
      merchant_name = @merchantName,
      date = @date,
      total = @total,
      line_items_json = @lineItemsJson
    WHERE id = @id
  `).run({
    id: updated.id,
    updatedAt: updated.updatedAt,
    merchantName: updated.merchantName,
    date: updated.date,
    total: updated.total,
    lineItemsJson: JSON.stringify(updated.lineItems),
  });

  return updated;
}

export function getReceiptById(id: string): Receipt | null {
  const row = getDb().prepare("SELECT * FROM receipts WHERE id = ?").get(id) as DbRow | undefined;
  return row ? rowToReceipt(row) : null;
}

export function listReceipts(): Receipt[] {
  const rows = getDb().prepare("SELECT * FROM receipts ORDER BY created_at DESC").all() as DbRow[];
  return rows.map(rowToReceipt);
}

interface DbRow {
  id: string;
  created_at: string;
  updated_at: string;
  image_path: string;
  merchant_name: string | null;
  date: string | null;
  total: number | null;
  confidence_json: string;
  line_items_json: string;
  status: string;
  raw_llm_output: string | null;
}

function rowToReceipt(row: DbRow): Receipt {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    imagePath: row.image_path,
    merchantName: row.merchant_name,
    date: row.date,
    total: row.total,
    confidence: JSON.parse(row.confidence_json),
    lineItems: JSON.parse(row.line_items_json),
    status: row.status as Receipt["status"],
    rawLlmOutput: row.raw_llm_output,
  };
}
