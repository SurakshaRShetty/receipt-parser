import express from "express";
import { getReceiptById, listReceipts, updateReceipt } from "../db";
import type { ReceiptPatch } from "@receipt-parser/shared";

const router = express.Router();

router.get("/", (_req, res) => {
  res.json(listReceipts());
});

router.get("/:id", (req, res) => {
  const receipt = getReceiptById(req.params.id);
  if (!receipt) return res.status(404).json({ error: "Receipt not found" });
  res.json(receipt);
});

router.patch("/:id", (req, res) => {
  const patch = req.body as ReceiptPatch;
  const updated = updateReceipt(req.params.id, patch);
  if (!updated) return res.status(404).json({ error: "Receipt not found" });
  res.json(updated);
});

export default router;
